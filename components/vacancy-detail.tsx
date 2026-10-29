"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PushScreen } from "@/components/app-shell";
import { IconCheck } from "@/components/icons";
import { StatusChip } from "@/components/status-chip";
import { Monogram } from "@/components/vacancy-card";
import type { ApplicationSummary } from "@/lib/application-types";
import { haptic } from "@/lib/haptics";
import { employmentLabel, formatSalaryShort, timeAgo } from "@/lib/vacancy-format";
import type { VacancyRow } from "@/lib/vacancy-types";
import { useLanguage } from "@/components/language-provider";
import { LoadingAnimation } from "@/components/ui/loading-animation";
import {
  LottieAnimation,
  notFoundAnimationSrc,
} from "@/components/ui/lottie-animation";

type State =
  | { kind: "loading" }
  | {
      kind: "ready";
      vacancy: VacancyRow;
      hasProfile: boolean;
      application: ApplicationSummary | null;
    }
  | { kind: "notfound" }
  | { kind: "error"; message: string };

export function VacancyDetail({ id, initData }: { id: string; initData: string }) {
  const { language, t, majorLabel } = useLanguage();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  const [now] = useState(() => Date.now());
  const [applying, setApplying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [applyError, setApplyError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/vacancies/${id}`, { headers: { Authorization: `tma ${initData}` } })
      .then(async (res) => {
        if (res.status === 404) return { kind: "notfound" } as const;
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        return {
          kind: "ready",
          vacancy: body.vacancy as VacancyRow,
          // only an explicit false means "no profile"; missing/unknown lets the user try
          hasProfile: body.hasProfile !== false,
          application: (body.application ?? null) as ApplicationSummary | null,
        } as const;
      })
      .then((next) => {
        if (!cancelled) setState(next);
      })
      .catch((e) => {
        console.error("vacancy detail load failed:", e);
        if (!cancelled) {
          setState({
            kind: "error",
            message: "load-error",
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

  async function apply() {
    if (applying || state.kind !== "ready") return;
    setApplying(true);
    setApplyError("");

    try {
      const res = await fetch("/api/applications", {
        method: "POST",
        headers: { Authorization: `tma ${initData}`, "Content-Type": "application/json" },
        body: JSON.stringify({ vacancy_id: id }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        application?: ApplicationSummary;
      };

      if (res.status === 409 && body.code === "NO_PROFILE") {
        // profile was removed/never saved: flip the button to "Complete profile"
        setState({ ...state, hasProfile: false });
        setApplyError("complete-profile");
        return;
      }
      if (!res.ok || !body.application) throw new Error(body.error ?? `HTTP ${res.status}`);

      haptic.success();
      setState({ ...state, hasProfile: true, application: body.application });
    } catch (e) {
      haptic.error();
      console.error("application submission failed:", e);
      setApplyError("apply-error");
    } finally {
      setApplying(false);
    }
  }

  async function cancelApplication() {
    if (cancelling || state.kind !== "ready" || !state.application) return;
    setCancelling(true);
    setApplyError("");

    try {
      const res = await fetch("/api/applications", {
        method: "DELETE",
        headers: { Authorization: `tma ${initData}`, "Content-Type": "application/json" },
        body: JSON.stringify({ application_id: state.application.id }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);

      haptic.success();
      setState({ ...state, application: null });
      setConfirmCancel(false);
    } catch (e) {
      haptic.error();
      console.error("application cancellation failed:", e);
      setApplyError("cancel-error");
    } finally {
      setCancelling(false);
    }
  }

  if (state.kind === "loading") {
    return (
      <PushScreen title={t("vacancy.title")}>
        <LoadingAnimation label={t("common.loading")} />
      </PushScreen>
    );
  }

  if (state.kind === "notfound" || state.kind === "error") {
    const notFound = state.kind === "notfound";
    return (
      <PushScreen title={t("vacancy.title")}>
        <div className="flex flex-col items-center px-6 py-16 text-center">
          {notFound ? (
            <LottieAnimation src={notFoundAnimationSrc} className="h-40 w-40 object-contain" />
          ) : null}
          <h2 className="text-lg font-bold">
            {notFound ? t("vacancy.notFound") : t("vacancy.loadError")}
          </h2>
          <p className="mt-1 max-w-xs text-sm text-muted">
            {notFound
              ? t("vacancy.unavailable")
              : state.kind === "error"
                ? t("common.somethingWrong")
                : ""}
          </p>
          {!notFound ? (
            <button
              type="button"
              onClick={retry}
              className="mt-5 h-11 rounded-xl bg-accent px-5 text-sm font-bold text-white"
            >
              {t("common.tryAgain")}
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
      title={t("vacancy.title")}
      footer={
        <div className="space-y-2">
          {applyError ? (
            <p className="text-center text-sm text-red-500">
              {applyError === "cancel-error"
                ? t("vacancy.cancelError")
                : applyError === "complete-profile"
                  ? t("vacancy.completeProfileError")
                  : t("vacancy.applyError")}
            </p>
          ) : null}
          {state.application ? (
            confirmCancel ? (
              <>
                <p className="text-center text-sm text-muted">
                  {t("vacancy.cancelConfirm")}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={() => setConfirmCancel(false)}
                    className="h-13 rounded-[14px] border border-line text-base font-bold disabled:opacity-60"
                  >
                    {t("vacancy.keepApplication")}
                  </button>
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={cancelApplication}
                    className="h-13 rounded-[14px] bg-red-600 text-base font-bold text-white disabled:opacity-60"
                  >
                    {cancelling ? t("vacancy.cancelling") : t("vacancy.confirmCancel")}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <div className="flex h-13 min-w-0 flex-1 items-center justify-center gap-2 rounded-[14px] bg-chip text-center text-sm font-bold text-chip-ink">
                  <IconCheck className="h-5 w-5 flex-none" />
                  <StatusChip status={state.application.status} />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setApplyError("");
                    setConfirmCancel(true);
                  }}
                  className="h-13 flex-none rounded-[14px] border border-red-600/30 px-4 text-sm font-bold text-red-600"
                >
                  {t("vacancy.cancel")}
                </button>
              </div>
            )
          ) : !state.hasProfile ? (
            <Link
              href="/profile/edit"
              className="flex h-13 w-full items-center justify-center rounded-[14px] bg-accent text-base font-bold text-white"
            >
              {t("vacancy.completeProfile")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={apply}
              disabled={applying}
              className="flex h-13 w-full items-center justify-center rounded-[14px] bg-accent text-base font-bold text-white disabled:opacity-60"
            >
              {applying ? t("vacancy.sending") : t("vacancy.apply")}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-5">
        <section>
          <Monogram name={v.company} size="lg" />
          <h2 className="mt-3.5 text-2xl leading-7.5 font-extrabold tracking-tight">{v.title}</h2>
          <p className="mt-1 text-[15px] leading-5.5 text-muted">
            {v.company} · {t("vacancy.posted")} {timeAgo(v.created_at, now, language, t)}
          </p>
        </section>

        <section className="grid grid-cols-2 gap-2.5">
          <Fact label={t("vacancy.salary")} value={formatSalaryShort(v, t)} valueClassName="text-money" />
          <Fact label={t("vacancy.type")} value={employmentLabel(v.employment_type, t)} />
          <Fact label={t("vacancy.city")} value={v.city} />
          <Fact label={t("vacancy.field")} value={majorLabel(v.major)} />
        </section>

        <section>
          <h3 className="mb-1.5 text-base leading-5.5 font-bold">{t("vacancy.about")}</h3>
          <p className="text-[15px] leading-5.5 whitespace-pre-line text-ink/90">
            {v.description}
          </p>
        </section>

        {requirements.length > 0 ? (
          <section>
            <h3 className="mb-2 text-base leading-5.5 font-bold">{t("vacancy.requirements")}</h3>
            <ul className="flex flex-col gap-2">
              {requirements.map((line, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[15px] leading-5.5 text-ink/90">
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
