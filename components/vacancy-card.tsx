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
  const box = size === "lg" ? "h-14 w-14 rounded-2xl text-[22px]" : "h-11 w-11 rounded-xl text-lg";

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
      className={`flex flex-none items-center justify-center bg-chip font-extrabold ${box}`}
    >
      {name.trim().charAt(0).toUpperCase()}
    </div>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-chip px-2.5 py-1.5 text-xs leading-4 font-semibold text-chip-ink">
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
      className="block rounded-2xl border border-line bg-surface p-4 transition-colors active:bg-chip"
    >
      <div className="flex items-start gap-3">
        <Monogram name={v.company} logoUrl={v.logo_url} />
        <div className="min-w-0 flex-1">
          <h2 className="text-base leading-5.5 font-bold">{v.title}</h2>
          <p className="mt-0.5 text-[13px] leading-4.5 text-muted">
            {v.company} · {v.city}
          </p>
        </div>
        <span className="flex-none text-xs leading-4.5 text-muted">
          {timeAgo(v.created_at, now, language, t)}
        </span>
      </div>

      <p className="mt-3 text-[15px] leading-5 font-bold text-money">{formatSalary(v, t)}</p>

      <div className="mt-2.5 flex flex-wrap gap-2">
        <Tag>{employmentLabel(v.employment_type, t)}</Tag>
        <Tag>{majorLabel(v.major)}</Tag>
      </div>
    </Link>
  );
}

/** Loading placeholder with the same shape as a card */
export function VacancyCardSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className="h-11 w-11 flex-none rounded-xl bg-chip" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-4 w-2/3 rounded bg-chip" />
          <div className="h-3 w-1/2 rounded bg-chip" />
        </div>
      </div>
      <div className="mt-4 h-4 w-3/5 rounded bg-chip" />
      <div className="mt-3 flex gap-2">
        <div className="h-7 w-20 rounded-full bg-chip" />
        <div className="h-7 w-24 rounded-full bg-chip" />
      </div>
    </div>
  );
}
