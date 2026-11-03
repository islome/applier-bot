"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TabScreen } from "@/components/app-shell";
import { ErrorState } from "@/components/empty-state";
import type { CandidateRow } from "@/lib/candidate-schema";
import { formatPhone, experienceLabel } from "@/lib/profile-format";
import { AVATAR_ACCEPT, AVATAR_MAX_SIZE_BYTES } from "@/lib/candidate-photo";
import type { TelegramUser } from "@/types/telegram";
import { LanguageSwitcher, useLanguage } from "@/components/language-provider";
import { LoadingAnimation } from "@/components/ui/loading-animation";

export function ProfileScreen({ user, initData }: { user: TelegramUser; initData: string }) {
  const router = useRouter();
  const { language, t, majorLabel } = useLanguage();
  const [candidate, setCandidate] = useState<CandidateRow | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/candidate", { headers: { Authorization: `tma ${initData}` } })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        return body as { candidate: CandidateRow | null };
      })
      .then((body) => {
        if (cancelled) return;
        // No profile yet: send the user to the first-time form
        if (!body.candidate) router.replace("/profile/edit?welcome=1");
        else setCandidate(body.candidate);
      })
      .catch((e) => {
        console.error("profile load failed:", e);
        if (!cancelled) setError("load-error");
      });

    return () => {
      cancelled = true;
    };
  }, [initData, reloadKey, router]);

  async function onPhotoPicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // bir xil faylni qayta tanlash mumkin bo'lsin
    if (!file) return;
    setPhotoError("");
    if (file.size > AVATAR_MAX_SIZE_BYTES) {
      setPhotoError(t("profile.photoTooBig"));
      return;
    }

    setPhotoBusy(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      const res = await fetch("/api/candidate/photo", {
        method: "POST",
        headers: { Authorization: `tma ${initData}` }, // Content-Type ni brauzer o'zi qo'yadi
        body: form,
      });
      const body = (await res.json().catch(() => ({}))) as { photo_url?: string; error?: string };
      if (!res.ok || !body.photo_url) {
        setPhotoError(res.status === 413 ? t("profile.photoTooBig") : res.status === 400 ? t("profile.photoType") : t("profile.photoError"));
        return;
      }
      const photoUrl = body.photo_url;
      setCandidate((c) => (c ? { ...c, photo_url: photoUrl } : c));
    } catch (err) {
      console.error("photo upload failed:", err);
      setPhotoError(t("profile.photoError"));
    } finally {
      setPhotoBusy(false);
    }
  }

  function retry() {
    setError("");
    setReloadKey((k) => k + 1);
  }

  // "PDF uploaded" / "Uploaded" / "Not uploaded" (the file itself stays private: HR opens it)
  const resumeExt = candidate?.resume_path?.split(".").pop()?.toUpperCase();
  const resumeLabel = candidate?.resume_path
    ? resumeExt && resumeExt.length <= 5
      ? `${resumeExt} ${t("profile.uploaded")}`
      : t("profile.uploaded")
    : t("profile.noResume");

  return (
    <TabScreen title={t("profile.title")} action={<LanguageSwitcher />}>
      {error ? (
        <ErrorState message={t("common.profileLoadError")} onRetry={retry} />
      ) : !candidate ? (
        <LoadingAnimation label={t("common.loading")} />
      ) : (
        <div className="flex flex-col gap-4">
          <section className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
            <div className="relative h-16 w-16 flex-none">
              <div
                aria-hidden="true"
                className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-accent text-[26px] font-bold text-white"
              >
                {candidate.photo_url ?? user.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={(candidate.photo_url ?? user.photo_url) as string}
                    alt=""
                    className={`h-full w-full object-cover ${photoBusy ? "opacity-50" : ""}`}
                  />
                ) : (
                  candidate.full_name.charAt(0).toUpperCase()
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={photoBusy}
                aria-label={t("profile.photoChange")}
                className="absolute -right-1 -bottom-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-ink text-white disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                  <circle cx="12" cy="13" r="3.5" />
                </svg>
              </button>
              <input
                ref={fileInput}
                type="file"
                accept={AVATAR_ACCEPT}
                className="hidden"
                onChange={onPhotoPicked}
              />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xl leading-[26px] font-extrabold tracking-tight">
                {candidate.full_name}
              </h2>
              <p className="mt-0.5 truncate text-sm leading-5 text-muted">
                {user.username ? `@${user.username} · ` : ""}{t("profile.fromTelegram")}
              </p>
            </div>
          </section>
          {photoBusy ? <p className="-mt-2 px-1 text-sm text-muted">{t("profile.photoUploading")}</p> : null}
          {photoError ? <p role="alert" className="-mt-2 px-1 text-sm text-red-600">{photoError}</p> : null}

          <dl className="rounded-2xl border border-line bg-surface px-4 py-1">
            <Row label={t("profile.phone")} value={formatPhone(candidate.phone)} />
            <Row label={t("profile.age")} value={String(candidate.age ?? "-")} />
            <Row label={t("profile.field")} value={majorLabel(candidate.major)} />
            <Row
              label={t("profile.experience")}
              value={experienceLabel(candidate.experience_years, language, t)}
            />
            <Row label={t("profile.resume")} value={resumeLabel} muted={!candidate.resume_path} last />
          </dl>

          {candidate.experience_text ? (
            <section className="rounded-2xl border border-line bg-surface p-4">
              <h3 className="mb-1.5 text-sm leading-5 font-bold text-muted">{t("profile.experienceAbout")}</h3>
              <p className="text-[15px] leading-[23px] whitespace-pre-line text-ink/90">
                {candidate.experience_text}
              </p>
            </section>
          ) : null}

          <Link
            href="/profile/edit"
            className="flex h-[52px] items-center justify-center rounded-[14px] bg-accent text-base font-bold text-white"
          >
            {t("profile.edit")}
          </Link>
        </div>
      )}
    </TabScreen>
  );
}

function Row({
  label,
  value,
  last = false,
  muted = false,
}: {
  label: string;
  value: string;
  last?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[52px] items-center justify-between gap-4 ${
        last ? "" : "border-b border-line"
      }`}
    >
      <dt className="text-sm text-muted">{label}</dt>
      <dd
        className={`min-w-0 truncate text-right text-[15px] font-semibold ${
          muted ? "font-medium text-muted" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
