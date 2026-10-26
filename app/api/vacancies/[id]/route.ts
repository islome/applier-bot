import { NextResponse } from "next/server";
import { z } from "zod";
import { authFromRequest } from "@/lib/telegram-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const COLUMNS =
  "id, title, company, city, major, employment_type, salary_min, salary_max, salary_currency, description, requirements, created_at";

/**
 * GET /api/vacancies/:id -> one active vacancy (Telegram users only), plus:
 *   hasProfile:  true / false, or null if we could not tell (the client then lets them try)
 *   application: this user's application for this vacancy, or null
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  if (!z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Vacancy not found" }, { status: 404 });
  }

  let db;
  try {
    db = getSupabaseAdmin();
  } catch (e) {
    console.error("supabase client failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Server is not configured" }, { status: 500 });
  }

  const { data, error } = await db
    .from("vacancies")
    .select(COLUMNS)
    .eq("id", id)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error("vacancy GET failed:", error.message, error.code);
    return NextResponse.json(
      { error: `Database error (${error.code ?? "unknown"})` },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Vacancy not found" }, { status: 404 });
  }

  // The user's own state. Not critical: if these lookups fail (for example the
  // applications table is not created yet) the vacancy page still opens.
  let hasProfile: boolean | null = null;
  let application: { id: string; status: string; created_at: string } | null = null;

  const { data: candidate, error: candidateError } = await db
    .from("candidates")
    .select("id")
    .eq("telegram_id", auth.user.id)
    .maybeSingle();

  if (candidateError) {
    console.error("candidate lookup failed:", candidateError.message, candidateError.code);
  } else if (!candidate) {
    hasProfile = false;
  } else {
    hasProfile = true;
    const { data: app, error: appError } = await db
      .from("applications")
      .select("id, status, created_at")
      .eq("candidate_id", candidate.id)
      .eq("vacancy_id", id)
      .maybeSingle();
    if (appError) {
      console.error("application lookup failed:", appError.message, appError.code);
    } else {
      application = app;
    }
  }

  return NextResponse.json({ vacancy: data, hasProfile, application });
}
