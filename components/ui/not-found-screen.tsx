"use client";

import Link from "next/link";
import { useLanguage } from "@/components/language-provider";
import {
  LottieAnimation,
  notFoundAnimationSrc,
} from "@/components/ui/lottie-animation";

export function NotFoundScreen() {
  const { t } = useLanguage();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <LottieAnimation src={notFoundAnimationSrc} className="h-56 w-56 object-contain" />
      <h1 className="mt-4 text-title font-semibold">{t("notFound.title")}</h1>
      <p className="mt-2 max-w-sm text-body text-muted">{t("notFound.description")}</p>
      <Link
        href="/vacancies"
        className="btn btn-lg btn-primary mt-6"
      >
        {t("notFound.home")}
      </Link>
    </main>
  );
}
