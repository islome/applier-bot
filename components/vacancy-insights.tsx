"use client";

import { useLanguage } from "@/components/language-provider";
import type { VacancyInsights } from "@/lib/vacancy-types";

function Stat({ label, value, tone = "" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="min-w-0 rounded-card bg-surface p-3 text-center">
      <div className={`text-title font-semibold tabular-nums ${tone}`}>{value}</div>
      <div className="mt-0.5 text-caption text-muted">{label}</div>
    </div>
  );
}

/** Online badge: rendered only when the HR is online right now. */
export function HrOnlineBadge({ insights }: { insights: VacancyInsights | null }) {
  const { t } = useLanguage();
  if (!insights?.hr.online) return null;
  const label = insights.hr.name ? t("vacancy.hrOnlineName", { name: insights.hr.name }) : t("vacancy.hrOnline");
  return (
    <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-money/10 px-3 py-1.5 text-footnote font-medium text-money">
      <span className="relative flex h-2 w-2 flex-none">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-money opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-money" />
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}

export function VacancyInsightsSection({ insights }: { insights: VacancyInsights | null }) {
  const { t } = useLanguage();
  if (!insights) return null;

  const { applicants, hired, interviewing, hireRate, responseHours } = insights;

  const response =
    responseHours == null
      ? null
      : responseHours < 1
        ? t("vacancy.insights.respLess")
        : responseHours < 48
          ? t("vacancy.insights.respHours", { n: Math.round(responseHours) })
          : t("vacancy.insights.respDays", { n: Math.round(responseHours / 24) });

  return (
    <section className="space-y-2.5" aria-label={t("vacancy.insights.applicants")}>
      {applicants === 0 ? (
        <div className="rounded-card bg-accent/8 p-3.5">
          <div className="text-body font-semibold text-accent-text">{t("vacancy.insights.firstTitle")}</div>
          <p className="mt-0.5 text-footnote text-muted">{t("vacancy.insights.firstHint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          <Stat label={t("vacancy.insights.applicants")} value={applicants} />
          <Stat label={t("vacancy.insights.interviewing")} value={interviewing} tone="text-accent-text" />
          <Stat label={t("vacancy.insights.hired")} value={hired} tone="text-money" />
        </div>
      )}

      {hireRate || response ? (
        <div className="space-y-3 rounded-card bg-surface p-3.5">
          {hireRate ? (
            <div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-footnote text-muted">{t("vacancy.insights.chance")}</span>
                <span className="text-headline font-semibold tabular-nums">{hireRate.percent}%</span>
              </div>
              <div
                className="mt-1.5 h-2 overflow-hidden rounded-full bg-chip"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={hireRate.percent}
                aria-label={t("vacancy.insights.chance")}
              >
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500"
                  style={{ width: `${Math.max(hireRate.percent, 3)}%` }}
                />
              </div>
              <p className="mt-1.5 text-caption text-muted">
                {t(hireRate.basis === "vacancy" ? "vacancy.insights.chanceVacancy" : "vacancy.insights.chanceHr", {
                  n: hireRate.sample,
                })}
                . {t("vacancy.insights.chanceNote")}
              </p>
            </div>
          ) : null}
          {response ? (
            <div className="flex items-center justify-between gap-3 text-footnote">
              <span className="text-muted">{t("vacancy.insights.response")}</span>
              <span className="text-right font-semibold">{response}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
