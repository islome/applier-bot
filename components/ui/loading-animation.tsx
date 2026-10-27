"use client";

export function LoadingAnimation({
  label,
  className = "py-10",
}: {
  label: string;
  className?: string;
}) {
  return (
    <div role="status" aria-label={label} className={`flex justify-center ${className}`}>
      <video
        src="/ui/loading.webm"
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="h-28 w-28 object-contain"
      />
    </div>
  );
}
