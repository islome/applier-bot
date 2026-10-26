import { NextResponse } from "next/server";
import { z } from "zod";
import { authFromRequest } from "@/lib/telegram-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { ApplicationRow, ApplicationStatus } from "@/lib/application-types";

type Db = ReturnType<typeof getSupabaseAdmin>;

const bodySchema = z.object({ vacancy_id: z.uuid() });

function dbError(label: string, error: { message: string; code?: string }) {
  console.error(`${label}:`, error.message, error.code);
  // Only the Postgres code goes to the client (e.g. 42P01 = table missing), never the message
  return NextResponse.json(
    { error: `Database error (${error.code ?? "unknown"})` },
    { status: 500 },
  );
}

function getDb(): Db | null {
  try {
    return getSupabaseAdmin();
  } catch (e) {
    console.error("supabase client failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** GET /api/applications -> the logged-in candidate's applications, newest first */
export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  if (!db) return NextResponse.json({ error: "Server is not configured" }, { status: 500 });

  const { data: candidate, error: candidateError } = await db
    .from("candidates")
    .select("id")
    .eq("telegram_id", auth.user.id)
    .maybeSingle();
  if (candidateError) return dbError("candidate lookup failed", candidateError);

  // No profile yet means no applications yet
  if (!candidate) return NextResponse.json({ applications: [] });

  const { data, error } = await db
    .from("applications")
    .select("id, status, created_at, vacancies(id, title, company, city)")
    .eq("candidate_id", candidate.id)
    .order("created_at", { ascending: false });
  if (error) return dbError("applications GET failed", error);

  type Vacancy = ApplicationRow["vacancy"];
  type Raw = {
    id: string;
    status: ApplicationStatus;
    created_at: string;
    vacancies: Vacancy | Vacancy[] | null;
  };

  const applications: ApplicationRow[] = [];
  for (const row of (data ?? []) as unknown as Raw[]) {
    const vacancy = Array.isArray(row.vacancies) ? row.vacancies[0] : row.vacancies;
    if (!vacancy) continue;
    applications.push({ id: row.id, status: row.status, created_at: row.created_at, vacancy });
  }

  return NextResponse.json({ applications });
}

/** POST /api/applications { vacancy_id } -> apply to a vacancy (idempotent) */
export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid vacancy" }, { status: 400 });
  }
  const { vacancy_id } = parsed.data;

  const db = getDb();
  if (!db) return NextResponse.json({ error: "Server is not configured" }, { status: 500 });

  // 1. The candidate must have a profile (that is what HR receives)
  const { data: candidate, error: candidateError } = await db
    .from("candidates")
    .select("id")
    .eq("telegram_id", auth.user.id)
    .maybeSingle();
  if (candidateError) return dbError("candidate lookup failed", candidateError);
  if (!candidate) {
    return NextResponse.json(
      { error: "Complete your profile first", code: "NO_PROFILE" },
      { status: 409 },
    );
  }

  // 2. The vacancy must exist and still be open
  const { data: vacancy, error: vacancyError } = await db
    .from("vacancies")
    .select("id")
    .eq("id", vacancy_id)
    .eq("is_active", true)
    .maybeSingle();
  if (vacancyError) return dbError("vacancy lookup failed", vacancyError);
  if (!vacancy) {
    return NextResponse.json({ error: "Vacancy not found" }, { status: 404 });
  }

  // 3. Create the application. A double tap hits the unique constraint (23505):
  //    that is fine, we just return the existing one.
  const COLUMNS = "id, status, created_at";
  const { data: created, error: insertError } = await db
    .from("applications")
    .insert({ candidate_id: candidate.id, vacancy_id })
    .select(COLUMNS)
    .single();

  if (!insertError) {
    return NextResponse.json({ application: created }, { status: 201 });
  }

  if (insertError.code === "23505") {
    const { data: existing, error: existingError } = await db
      .from("applications")
      .select(COLUMNS)
      .eq("candidate_id", candidate.id)
      .eq("vacancy_id", vacancy_id)
      .single();
    if (existingError) return dbError("existing application lookup failed", existingError);
    return NextResponse.json({ application: existing });
  }

  return dbError("applications POST failed", insertError);
}
