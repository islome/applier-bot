
import { NextResponse } from "next/server";
import { z } from "zod";
import { authFromRequest } from "@/lib/telegram-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { AVATAR_BUCKET } from "@/lib/candidate-photo";
import { normalizeStatus } from "@/lib/application-types";
import {
  candidateInputSchema,
  getResumeContentType,
  RESUME_MAX_SIZE_BYTES,
} from "@/lib/candidate-schema";

const COLUMNS =
  "id, telegram_id, photo_url, resume_path, full_name, phone, age, major, experience_years, experience_text, desired_salary, work_type, notify_status, job_alerts, status, created_at, updated_at";
const RESUME_BUCKET = "candidate-resumes";

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

  // Small summary for the profile screen (candidate-cancelled applications are hidden, like in the list)
  const stats = { total: 0, active: 0, interview: 0, hired: 0 };
  if (data) {
    const { data: apps } = await getSupabaseAdmin()
      .from("applications")
      .select("status, cancelled_by")
      .eq("candidate_id", data.id);
    for (const a of apps ?? []) {
      if (a.status === "cancel" && a.cancelled_by === "candidate") continue;
      const status = normalizeStatus(a.status);
      stats.total += 1;
      if (status === "new" || status === "confirmed") stats.active += 1;
      if (status === "interview") stats.interview += 1;
      if (status === "hired") stats.hired += 1;
    }
  }

  return NextResponse.json({ candidate: data, stats });
}

