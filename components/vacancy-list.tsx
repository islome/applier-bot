"use client";

import { useEffect, useState } from "react";
import type { EmploymentType, VacancyRow } from "@/lib/vacancy-types";

const TYPE_LABEL: Record<EmploymentType, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  remote: "Remote",
  internship: "Internship",
};

// Manual formatting (no toLocaleString) so the output is identical everywhere
function formatNumber(n: number) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function formatSalary(v: VacancyRow) {
  const { salary_min: min, salary_max: max, salary_currency: cur } = v;
  if (min != null && max != null) return `${formatNumber(min)} – ${formatNumber(max)} ${cur}`;
  if (min != null) return `from ${formatNumber(min)} ${cur}`;
  if (max != null) return `up to ${formatNumber(max)} ${cur}`;
  return "Salary not specified";
}

export function VacancyList({ initData }: { initData: string }) {
  const [vacancies, setVacancies] = useState<VacancyRow[] | null>(null);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/vacancies", { headers: { Authorization: `tma ${initData}` } })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        return body as { vacancies: VacancyRow[] };
      })
      .then((body) => {
        if (!cancelled) setVacancies(body.vacancies);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load vacancies");
      });

    return () => {
      cancelled = true;
    };
  }, [initData]);

  if (error) {
    return <p className="rounded-xl bg-red-500/10 p-4 text-sm text-red-500">{error}</p>;
  }

  if (!vacancies) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" />
      </div>
    );
  }

  if (vacancies.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
        No vacancies yet. Check back soon.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {vacancies.map((v) => {
        const open = openId === v.id;

        return (
          <li
            key={v.id}
            className="rounded-2xl border border-black/10 bg-white dark:border-white/10 dark:bg-zinc-900"
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : v.id)}
              aria-expanded={open}
              className="w-full p-4 text-left"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold leading-snug">{v.title}</h2>
                  <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                    {v.company} · {v.city}
                  </p>
                </div>
                <span
                  className={`mt-1 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  ▾
                </span>
              </div>

              <p className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                {formatSalary(v)}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <Tag>{TYPE_LABEL[v.employment_type]}</Tag>
                <Tag>{v.major}</Tag>
              </div>
            </button>

            {open && (
              <div className="space-y-3 border-t border-black/5 px-4 py-4 text-sm dark:border-white/10">
                <Section title="About the role">{v.description}</Section>
                {v.requirements && <Section title="Requirements">{v.requirements}</Section>}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-black/5 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
      {children}
    </span>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        {title}
      </h3>
      <p className="leading-relaxed text-zinc-700 dark:text-zinc-300">{children}</p>
    </div>
  );
}
