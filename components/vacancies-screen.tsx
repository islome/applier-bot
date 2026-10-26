"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TabScreen } from "@/components/app-shell";
import { IconSearch } from "@/components/icons";
import { VacancyCard, VacancyCardSkeleton } from "@/components/vacancy-card";
import { haptic } from "@/lib/haptics";
import type { VacancyRow } from "@/lib/vacancy-types";
import type { TelegramUser } from "@/types/telegram";

export function VacanciesScreen({ user, initData }: { user: TelegramUser; initData: string }) {
  const [vacancies, setVacancies] = useState<VacancyRow[] | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [major, setMajor] = useState<string | null>(null);
  // Fixed once per mount, so "2h ago" labels are stable between renders
  const [now] = useState(() => Date.now());

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
  }, [initData, reloadKey]);

  // Filter chips: the majors that actually exist in the data, most common first
  const majors = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of vacancies ?? []) counts.set(v.major, (counts.get(v.major) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([m]) => m);
  }, [vacancies]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (vacancies ?? []).filter((v) => {
      if (major && v.major !== major) return false;
      if (!q) return true;
      return [v.title, v.company, v.city].some((s) => s.toLowerCase().includes(q));
    });
  }, [vacancies, query, major]);

  const total = vacancies?.length ?? 0;
  const filtering = query.trim() !== "" || major !== null;

  let subtitle = "Loading...";
  if (error) subtitle = "Something went wrong";
  else if (vacancies) {
    subtitle = filtering
      ? `${filtered.length} of ${total}`
      : `${total} open ${total === 1 ? "position" : "positions"}`;
  }

  function retry() {
    setError("");
    setVacancies(null);
    setReloadKey((k) => k + 1);
  }

  function clearFilters() {
    setQuery("");
    setMajor(null);
  }

  const toolbar = (
    <div className="pb-3">
      <div className="px-5 pb-3">
        <label className="flex h-12 items-center gap-2.5 rounded-[14px] border border-line bg-surface px-3.5 text-muted focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
          <IconSearch className="h-5 w-5 flex-none" />
          <input
            type="search"
            aria-label="Search vacancies"
            placeholder="Search role or company"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            enterKeyHint="search"
            className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
          />
        </label>
      </div>

      {majors.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto px-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Chip active={major === null} onClick={() => setMajor(null)}>
            All
          </Chip>
          {majors.map((m) => (
            <Chip key={m} active={major === m} onClick={() => setMajor(major === m ? null : m)}>
              {m}
            </Chip>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <TabScreen
      title="Vacancies"
      subtitle={subtitle}
      toolbar={toolbar}
      action={<Avatar user={user} />}
    >
      {error ? (
        <div className="rounded-2xl border border-line bg-surface p-5 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <button
            type="button"
            onClick={retry}
            className="mt-4 h-11 rounded-xl bg-accent px-5 text-sm font-bold text-white"
          >
            Try again
          </button>
        </div>
      ) : !vacancies ? (
        <div role="status" aria-label="Loading vacancies" className="flex animate-pulse flex-col gap-3">
          <VacancyCardSkeleton />
          <VacancyCardSkeleton />
          <VacancyCardSkeleton />
        </div>
      ) : total === 0 ? (
        <EmptyState title="No vacancies yet" text="New positions will appear here. Check back soon." />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nothing found"
          text="Try a different word or remove the filter."
          action={
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 h-11 rounded-xl border border-line bg-surface px-5 text-sm font-bold"
            >
              Clear filters
            </button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((v) => (
            <li key={v.id}>
              <VacancyCard vacancy={v} now={now} />
            </li>
          ))}
        </ul>
      )}
    </TabScreen>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => {
        haptic.select();
        onClick();
      }}
      className={`h-10 flex-none rounded-full border px-4 text-sm font-semibold whitespace-nowrap ${
        active ? "border-ink bg-ink text-app" : "border-line bg-surface text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Avatar({ user }: { user: TelegramUser }) {
  return (
    <Link
      href="/profile"
      aria-label="Open profile"
      className="flex h-11 w-11 flex-none items-center justify-center overflow-hidden rounded-full bg-accent text-[17px] font-bold text-white"
    >
      {user.photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.photo_url} alt="" className="h-full w-full object-cover" />
      ) : (
        user.first_name.charAt(0).toUpperCase()
      )}
    </Link>
  );
}

function EmptyState({
  title,
  text,
  action,
}: {
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>
      {action}
    </div>
  );
}
