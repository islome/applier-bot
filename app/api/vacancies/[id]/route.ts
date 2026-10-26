import { NextResponse } from "next/server";
import { z } from "zod";
import { authFromRequest } from "@/lib/telegram-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const COLUMNS =
  "id, title, company, city, major, employment_type, salary_min, salary_max, salary_currency, description, requirements, created_at";

/** GET /api/vacancies/:id -> one active vacancy (Telegram users only) */
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

  return NextResponse.json({ vacancy: data });
}
