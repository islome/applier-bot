"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner, TelegramGate } from "@/components/telegram-gate";
import { useLanguage } from "@/components/language-provider";

export default function Home() {
  return (
    <TelegramGate>{({ initData }) => <Redirector initData={initData} />}</TelegramGate>
  );
}

function Redirector({ initData }: { initData: string }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch("/api/candidate", { headers: { Authorization: `tma ${initData}` } })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
        return body as { candidate: unknown | null };
      })
      .then(({ candidate }) => {
        if (!cancelled) router.replace(candidate ? "/vacancies" : "/profile");
      })
      .catch((e) => {
        console.error("home redirect lookup failed:", e);
        if (!cancelled) setError("load-error");
      });

    return () => {
      cancelled = true;
    };
  }, [initData, router]);

  if (!error) return <Spinner />;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-card bg-surface p-6 text-center">
        <p className="text-body text-danger">{t("home.loadError")}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary mt-4"
        >
          {t("common.tryAgain")}
        </button>
      </div>
    </main>
  );
}
