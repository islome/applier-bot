"use client";

import { LottieAnimation } from "@/components/ui/lottie-animation";

const loadingAnimationSrc =
  "https://lottie.host/612ef44d-72be-4b7a-855a-481dc6914558/EPQgW8Vi7o.lottie";

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
