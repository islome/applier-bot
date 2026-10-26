"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { MAJORS } from "@/lib/constants";
import {
  candidateInputSchema,
  isAllowedResumeFile,
  RESUME_ALLOWED_EXTENSIONS,
  RESUME_MAX_SIZE_BYTES,
  type CandidateRow,
} from "@/lib/candidate-schema";
import { IconUpload } from "@/components/icons";

type Props = {
  initData: string;
  defaultName: string;
  onSaved?: () => void;
};

type FormState = {
  full_name: string;
  phone: string;
  age: string;
  major: string;
  experience_years: string;
  experience_text: string;
};

type Status = "loading" | "idle" | "saving" | "saved" | "error";

const inputClass =
  "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-zinc-800";

export function CandidateForm({ initData, defaultName, onSaved }: Props) {
  const [form, setForm] = useState<FormState>({
    full_name: defaultName,
    phone: "+998",
    age: "",
    major: "",
    experience_years: "0",
    experience_text: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("loading");
  const [isExisting, setIsExisting] = useState(false);
  const [message, setMessage] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [hasSavedResume, setHasSavedResume] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  const authHeaders = { Authorization: `tma ${initData}` };
  const resumeAccept = RESUME_ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(",");

  // Load the saved profile (if any) so re-opening the app edits instead of starting over
  useEffect(() => {
    let cancelled = false;

    fetch("/api/candidate", { headers: { Authorization: `tma ${initData}` } })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as { candidate: CandidateRow | null };
      })
      .then(({ candidate }) => {
        if (cancelled) return;
        if (candidate) {
          setIsExisting(true);
          setHasSavedResume(Boolean(candidate.resume_path));
          setForm({
            full_name: candidate.full_name,
            phone: candidate.phone,
            age: String(candidate.age ?? ""),
            major: candidate.major,
            experience_years: String(candidate.experience_years),
            experience_text: candidate.experience_text ?? "",
          });
        }
        setStatus("idle");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
        setMessage("Could not load your profile. Check your connection.");
      });

    return () => {
      cancelled = true;
    };
  }, [initData]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    if (status === "saved") setStatus("idle");
  }

  function handleResumeChange(file: File | undefined) {
    if (!file) return;

    if (!isAllowedResumeFile(file)) {
      setResumeFile(null);
      if (resumeInputRef.current) resumeInputRef.current.value = "";
      setErrors((prev) => ({
        ...prev,
        resume:
          file.size > RESUME_MAX_SIZE_BYTES
            ? "Resume must be 2 MB or smaller"
            : file.size === 0
              ? "Resume file cannot be empty"
            : "Choose a PDF, DOC, DOCX, ZIP, RTF, TXT, or ODT file",
      }));
      return;
    }

    setResumeFile(file);
    setErrors((prev) => ({ ...prev, resume: "" }));
    if (status === "saved") setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (errors.resume) return;

    // Client-side validation with the SAME schema the server uses
    const parsed = candidateInputSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors = z.flattenError(parsed.error).fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""]),
        ),
      );
      return;
    }

    setStatus("saving");
    setMessage("");

    try {
      const body = new FormData();
      body.set("candidate", JSON.stringify(parsed.data));
      if (resumeFile) body.set("resume", resumeFile);

      const res = await fetch("/api/candidate", {
        method: "POST",
        headers: authHeaders,
        body,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      setIsExisting(true);
      if (resumeFile) {
        setHasSavedResume(true);
        setResumeFile(null);
        if (resumeInputRef.current) resumeInputRef.current.value = "";
      }
      setStatus("saved");
      setMessage("Saved! HR will review your profile.");
      onSaved?.();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "loading") {
    return (
      <div className="flex justify-center py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" />
      </div>
    );
  }

  const busy = status === "saving";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field label="Full name" error={errors.full_name}>
        <input
          className={inputClass}
          value={form.full_name}
          onChange={(e) => update("full_name", e.target.value)}
          autoComplete="name"
          placeholder="Aziz Karimov"
        />
      </Field>

      <Field label="Phone" error={errors.phone}>
        <input
          className={inputClass}
          value={form.phone}
          onChange={(e) => update("phone", e.target.value.replace(/[^\d+]/g, ""))}
          inputMode="tel"
          autoComplete="tel"
          placeholder="+998901234567"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Age" error={errors.age}>
          <input
            className={inputClass}
            value={form.age}
            onChange={(e) => update("age", e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="22"
          />
        </Field>

        <Field label="Experience (years)" error={errors.experience_years}>
          <input
            className={inputClass}
            value={form.experience_years}
            onChange={(e) =>
              update("experience_years", e.target.value.replace(/\D/g, ""))
            }
            inputMode="numeric"
            placeholder="0"
          />
        </Field>
      </div>

      <Field label="Major / field" error={errors.major}>
        <select
          className={inputClass}
          value={form.major}
          onChange={(e) => update("major", e.target.value)}
        >
          <option value="" disabled>
            Choose...
          </option>
          {MAJORS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>

      <Field label="About your experience (optional)" error={errors.experience_text}>
        <textarea
          className={`${inputClass} min-h-28 resize-none`}
          value={form.experience_text}
          onChange={(e) => update("experience_text", e.target.value)}
          maxLength={1000}
          placeholder="Where you worked, what you did, key skills..."
        />
      </Field>

      <div>
        <span className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Resume (optional)
        </span>
        <input
          ref={resumeInputRef}
          type="file"
          accept={resumeAccept}
          className="sr-only"
          onChange={(e) => handleResumeChange(e.target.files?.[0])}
          tabIndex={-1}
          aria-hidden="true"
        />
        <button
          type="button"
          onClick={() => resumeInputRef.current?.click()}
          disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-black/20 bg-white px-4 py-3 text-sm font-semibold text-zinc-700 transition hover:border-blue-500 hover:text-blue-600 disabled:opacity-60 dark:border-white/20 dark:bg-zinc-800 dark:text-zinc-200"
        >
          <IconUpload className="h-5 w-5" />
          {resumeFile ? "Change resume" : hasSavedResume ? "Replace resume" : "Upload resume"}
        </button>
        <span className="mt-1.5 block break-all text-xs text-zinc-500 dark:text-zinc-400">
          {resumeFile?.name ?? (hasSavedResume ? "A resume is saved to your profile" : "PDF, DOC, DOCX, ZIP, RTF, TXT, or ODT · max 2 MB")}
        </span>
        {errors.resume && (
          <span className="mt-1 block text-xs text-red-500">{errors.resume}</span>
        )}
      </div>

      {message && (
        <p
          className={`text-sm ${
            status === "error" ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? "Saving..." : isExisting ? "Update profile" : "Submit profile"}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-300">
        {label}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  );
}
