"use client";

import Link from "next/link";
import { useState } from "react";
import { haptic } from "@/lib/haptics";
import { employmentLabel, formatSalary, timeAgo } from "@/lib/vacancy-format";
import type { VacancyRow } from "@/lib/vacancy-types";
import { useLanguage } from "@/components/language-provider";

/** Company logo (logoUrl) in a soft square; falls back to the company initial if missing or broken. */
export function Monogram({
  name,
  logoUrl,
  size = "md",
}: {
  name: string;
  logoUrl?: string | null;
  size?: "md" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const box = size === "lg" ? "h-14 w-14 rounded-card text-title" : "h-11 w-11 rounded-control text-headline";

  if (logoUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- logo hosti HR tomonidan kiritiladi (noma'lum domen)
      <img
        src={logoUrl}
        alt=""
        aria-hidden="true"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`flex-none bg-chip object-cover ${box}`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`flex flex-none items-center justify-center bg-chip font-semibold text-chip-ink ${box}`}
    >
      {name.trim().charAt(0).toUpperCase()}
    </div>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-chip px-2.5 py-1 text-caption font-medium text-chip-ink">
      {children}
    </span>
  );
}

export function VacancyCard({ vacancy: v, now }: { vacancy: VacancyRow; now: number }) {
  const { language, t, majorLabel } = useLanguage();

  return (
    <Link
      href={`/vacancies/${v.id}`}
      onClick={() => haptic.light()}
      className="block rounded-card bg-surface p-4 transition-colors active:bg-chip"
    >
      <div className="flex items-start gap-3">
        <Monogram name={v.company} logoUrl={v.logo_url} />
        <div className="min-w-0 flex-1">
          <h2 className="text-headline font-semibold">{v.title}</h2>
          <p className="mt-0.5 text-footnote text-muted">
            {v.company} · {v.city}
          </p>
        </div>
        <span className="flex-none text-caption text-muted">
          {timeAgo(v.created_at, now, language, t)}
        </span>
      </div>

      <p className="mt-3 text-body font-semibold text-money">{formatSalary(v, t)}</p>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {v.for_you ? (
          <span className="rounded-full bg-accent/12 px-2.5 py-1 text-caption font-medium text-accent-text">
            {t("vacancies.forYou")}
          </span>
        ) : null}
        <Tag>{employmentLabel(v.employment_type, t)}</Tag>
        <Tag>{majorLabel(v.major)}</Tag>
      </div>
    </Link>
  );
}
