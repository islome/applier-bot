import { NextResponse } from "next/server";
import { authFromRequest } from "@/lib/telegram-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const COLUMNS =
  "id, title, company, city, major, employment_type, salary_min, salary_max, salary_currency, description, requirements, created_at";

/** GET /api/vacancies -> all active vacancies, newest first (Telegram users only) */
export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("vacancies GET failed:", error.message, error.code);
    return NextResponse.json(
      { error: `Database error (${error.code ?? "unknown"})` },
      { status: 500 },
    );
  }

  return NextResponse.json({ vacancies: data ?? [] });
}