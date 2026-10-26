"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TabScreen } from "@/components/app-shell";
import { EmptyState, ErrorState } from "@/components/empty-state";
import { IconFile } from "@/components/icons";
import { IconChevronRight } from "@/components/icons-more";
import { StatusChip } from "@/components/status-chip";
import { Monogram } from "@/components/vacancy-card";
import type { ApplicationRow } from "@/lib/application-types";
import { haptic } from "@/lib/haptics";
import { timeAgo } from "@/lib/vacancy-format";

export function ApplicationsScreen({ initData }: { initData: string }) {
  const [items, setItems] = useState<ApplicationRow[] | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;

    fetch("/api/applications", { headers: { Authorization: `tma ${initData}` } })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        return body as { applications: ApplicationRow[] };
      })
      .then((body) => {
        if (!cancelled) setItems(body.applications);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load applications");
      });

    return () => {
      cancelled = true;
    };
  }, [initData, reloadKey]);

  function retry() {
    setError("");
    setItems(null);
    setReloadKey((k) => k + 1);
  }

  let subtitle = "Loading...";
  if (error) subtitle = "Something went wrong";
  else if (items) subtitle = items.length === 0 ? "Nothing sent yet" : `${items.length} sent`;

  return (
    <TabScreen title="Applications" subtitle={subtitle}>
      {error ? (
        <ErrorState message={error} onRetry={retry} />
      ) : !items ? (
        <div role="status" aria-label="Loading applications" className="flex animate-pulse flex-col gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
              <div className="h-11 w-11 flex-none rounded-xl bg-chip" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-chip" />
                <div className="h-3 w-1/2 rounded bg-chip" />
                <div className="h-6 w-20 rounded-full bg-chip" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<IconFile className="h-7 w-7" />}
          title="No applications yet"
          text="When you apply to a vacancy, it shows up here with its status."
          action={
            <Link
              href="/vacancies"
              className="mt-6 flex h-12 items-center rounded-[14px] bg-accent px-6 text-[15px] font-bold text-white"
            >
              Browse vacancies
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((a) => (
            <li key={a.id}>
              <Link
                href={`/vacancies/${a.vacancy.id}`}
                onClick={() => haptic.light()}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition-colors active:bg-chip"
              >
                <Monogram name={a.vacancy.company} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-base leading-[22px] font-bold">{a.vacancy.title}</h2>
                  <p className="mt-0.5 text-[13px] leading-[18px] text-muted">
                    {a.vacancy.company} · {a.vacancy.city}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <StatusChip status={a.status} />
                    <span className="text-xs text-muted">{timeAgo(a.created_at, now)}</span>
                  </div>
                </div>
                <IconChevronRight className="h-5 w-5 flex-none text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </TabScreen>
  );
}
