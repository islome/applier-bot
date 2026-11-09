"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { TabScreen } from "@/components/app-shell";
import { ErrorState } from "@/components/empty-state";
import { IconCheck } from "@/components/icons";
import { IconChevronRight } from "@/components/icons-more";
import type { CandidateRow } from "@/lib/candidate-schema";
import { formatPhone, experienceLabel } from "@/lib/profile-format";
import { formatAmount, profileCompleteness, type NextStep } from "@/lib/profile-completeness";
import { AVATAR_ACCEPT, AVATAR_MAX_SIZE_BYTES } from "@/lib/candidate-photo";
import { haptic } from "@/lib/haptics";
import type { TelegramUser } from "@/types/telegram";
import { LanguageSwitcher, useLanguage } from "@/components/language-provider";
import { LoadingAnimation } from "@/components/ui/loading-animation";

type Stats = { total: number; active: number; interview: number; hired: number };

export function ProfileScreen({ user, initData }: { user: TelegramUser; initData: string }) {
  const router = useRouter();
  const { language, t, majorLabel } = useLanguage();
  const [candidate, setCandidate] = useState<CandidateRow | null>(null);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, interview: 0, hired: 0 });
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [resumeError, setResumeError] = useState("");
  const [resumeBusy, setResumeBusy] = useState(false);
  const [notifyError, setNotifyError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const auth = { Authorization: `tma ${initData}` };

  useEffect(() => {
    let cancelled = false;

    fetch("/api/candidate", { headers: { Authorization: `tma ${initData}` } })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        return body as { candidate: CandidateRow | null; stats?: Stats };
      })
      .then((body) => {
        if (cancelled) return;
        // No profile yet: send the user to the first-time form
        if (!body.candidate) router.replace("/profile/edit?welcome=1");
        else {
          setCandidate(body.candidate);
          if (body.stats) setStats(body.stats);
        }
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
        headers: auth, // Content-Type ni brauzer o'zi qo'yadi
        body: form,
      });
      const body = (await res.json().catch(() => ({}))) as { photo_url?: string; error?: string };
      if (!res.ok || !body.photo_url) {
        setPhotoError(res.status === 413 ? t("profile.photoTooBig") : res.status === 400 ? t("profile.photoType") : t("profile.photoError"));
        return;
      }
      const photoUrl = body.photo_url;
      haptic.success();
      setCandidate((c) => (c ? { ...c, photo_url: photoUrl } : c));
    } catch (err) {
      console.error("photo upload failed:", err);
      setPhotoError(t("profile.photoError"));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function openResume() {
    setResumeError("");
    setResumeBusy(true);
    try {
      const res = await fetch("/api/candidate/resume", { headers: auth });
      const body = (await res.json().catch(() => ({}))) as { url?: string };
      if (!res.ok || !body.url) throw new Error(`HTTP ${res.status}`);
      const tg = window.Telegram?.WebApp as { openLink?: (url: string) => void } | undefined;
      if (tg?.openLink) tg.openLink(body.url);
      else window.open(body.url, "_blank");
    } catch (err) {
      console.error("resume open failed:", err);
      haptic.error();
      setResumeError(t("profile.resumeOpenError"));
    } finally {
      setResumeBusy(false);
    }
  }

  async function toggleNotify(next: boolean) {
    if (!candidate) return;
    const previous = candidate.notify_status;
    setNotifyError("");
    setCandidate({ ...candidate, notify_status: next }); // optimistic
    haptic.select();
    try {
      const res = await fetch("/api/candidate/settings", {
        method: "PATCH",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ notify_status: next }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      console.error("notify toggle failed:", err);
      setCandidate((c) => (c ? { ...c, notify_status: previous } : c));
      setNotifyError(t("profile.notifyError"));
    }
  }

  async function deleteProfile() {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/candidate", { method: "DELETE", headers: auth });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      haptic.success();
      router.replace("/profile/edit?welcome=1");
    } catch (err) {
      console.error("profile delete failed:", err);
      haptic.error();
      setDeleteError(t("profile.deleteError"));
      setDeleting(false);
    }
  }

  function retry() {
    setError("");
    setReloadKey((k) => k + 1);
  }

  function nextStepAction(step: NextStep) {
    if (step === "photo") fileInput.current?.click();
    else router.push(step === "resume" ? "/profile/edit#resume" : step === "prefs" ? "/profile/edit#prefs" : "/profile/edit#about");
  }

  // "PDF uploaded" / "Uploaded" / "Not uploaded" (the file itself stays private: HR opens it)
  const resumeExt = candidate?.resume_path?.split(".").pop()?.toUpperCase();
  const resumeLabel = candidate?.resume_path
    ? resumeExt && resumeExt.length <= 5
      ? `${resumeExt} ${t("profile.uploaded")}`
      : t("profile.uploaded")
    : t("profile.noResume");

  const completeness = candidate ? profileCompleteness(candidate) : null;
  const photo = candidate ? (candidate.photo_url ?? user.photo_url) : undefined;

  return (
    <TabScreen title={t("profile.title")}>
      {error ? (
        <ErrorState message={t("common.profileLoadError")} onRetry={retry} />
      ) : !candidate || !completeness ? (
        <LoadingAnimation label={t("common.loading")} />
      ) : (
        <div className="flex flex-col gap-4 pb-2">
          {/* Identity */}
          <section className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
            <div className="relative h-16 w-16 flex-none">
              <div
                aria-hidden="true"
                className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-accent text-[26px] font-bold text-white"
              >
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo}
                    alt=""
                    className={`h-full w-full object-cover ${photoBusy ? "opacity-40" : ""}`}
                  />
                ) : (
                  candidate.full_name.charAt(0).toUpperCase()
                )}
                {photoBusy ? (
                  <span className="absolute h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : null}
              </div>
              {/* 44px tap area, 28px visual */}
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={photoBusy}
                aria-label={t("profile.photoChange")}
                className="absolute -right-3 -bottom-3 flex h-11 w-11 items-center justify-center disabled:opacity-60"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface bg-ink text-white">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                </span>
              </button>
              <input
                ref={fileInput}
                type="file"
                accept={AVATAR_ACCEPT}
                className="hidden"
                onChange={onPhotoPicked}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl leading-[26px] font-extrabold tracking-tight">
                {candidate.full_name}
              </h2>
              <p className="mt-0.5 truncate text-sm leading-5 text-muted">
                {user.username ? `@${user.username} · ` : ""}{t("profile.fromTelegram")}
              </p>
            </div>
            <Link
              href="/profile/edit"
              aria-label={t("profile.editShort")}
              onClick={() => haptic.select()}
              className="-mr-1 flex h-11 w-11 flex-none items-center justify-center rounded-full bg-chip text-chip-ink"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
            </Link>
          </section>
          {photoError ? <p role="alert" className="-mt-2 px-1 text-sm text-red-600">{photoError}</p> : null}

          {/* Completeness */}
          <section className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-[15px] leading-5 font-bold">
                {completeness.next
                  ? t("profile.completeness", { percent: completeness.percent })
                  : t("profile.complete")}
              </h3>
              {completeness.next ? null : <IconCheck className="h-5 w-5 flex-none text-money" />}
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={completeness.percent}
              className="mt-2.5 h-2 overflow-hidden rounded-full bg-chip"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-500"
                style={{ width: `${completeness.percent}%` }}
              />
            </div>
            {completeness.next ? (
              <button
                type="button"
                onClick={() => nextStepAction(completeness.next as NextStep)}
                className="mt-3 flex min-h-11 w-full items-center justify-between gap-3 rounded-xl bg-chip px-3.5 text-left"
              >
                <span className="text-[15px] leading-5 font-semibold">
                  {t(`profile.next.${completeness.next}` as const)}
                </span>
                <span className="flex flex-none items-center gap-1 text-sm font-bold text-accent-text">
                  +{completeness.weights[completeness.next]}%
                  <IconChevronRight className="h-4 w-4" />
                </span>
              </button>
            ) : (
              <p className="mt-2 text-sm leading-5 text-muted">{t("profile.completeHint")}</p>
            )}
          </section>

          {/* My applications */}
          <Link
            href="/applications"
            onClick={() => haptic.select()}
            className="block rounded-2xl border border-line bg-surface p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[15px] leading-5 font-bold">{t("profile.apps.title")}</h3>
              <IconChevronRight className="h-4 w-4 flex-none text-muted" />
            </div>
            {stats.total === 0 ? (
              <p className="mt-1.5 text-sm leading-5 text-muted">
                {t("profile.apps.empty")} ·{" "}
                <span className="font-semibold text-accent-text">{t("profile.apps.browse")}</span>
              </p>
            ) : (
              <>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Stat value={stats.active} label={t("profile.apps.active")} />
                  <Stat value={stats.interview} label={t("profile.apps.interview")} />
                  <Stat value={stats.hired} label={t("profile.apps.hired")} />
                </div>
                <p className="mt-2.5 text-xs leading-4 text-muted">
                  {t("profile.apps.total", { count: stats.total })}
                </p>
              </>
            )}
          </Link>

          {/* Details */}
          <dl className="rounded-2xl border border-line bg-surface px-4 py-1">
            <Row label={t("profile.phone")} value={formatPhone(candidate.phone)} hint={t("profile.phoneHint")} />
            <Row
              label={t("profile.age")}
              value={candidate.age != null ? String(candidate.age) : ""}
              emptyLabel={t("profile.add")}
            />
            <Row label={t("profile.field")} value={majorLabel(candidate.major)} />
            <Row
              label={t("profile.experience")}
              value={experienceLabel(candidate.experience_years, language, t)}
              last
            />
          </dl>

          {/* Job preferences */}
          <section>
            <h3 className="mb-1.5 px-1 text-sm leading-5 font-bold text-muted">{t("profile.prefsTitle")}</h3>
            <dl className="rounded-2xl border border-line bg-surface px-4 py-1">
              <Row
                label={t("profile.salary")}
                value={
                  candidate.desired_salary != null
                    ? t("profile.salaryValue", { amount: formatAmount(candidate.desired_salary) })
                    : ""
                }
                emptyLabel={t("profile.add")}
              />
              <Row
                label={t("profile.workType")}
                value={candidate.work_type ? t(`profile.workType.${candidate.work_type}` as const) : ""}
                emptyLabel={t("profile.add")}
                last
              />
            </dl>
          </section>

          {candidate.experience_text ? (
            <section className="rounded-2xl border border-line bg-surface p-4">
              <h3 className="mb-1.5 text-sm leading-5 font-bold text-muted">{t("profile.experienceAbout")}</h3>
              <p className="text-[15px] leading-[23px] whitespace-pre-line text-ink/90">
                {candidate.experience_text}
              </p>
            </section>
          ) : null}

          {/* Resume */}
          <section className="rounded-2xl border border-line bg-surface p-4">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-sm leading-5 font-bold text-muted">{t("profile.resume")}</h3>
                <p className={`mt-0.5 truncate text-[15px] leading-5 font-semibold ${candidate.resume_path ? "" : "text-muted"}`}>
                  {resumeLabel}
                </p>
              </div>
              {candidate.resume_path ? (
                <button
                  type="button"
                  onClick={openResume}
                  disabled={resumeBusy}
                  className="h-11 flex-none rounded-xl bg-chip px-4 text-sm font-bold disabled:opacity-60"
                >
                  {t("profile.resumeView")}
                </button>
              ) : null}
              <Link
                href="/profile/edit#resume"
                className="flex h-11 flex-none items-center rounded-xl bg-accent px-4 text-sm font-bold text-white"
              >
                {candidate.resume_path ? t("profile.resumeReplace") : t("profile.resumeUpload")}
              </Link>
            </div>
            {resumeError ? <p role="alert" className="mt-2 text-sm text-red-600">{resumeError}</p> : null}
          </section>

          {/* Settings */}
          <section>
            <h3 className="mb-1.5 px-1 text-sm leading-5 font-bold text-muted">{t("profile.settings")}</h3>
            <div className="rounded-2xl border border-line bg-surface px-4">
              <div className="flex min-h-[60px] items-center justify-between gap-4 border-b border-line">
                <span className="text-[15px] font-semibold">{t("language.label")}</span>
                <LanguageSwitcher />
              </div>
              <div className="flex min-h-[60px] items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] leading-5 font-semibold">{t("profile.notify")}</p>
                  <p className="text-xs leading-4 text-muted">{t("profile.notifyHint")}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={candidate.notify_status}
                  aria-label={t("profile.notify")}
                  onClick={() => toggleNotify(!candidate.notify_status)}
                  className="flex h-11 w-14 flex-none items-center justify-end"
                >
                  <span
                    className={`relative h-7 w-12 rounded-full transition-colors ${
                      candidate.notify_status ? "bg-accent" : "bg-line"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${
                        candidate.notify_status ? "left-[22px]" : "left-0.5"
                      }`}
                    />
                  </span>
                </button>
              </div>
            </div>
            {notifyError ? <p role="alert" className="mt-1.5 px-1 text-sm text-red-600">{notifyError}</p> : null}
          </section>

          <Link
            href="/profile/edit"
            className="flex h-[52px] items-center justify-center rounded-[14px] bg-accent text-base font-bold text-white"
          >
            {t("profile.edit")}
          </Link>

          <button
            type="button"
            onClick={() => {
              setDeleteError("");
              setConfirmDelete(true);
            }}
            className="h-11 text-sm font-semibold text-red-600"
          >
            {t("profile.delete")}
          </button>
        </div>
      )}

      {confirmDelete ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => !deleting && setConfirmDelete(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-surface p-5 pb-[max(env(safe-area-inset-bottom),20px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-title" className="text-lg font-extrabold">{t("profile.deleteTitle")}</h2>
            <p className="mt-1.5 text-sm leading-5 text-muted">{t("profile.deleteText")}</p>
            {deleteError ? <p role="alert" className="mt-2 text-sm text-red-600">{deleteError}</p> : null}
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={deleteProfile}
                disabled={deleting}
                className="h-12 rounded-[14px] bg-red-600 text-base font-bold text-white disabled:opacity-60"
              >
                {deleting ? t("profile.deleting") : t("profile.deleteConfirm")}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="h-12 rounded-[14px] bg-chip text-base font-bold disabled:opacity-60"
              >
                {t("profile.deleteCancel")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </TabScreen>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-xl bg-chip px-2 py-2.5 text-center">
      <div className="text-xl leading-6 font-extrabold">{value}</div>
      <div className="mt-0.5 truncate text-xs leading-4 text-muted">{label}</div>
    </div>
  );
}

function Row({
  label,
  value,
  hint,
  emptyLabel,
  last = false,
}: {
  label: string;
  value: string;
  hint?: string;
  /** shown as a link to the edit form when the value is empty */
  emptyLabel?: string;
  last?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[52px] items-center justify-between gap-4 py-1.5 ${
        last ? "" : "border-b border-line"
      }`}
    >
      <dt className="min-w-0 text-sm text-muted">
        {label}
        {hint ? <span className="block text-xs leading-4 text-muted/80">{hint}</span> : null}
      </dt>
      <dd className="min-w-0 truncate text-right text-[15px] font-semibold">
        {value ? (
          value
        ) : emptyLabel ? (
          <Link href="/profile/edit" className="inline-flex min-h-11 items-center font-bold text-accent-text">
            + {emptyLabel}
          </Link>
        ) : (
          "-"
        )}
      </dd>
    </div>
  );
}
