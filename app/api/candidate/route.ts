
import { NextResponse } from "next/server";
import { z } from "zod";
import { authFromRequest } from "@/lib/telegram-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { candidateInputSchema } from "@/lib/candidate-schema";

const COLUMNS =
  "id, telegram_id, photo_url, full_name, phone, age, major, experience_years, experience_text, status, created_at, updated_at";

/** GET /api/candidate -> the logged-in candidate's profile (or null) */
export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("candidates")
    .select(COLUMNS)
    .eq("telegram_id", auth.user.id)
    .maybeSingle();

  if (error) {
    console.error("candidate GET failed:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ candidate: data });
}

/** POST /api/candidate -> create or update the logged-in candidate */
export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = candidateInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const { user } = auth;

  let db;
    try {
  db = getSupabaseAdmin();
} catch (e) {
  const msg = e instanceof Error ? e.message : "config error";
  console.error("supabase client failed:", msg);
  return NextResponse.json({ error: msg }, { status: 500 });
}

  const { data, error } = await db
    .from("candidates")
    .upsert(
      {
        telegram_id: user.id,
        username: user.username ?? null,
        language_code: user.language_code ?? null,
        photo_url: user.photo_url ?? null,
        ...parsed.data,
      },
      { onConflict: "telegram_id" },
    )
    .select(COLUMNS)
    .single();

  if (error) {
  console.error("candidate POST failed:", error.message, error.code);
  return NextResponse.json(
    { error: `DB: ${error.message} (${error.code ?? "no code"})` },
    { status: 500 },
  );
}

  return NextResponse.json({ candidate: data });
}