import { NextResponse } from "next/server";
import { authFromRequest } from "@/lib/telegram-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/** GET /api/candidate/resume -> short-lived signed link to the candidate's own resume */
export async function GET(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("candidates")
    .select("resume_path")
    .eq("telegram_id", auth.user.id)
    .maybeSingle();
  if (error) {
    console.error("resume lookup failed:", error.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!data?.resume_path) return NextResponse.json({ error: "No resume" }, { status: 404 });

  const { data: signed, error: signError } = await db.storage
    .from("candidate-resumes")
    .createSignedUrl(data.resume_path, 120);
  if (signError || !signed) {
    console.error("resume sign failed:", signError?.message);
    return NextResponse.json({ error: "Could not open resume" }, { status: 500 });
  }
  return NextResponse.json({ url: signed.signedUrl });
}
