import { NextResponse } from "next/server";
import { z } from "zod";
import { authFromRequest } from "@/lib/telegram-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const bodySchema = z.object({ notify_status: z.boolean() });

/** PATCH /api/candidate/settings -> { notify_status } */
export async function PATCH(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  const { data, error } = await getSupabaseAdmin()
    .from("candidates")
    .update({ notify_status: parsed.data.notify_status })
    .eq("telegram_id", auth.user.id)
    .select("notify_status")
    .maybeSingle();
  if (error) {
    console.error("settings PATCH failed:", error.message, error.code);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: "Create your profile first" }, { status: 404 });
  return NextResponse.json({ notify_status: data.notify_status });
}
