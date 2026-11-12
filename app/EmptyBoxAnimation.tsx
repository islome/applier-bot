"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export default function EmptyBoxAnimation() {
  return (
    <DotLottieReact
      src="/EmptyBox.json"
      loop
      autoplay
      className="mx-auto mb-2 h-36 w-36"
      aria-hidden="true"
    />
  );
}
