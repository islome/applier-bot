"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export const notFoundAnimationSrc =
  "https://lottie.host/66ba7c88-de6a-469f-910d-2540440e6df7/3zKEbml0iU.lottie";

export function LottieAnimation({
  src,
  className,
}: {
  src: string;
  className: string;
}) {
  return (
    <DotLottieReact
      src={src}
      loop
      autoplay
      aria-hidden="true"
      className={className}
    />
  );
}
