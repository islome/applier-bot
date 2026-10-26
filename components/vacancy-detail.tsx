"use client";

import { useEffect, useState } from "react";
import { PushScreen } from "@/components/app-shell";
import { IconCheck } from "@/components/icons";
import { Monogram } from "@/components/vacancy-card";
import { TYPE_LABEL, formatSalaryShort, timeAgo } from "@/lib/vacancy-format";
import type { VacancyRow } from "@/lib/vacancy-types";

type State =
  | { kind: "loading" }
  | { kind: "ready"; vacancy: VacancyRow }
  | { kind: "notfound" }
  | { kind: "error"; message: string };

export function VacancyDetail({ id, initData }: { id: string; initData: string }) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/vacancies/${id}`, { headers: { Authorization: `tma ${initData}` } })
      .then(async (res) => {
        if (res.status === 404) return { kind: "notfound" } as const;
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        return { kind: "ready", vacancy: body.vacancy as VacancyRow } as const;
      })
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch((e) => {
        if (!cancelled) {
          setState({
            kind: "error",
            message: e instanceof Error ? e.message : "Failed to load vacancy",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, initData, reloadKey]);

  function retry() {
    setState({ kind: "loading" });
    setReloadKey((k) => k + 1);
  }

  if (state.kind === "loading") {
    return (
      <PushScreen title="Vacancy">
        <div role="status" aria-label="Loading vacancy" className="animate-pulse space-y-5">
          <div className="space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-chip" />
            <div className="h-7 w-4/5 rounded bg-chip" />
            <div className="h-4 w-1/2 rounded bg-chip" />
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="h-[66px] rounded-[14px] bg-chip" />
            <div className="h-[66px] rounded-[14px] bg-chip" />
            <div className="h-[66px] rounded-[14px] bg-chip" />
            <div className="h-[66px] rounded-[14px] bg-chip" />
          </div>
          <div className="h-24 rounded bg-chip" />
        </div>
      </PushScreen>
    );
  }

  if (state.kind === "notfound" || state.kind === "error") {
    const notFound = state.kind === "notfound";
    return (
      <PushScreen title="Vacancy">
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <h2 className="text-lg font-bold">
            {notFound ? "Vacancy not found" : "Could not load vacancy"}
          </h2>
          <p className="mt-1 max-w-xs text-sm text-muted">
            {notFound
              ? "It may have been closed or removed."
              : state.kind === "error"
                ? state.message
                : ""}
          </p>
          {!notFound ? (
            <button
              type="button"
              onClick={retry}
              className="mt-5 h-11 rounded-xl bg-accent px-5 text-sm font-bold text-white"
            >
              Try again
            </button>
          ) : null}
        </div>
      </PushScreen>
    );
  }

  const v = state.vacancy;
  // HR writes one requirement per line
  const requirements = (v.requirements ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <PushScreen
      title="Vacancy"
      footer={
        // Applying is the next step (needs the applications table). Disabled until then.
        <button
          type="button"
          disabled
          className="flex h-[52px] w-full items-center justify-center rounded-[14px] bg-accent text-base font-bold text-white opacity-50"
        >
          Apply (coming soon)
        </button>
      }
    >
      <div className="space-y-5">
        <section>
          <Monogram name={v.company} size="lg" />
          <h2 className="mt-3.5 text-2xl leading-[30px] font-extrabold tracking-tight">{v.title}</h2>
          <p className="mt-1 text-[15px] leading-[22px] text-muted">
            {v.company} · Posted {timeAgo(v.created_at, now)}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-2.5">
          <Fact label="Salary" value={formatSalaryShort(v)} valueClassName="text-money" />
          <Fact label="Type" value={TYPE_LABEL[v.employment_type]} />
          <Fact label="City" value={v.city} />
          <Fact label="Field" value={v.major} />
        </section>

        <section>
          <h3 className="mb-1.5 text-base leading-[22px] font-bold">About the role</h3>
          <p className="text-[15px] leading-[23px] whitespace-pre-line text-ink/90">
            {v.description}
          </p>
        </section>

        {requirements.length > 0 ? (
          <section>
            <h3 className="mb-2 text-base leading-[22px] font-bold">Requirements</h3>
            <ul className="flex flex-col gap-2">
              {requirements.map((line, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[15px] leading-[22px] text-ink/90">
                  <IconCheck className="mt-px h-5 w-5 flex-none text-accent-text" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </PushScreen>
  );
}

function Fact({
  label,
  value,
  valueClassName = "",
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-[14px] border border-line bg-surface p-3.5">
      <div className="text-xs leading-4 font-semibold text-muted">{label}</div>
      <div className={`mt-1 text-[15px] leading-5 font-bold ${valueClassName}`}>{value}</div>
    </div>
  );
}
