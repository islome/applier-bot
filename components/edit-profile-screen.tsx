"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { PushScreen } from "@/components/app-shell";
import { ErrorState } from "@/components/empty-state";
import { IconCheck, IconUpload } from "@/components/icons";
import { IconChevronDown } from "@/components/icons-more";
import {
  candidateInputSchema,
  isAllowedResumeFile,
  RESUME_ALLOWED_EXTENSIONS,
  RESUME_MAX_SIZE_BYTES,
  type CandidateRow,
} from "@/lib/candidate-schema";
import { MAJORS } from "@/lib/constants";
import { haptic } from "@/lib/haptics";
import { translateFormError, useLanguage } from "@/components/language-provider";
import { LoadingAnimation } from "@/components/ui/loading-animation";
import type { TelegramUser } from "@/types/telegram";

type FormState = {
  full_name: string;
  phone: string;
  age: string;
  major: string;
  experience_years: string;
  experience_text: string;
};

const inputClass =
  "h-12 w-full rounded-xl border border-field bg-surface px-3.5 text-base text-ink outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/25";

const RESUME_ACCEPT = RESUME_ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(",");

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function EditProfileScreen({
  user,
  initData,
  welcome,
}: {
  user: TelegramUser;
  initData: string;
  /** First-time onboarding: no back button, continues to /vacancies after saving */
  welcome: boolean;
}) {
  const { t, majorLabel } = useLanguage();
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [form, setForm] = useState<FormState>({
    full_name: [user.first_name, user.last_name].filter(Boolean).join(" "),
    phone: "+998",
    age: "",
    major: "",
    experience_years: "0",
    experience_text: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [hasSavedResume, setHasSavedResume] = useState(false);
  const resumeInputRef = useRef<HTMLInputElement>(null);

  // Load the saved profile (if any) so editing starts from what is already there
  useEffect(() => {
    let cancelled = false;

    fetch("/api/candidate", { headers: { Authorization: `tma ${initData}` } })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        return body as { candidate: CandidateRow | null };
      })
      .then(({ candidate }) => {
        if (cancelled) return;
        if (candidate) {
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
        setLoaded(true);
      })
      .catch((e) => {
        console.error("profile load failed:", e);
        if (!cancelled) setLoadError("load-error");
      });

    return () => {
      cancelled = true;
    };
  }, [initData, reloadKey]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    setSaveError("");
  }

  function clearResumeInput() {
    if (resumeInputRef.current) resumeInputRef.current.value = "";
  }

  function handleResumeChange(file: File | undefined) {
    if (!file) return; // picker cancelled

    setSaveError("");

    if (!isAllowedResumeFile(file)) {
      setResumeFile(null);
      clearResumeInput();
      haptic.error();
      setErrors((prev) => ({
        ...prev,
        resume:
          file.size > RESUME_MAX_SIZE_BYTES
            ? t("profile.resumeTooLarge")
            : file.size === 0
              ? t("profile.resumeEmpty")
              : t("profile.resumeFormat"),
      }));
      return;
    }

    haptic.select();
    setResumeFile(file);
    setErrors((prev) => ({ ...prev, resume: "" }));
  }

  function removeSelectedResume() {
    setResumeFile(null);
    clearResumeInput();
    setErrors((prev) => ({ ...prev, resume: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || errors.resume) return;

    // Same schema the server uses
    const parsed = candidateInputSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors = z.flattenError(parsed.error).fieldErrors;
      setErrors((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(fieldErrors).map(([k, v]) => [k, translateFormError(v?.[0], t)]),
        ),
      }));
      haptic.error();
      return;
    }

    setSaving(true);
    setSaveError("");

    try {
      // multipart: profile as JSON + the optional resume file
      const body = new FormData();
      body.set("candidate", JSON.stringify(parsed.data));
      if (resumeFile) body.set("resume", resumeFile);

      const res = await fetch("/api/candidate", {
        method: "POST",
        headers: { Authorization: `tma ${initData}` }, // no Content-Type: the browser adds the boundary
        body,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      haptic.success();
      // replace, so "back" never returns to the form
      router.replace(welcome ? "/vacancies" : "/profile");
    } catch (err) {
      haptic.error();
      console.error("profile save failed:", err);
      setSaveError("save-error");
      setSaving(false);
    }
  }

  const title = welcome ? t("profile.yourProfile") : t("profile.editTitle");

  if (loadError) {
    return (
      <PushScreen title={title} fallbackHref="/profile" backEnabled={!welcome}>
        <ErrorState
          message={t("common.profileLoadError")}
          onRetry={() => {
            setLoadError("");
            setReloadKey((k) => k + 1);
          }}
        />
      </PushScreen>
    );
  }

  if (!loaded) {
    return (
      <PushScreen title={title} fallbackHref="/profile" backEnabled={!welcome}>
        <LoadingAnimation label={t("common.loading")} />
      </PushScreen>
    );
  }

  const resumeTitle = resumeFile
    ? resumeFile.name
    : hasSavedResume
      ? t("profile.resumeSaved")
      : t("profile.uploadResume");
  const resumeSub = resumeFile
    ? `${formatSize(resumeFile.size)} · ${t("profile.tapToChange")}`
    : hasSavedResume
      ? t("profile.tapToReplace")
      : t("profile.resumeHint");

  return (
    <PushScreen
      title={title}
      fallbackHref="/profile"
      backEnabled={!welcome}
      footer={
        <div className="space-y-2">
          {saveError ? (
            <p className="text-center text-sm text-red-500">{t("common.profileSaveError")}</p>
          ) : null}
          <button
            type="submit"
            form="profile-form"
            disabled={saving}
            className="flex h-[52px] w-full items-center justify-center rounded-[14px] bg-accent text-base font-bold text-white disabled:opacity-60"
          >
            {saving ? t("profile.saving") : welcome ? t("profile.continue") : t("profile.save")}
          </button>
        </div>
      }
    >
      {welcome ? (
        <p className="mb-5 text-[15px] leading-[22px] text-muted">
          {t("profile.welcome", { name: user.first_name })}
        </p>
      ) : null}

      <form id="profile-form" onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <Field label={t("profile.fullName")} error={translateFormError(errors.full_name, t)}>
          <input
            className={inputClass}
            value={form.full_name}
            onChange={(e) => update("full_name", e.target.value)}
            autoComplete="name"
            placeholder="Aziz Karimov"
          />
        </Field>

        <Field label={t("profile.phoneField")} error={translateFormError(errors.phone, t)}>
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
          <Field label={t("profile.ageField")} error={translateFormError(errors.age, t)}>
            <input
              className={inputClass}
              value={form.age}
              onChange={(e) => update("age", e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="22"
            />
          </Field>

          <Field label={t("profile.experienceYears")} error={translateFormError(errors.experience_years, t)}>
            <input
              className={inputClass}
              value={form.experience_years}
              onChange={(e) => update("experience_years", e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              placeholder="0"
            />
          </Field>
        </div>

        <Field label={t("profile.field")} error={translateFormError(errors.major, t)}>
          <div className="relative">
            <select
              className={`${inputClass} appearance-none pr-11`}
              value={form.major}
              onChange={(e) => update("major", e.target.value)}
            >
              <option value="" disabled>
                {t("profile.chooseField")}
              </option>
              {MAJORS.map((m) => (
                <option key={m} value={m}>
                  {majorLabel(m)}
                </option>
              ))}
            </select>
            <IconChevronDown className="pointer-events-none absolute top-3.5 right-3.5 h-5 w-5 text-chip-ink" />
          </div>
        </Field>

        <Field label={t("profile.aboutExperience")} hint={t("profile.optional")} error={translateFormError(errors.experience_text, t)}>
          <textarea
            className={`${inputClass} h-[104px] resize-none py-3 leading-[22px]`}
            value={form.experience_text}
            onChange={(e) => update("experience_text", e.target.value)}
            maxLength={1000}
            placeholder={t("profile.experiencePlaceholder")}
          />
        </Field>

        {/* Resume: the whole card is a <label>, so tapping anywhere opens the file picker
            and keyboard users can still focus the (visually hidden) input. */}
        <div>
          <span className="mb-1.5 block text-[13px] leading-[18px] font-semibold text-chip-ink">
            {t("profile.resumeOptional")}
          </span>

          <label
            className={`flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed bg-surface p-4 transition-colors focus-within:ring-2 focus-within:ring-accent/25 active:bg-chip ${
              errors.resume ? "border-red-500" : "border-field"
            } ${saving ? "pointer-events-none opacity-60" : ""}`}
          >
            <input
              ref={resumeInputRef}
              type="file"
              accept={RESUME_ACCEPT}
              className="sr-only"
              disabled={saving}
              onChange={(e) => handleResumeChange(e.target.files?.[0])}
            />
            <span
              aria-hidden="true"
              className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-chip text-chip-ink"
            >
              <IconUpload className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] leading-5 font-bold">{resumeTitle}</span>
              <span className="mt-0.5 block text-xs leading-4 text-muted">{resumeSub}</span>
            </span>
            {hasSavedResume && !resumeFile ? (
              <IconCheck className="h-5 w-5 flex-none text-money" />
            ) : null}
          </label>

          {resumeFile ? (
            <button
              type="button"
              onClick={removeSelectedResume}
              className="mt-2 h-9 text-sm font-semibold text-accent-text"
            >
              {t("profile.removeFile")}
            </button>
          ) : null}
          {errors.resume ? (
            <span className="mt-1 block text-xs text-red-500">
              {translateFormError(errors.resume, t)}
            </span>
          ) : null}
        </div>
      </form>
    </PushScreen>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-[13px] leading-[18px] font-semibold text-chip-ink">
        {label}
        {hint ? <span className="ml-1 font-medium text-muted">({hint})</span> : null}
      </span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-500">{error}</span> : null}
    </label>
  );
}
