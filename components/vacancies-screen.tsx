"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TabScreen } from "@/components/app-shell";
import { FilterSheet, type FilterOption } from "@/components/filter-sheet";
import { IconFilter, IconSearch } from "@/components/icons";
import { VacancyCard } from "@/components/vacancy-card";
import { haptic } from "@/lib/haptics";
import { useLanguage } from "@/components/language-provider";
import { LoadingAnimation } from "@/components/ui/loading-animation";
import type { VacancyRow } from "@/lib/vacancy-types";
import type { TelegramUser } from "@/types/telegram";
import EmptyBoxAnimation from "@/app/EmptyBoxAnimation";

export function VacanciesScreen({ user, initData }: { user: TelegramUser; initData: string }) {
  const { t, majorLabel } = useLanguage();
  const [vacancies, setVacancies] = useState<VacancyRow[] | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState("");
  const [major, setMajor] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
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
        console.error("vacancies load failed:", e);
        if (!cancelled) setError("load-error");
      });

    return () => {
      cancelled = true;
    };
  }, [initData, reloadKey]);

  // Fields that actually exist in the data, most common first
  const majorCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const v of vacancies ?? []) counts.set(v.major, (counts.get(v.major) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
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
  const showFilter = majorCounts.length > 1;

  const options: FilterOption[] = [
    { value: null, label: t("vacancies.allFields"), count: total },
    ...majorCounts.map(([m, count]) => ({ value: m, label: m, count })),
  ];

  let subtitle = t("vacancies.loading");
  if (error) subtitle = t("common.somethingWrong");
  else if (vacancies) {
    subtitle = filtering
      ? t("vacancies.filteredCount", { shown: filtered.length, total })
      : t("vacancies.count", { count: total });
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

  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const toolbar = (
    <div className="flex items-center gap-2">
      <div className="glass flex h-12 min-w-0 flex-1 items-center gap-2.5 rounded-full px-4 text-muted focus-within:ring-2 focus-within:ring-accent/30">
        <input
          ref={searchInputRef}
          type="search"
          aria-label={t("vacancies.search")}
          placeholder={t("vacancies.search")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
        />
        <button
          type="button"
          aria-label={t("vacancies.finishSearch")}
          onClick={() => searchInputRef.current?.blur()}
          className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-muted"
        >
          <IconSearch className="h-5 w-5" />
        </button>
      </div>

      {showFilter ? (
        <button
          type="button"
          onClick={() => {
            haptic.light();
            setSheetOpen(true);
          }}
          aria-haspopup="dialog"
          aria-label={
            major
              ? `${t("vacancies.field")}: ${majorLabel(major)}. ${t("vacancies.changeField")}`
              : t("vacancies.field")
          }
          className={`glass flex h-12 flex-none items-center gap-2 rounded-full px-4 text-sm font-semibold ${
            major ? "border-accent/60 text-accent-text" : "text-ink"
          }`}
        >
          <IconFilter className="h-4.5 w-4.5 flex-none" />
          <span className="max-w-26 truncate">{major ? majorLabel(major) : t("vacancies.field")}</span>
        </button>
      ) : null}
    </div>
  );

  return (
    <>
      <TabScreen
        title={t("vacancies.title")}
        subtitle={subtitle}
        toolbar={toolbar}
        scrollHeader
        action={<Avatar user={user} />}
      >
        {error ? (
          <div className="rounded-2xl border border-line bg-surface p-5 text-center">
            <p className="text-sm text-red-500">{t("common.vacanciesLoadError")}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-4 h-11 rounded-xl bg-accent px-5 text-sm font-bold text-white"
            >
              {t("common.tryAgain")}
            </button>
          </div>
        ) : !vacancies ? (
          <LoadingAnimation label={t("vacancies.loading")} />
        ) : total === 0 ? (
          <EmptyState
            icon={<EmptyBoxAnimation />}
            title={t("vacancies.noVacancies")}
            text={t("vacancies.checkBack")}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<EmptyBoxAnimation />}
            title={t("vacancies.nothingFound")}
            text={t("vacancies.changeSearch")}
            action={
              <button
                type="button"
                onClick={clearFilters}
                className="mt-5 h-11 rounded-xl border border-line bg-surface px-5 text-sm font-bold"
              >
                {t("vacancies.clearFilters")}
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

      {sheetOpen ? (
        <FilterSheet
          title={t("vacancies.field")}
          options={options.map((option) => ({
            ...option,
            label: option.value ? majorLabel(option.value) : option.label,
          }))}
          selected={major}
          onSelect={(value) => {
            setMajor(value);
            setSheetOpen(false);
          }}
          onClose={closeSheet}
        />
      ) : null}
    </>
  );
}

function Avatar({ user }: { user: TelegramUser }) {
  const { t } = useLanguage();
  return (
    <Link
      href="/profile"
      aria-label={t("vacancies.openProfile")}
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
  icon,
  title,
  text,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  text: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-16 text-center">
      {icon}
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>
      {action}
    </div>
  );
}
