"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { TabScreen } from "@/components/app-shell";
import { ErrorState } from "@/components/empty-state";
import type { CandidateRow } from "@/lib/candidate-schema";
import { formatPhone, experienceLabel } from "@/lib/profile-format";
import type { TelegramUser } from "@/types/telegram";
import { LanguageSwitcher, useLanguage } from "@/components/language-provider";

export function ProfileScreen({ user, initData }: { user: TelegramUser; initData: string }) {
  const router = useRouter();
  const { language, t, majorLabel } = useLanguage();
  const [candidate, setCandidate] = useState<CandidateRow | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

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
        <div role="status" aria-label={t("common.loading")} className="animate-pulse space-y-4">
          <div className="h-24 rounded-2xl bg-chip" />
          <div className="h-52 rounded-2xl bg-chip" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <section className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4">
            <div
              aria-hidden="true"
              className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-full bg-accent text-[26px] font-bold text-white"
            >
              {user.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                candidate.full_name.charAt(0).toUpperCase()
              )}
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
