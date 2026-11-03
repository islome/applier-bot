import { NextResponse } from "next/server";
import { authFromRequest } from "@/lib/telegram-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { AVATAR_BUCKET, AVATAR_MAX_SIZE_BYTES, sniffAvatarType } from "@/lib/candidate-photo";

/** POST /api/candidate/photo (multipart, field "photo") -> yangi profil rasmi, max 2 MB */
export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Katta body'ni o'qimasdan rad etish (taxminiy: multipart sarlavhasi uchun zaxira)
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > AVATAR_MAX_SIZE_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "Photo must be 2 MB or smaller" }, { status: 413 });
  }

  let file: File | null = null;
  try {
    const photo = (await req.formData()).get("photo");
    if (photo instanceof File) file = photo;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "Choose a photo" }, { status: 400 });
  }
  if (file.size > AVATAR_MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "Photo must be 2 MB or smaller" }, { status: 413 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffAvatarType(bytes);
  if (!type) {
    return NextResponse.json({ error: "Choose a JPG, PNG, or WebP image" }, { status: 400 });
  }

  let db;
  try {
    db = getSupabaseAdmin();
  } catch (e) {
    console.error("supabase client failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Storage is not configured" }, { status: 500 });
  }

  const { data: existing, error: lookupError } = await db
    .from("candidates")
    .select("id, avatar_path")
    .eq("telegram_id", auth.user.id)
    .maybeSingle();
  if (lookupError) {
    console.error("candidate lookup failed:", lookupError.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Create your profile first" }, { status: 404 });
  }

  const path = `${crypto.randomUUID()}.${type.ext}`;
  const { error: uploadError } = await db.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, { contentType: type.contentType, upsert: false });
  if (uploadError) {
    console.error("photo upload failed:", uploadError.message);
    return NextResponse.json({ error: "Could not upload photo" }, { status: 500 });
  }

  const photoUrl = db.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
  const { error: updateError } = await db
    .from("candidates")
    .update({ photo_url: photoUrl, avatar_path: path })
    .eq("id", existing.id);
  if (updateError) {
    console.error("photo save failed:", updateError.message, updateError.code);
    await db.storage.from(AVATAR_BUCKET).remove([path]);
    return NextResponse.json({ error: "Could not save photo" }, { status: 500 });
  }

  if (existing.avatar_path) {
    const { error: cleanupError } = await db.storage.from(AVATAR_BUCKET).remove([existing.avatar_path]);
    if (cleanupError) console.error("previous photo cleanup failed:", cleanupError.message);
  }

  return NextResponse.json({ photo_url: photoUrl });
}