/** POST /api/candidate -> create or update the logged-in candidate */
export async function POST(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  let resumeFile: File | null = null;
  try {
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const formData = await req.formData();
      const candidate = formData.get("candidate");
      body = typeof candidate === "string" ? JSON.parse(candidate) : null;
      const resume = formData.get("resume");
      if (resume !== null) {
        if (!(resume instanceof File)) {
          return NextResponse.json({ error: "Invalid resume file" }, { status: 400 });
        }
        resumeFile = resume;
      }
    } else {
      body = await req.json();
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = candidateInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  const resumeContentType = resumeFile ? getResumeContentType(resumeFile.name) : null;
  if (resumeFile && !resumeContentType) {
    return NextResponse.json(
      { error: "Choose a PDF, DOC, DOCX, ZIP, RTF, TXT, or ODT file" },
      { status: 400 },
    );
  }
  if (resumeFile?.size === 0) {
    return NextResponse.json(
      { error: "Resume file cannot be empty" },
      { status: 400 },
    );
  }
  if (resumeFile && resumeFile.size > RESUME_MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "Resume must be 2 MB or smaller" },
      { status: 413 },
    );
  }

  const { user } = auth;

  let db;
  try {
    db = getSupabaseAdmin();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "config error";
    console.error("supabase client failed:", msg);
    return NextResponse.json({ error: "Storage is not configured" }, { status: 500 });
  }

  const { data: existing, error: existingError } = await db
    .from("candidates")
    .select("resume_path, avatar_path, photo_url")
    .eq("telegram_id", user.id)
    .maybeSingle();

  if (existingError) {
    console.error("candidate resume lookup failed:", existingError.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  let uploadedResumePath: string | null = null;
  if (resumeFile && resumeContentType) {
    const extension = resumeFile.name.split(".").pop()?.toLowerCase();
    uploadedResumePath = `${user.id}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await db.storage
      .from(RESUME_BUCKET)
      .upload(uploadedResumePath, resumeFile, {
        contentType: resumeContentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("candidate resume upload failed:", uploadError.message);
      return NextResponse.json({ error: "Could not upload resume" }, { status: 500 });
    }
  }

  const { data, error } = await db
    .from("candidates")
    .upsert(
      {
        telegram_id: user.id,
        username: user.username ?? null,
        language_code: user.language_code ?? null,
        // Nomzod o'zi rasm yuklagan bo'lsa, Telegram rasmi uni almashtirmaydi
        photo_url: existing?.avatar_path ? existing.photo_url : (user.photo_url ?? null),
        resume_path: uploadedResumePath ?? existing?.resume_path ?? null,
        ...parsed.data,
      },
      { onConflict: "telegram_id" },
    )
    .select(COLUMNS)
    .single();

  if (error) {
    console.error("candidate POST failed:", error.message, error.code);
    if (uploadedResumePath) {
      const { error: cleanupError } = await db.storage
        .from(RESUME_BUCKET)
        .remove([uploadedResumePath]);
      if (cleanupError) {
        console.error("candidate resume cleanup failed:", cleanupError.message);
      }
    }
    return NextResponse.json({ error: "Could not save candidate profile" }, { status: 500 });
  }

  if (uploadedResumePath && existing?.resume_path) {
    const { error: cleanupError } = await db.storage
      .from(RESUME_BUCKET)
      .remove([existing.resume_path]);
    if (cleanupError) {
      console.error("previous candidate resume cleanup failed:", cleanupError.message);
    }
  }

  return NextResponse.json({ candidate: data });
}
const OPEN_STATUSES = ["new", "confirmed", "interview", "reviewed", "shortlisted"];

/**
 * DELETE /api/candidate -> the candidate removes their own profile.
 * Open applications are cancelled, files are removed. If HR history still points at the
 * row (foreign key), the row is anonymised instead of deleted, so HR records stay consistent.
 */
export async function DELETE(req: Request) {
  const auth = authFromRequest(req);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let db;
  try {
    db = getSupabaseAdmin();
  } catch (e) {
    console.error("supabase client failed:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Storage is not configured" }, { status: 500 });
  }

  const { data: existing, error: lookupError } = await db
    .from("candidates")
    .select("id, resume_path, avatar_path")
    .eq("telegram_id", auth.user.id)
    .maybeSingle();
  if (lookupError) {
    console.error("candidate lookup failed:", lookupError.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
  if (!existing) return NextResponse.json({ ok: true });

  // Cancel what is still open (as the candidate's own cancellation)
  const { error: cancelError } = await db
    .from("applications")
    .update({ status: "cancel", cancelled_by: "candidate" })
    .eq("candidate_id", existing.id)
    .in("status", OPEN_STATUSES);
  if (cancelError) {
    console.error("candidate delete: cancel applications failed:", cancelError.message);
    return NextResponse.json({ error: "Could not delete profile" }, { status: 500 });
  }

  const { error: deleteError } = await db.from("candidates").delete().eq("id", existing.id);
  if (deleteError) {
    if (deleteError.code !== "23503") {
      console.error("candidate delete failed:", deleteError.message, deleteError.code);
      return NextResponse.json({ error: "Could not delete profile" }, { status: 500 });
    }
    // Still referenced: wipe the personal data but keep the row
    const { error: anonError } = await db
      .from("candidates")
      .update({
        telegram_id: -Math.abs(auth.user.id),
        username: null,
        language_code: null,
        photo_url: null,
        avatar_path: null,
        resume_path: null,
        full_name: "Deleted user",
        phone: "+998000000000",
        age: null,
        experience_text: null,
        desired_salary: null,
        work_type: null,
        notify_status: false,
        job_alerts: false,
      })
      .eq("id", existing.id);
    if (anonError) {
      console.error("candidate anonymise failed:", anonError.message, anonError.code);
      return NextResponse.json({ error: "Could not delete profile" }, { status: 500 });
    }
  }

  if (existing.resume_path) {
    const { error } = await db.storage.from(RESUME_BUCKET).remove([existing.resume_path]);
    if (error) console.error("candidate delete: resume cleanup failed:", error.message);
  }
  if (existing.avatar_path) {
    const { error } = await db.storage.from(AVATAR_BUCKET).remove([existing.avatar_path]);
    if (error) console.error("candidate delete: avatar cleanup failed:", error.message);
  }

  return NextResponse.json({ ok: true });
}
