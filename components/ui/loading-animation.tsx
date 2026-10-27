"use client";

import { LottieAnimation } from "@/components/ui/lottie-animation";

const loadingAnimationSrc =
  "https://lottie.host/c186bae5-8fd4-4265-8588-3079796d87c6/dk56jMGKZj.lottie";

export function LoadingAnimation({
  label,
  className = "py-10",
}: {
  label: string;
  className?: string;
}) {
  return (
    <div role="status" aria-label={label} className={`flex justify-center ${className}`}>
      <LottieAnimation src={loadingAnimationSrc} className="h-28 w-28 object-contain" />
    </div>
  );
}
