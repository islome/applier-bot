"use client";

import { LottieAnimation } from "@/components/ui/lottie-animation";

const loadingAnimationSrc =
  "/ui/loading.json";

export function LoadingAnimation({
  label,
  className = "py-10",
}: {
  label: string;
  className?: string;
}) {
  return (
    <div role="status" aria-label={label} className={`flex justify-center ${className}`}>
      <LottieAnimation src={loadingAnimationSrc} className="h-40 w-40 object-contain" />
    </div>
  );
}
