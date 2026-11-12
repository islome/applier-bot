/*
 * Loading placeholders shaped like the real screens, so content lands where the
 * grey blocks were (no jump, no spinner). Each mirrors the spacing of the
 * component it stands in for: keep them in step when a layout changes.
 *
 * Blocks inside cards use bg-chip; blocks sitting on the app background use
 * bg-line, which stays visible against Telegram's secondary background.
 */

/**
 * One grey block. Pulses, unless the user asked for reduced motion.
 * Pill-shaped by default; pass a rounded-* class for blocks (logos, inputs).
 */
export function Bone({ className = "" }: { className?: string }) {
  const shape = className.includes("rounded-") ? "" : "rounded-full";
  return (
    <span
      aria-hidden="true"
      className={`block bg-chip motion-safe:animate-pulse ${shape} ${className}`}
    />
  );
}

/** Announces the loading state once, for screen readers; the bones are hidden. */
function Loading({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-label={label} className={className}>
      {children}
    </div>
  );
}

/** Same height as a one-line subtitle under a large title */
export function SubtitleBone() {
  return (
    <span className="flex h-[18px] items-center">
      <Bone className="h-3 w-28 bg-line" />
    </span>
  );
}

function CardHead({ logo = "h-11 w-11 rounded-control" }: { logo?: string }) {
  return (
    <div className="flex items-start gap-3">
      <Bone className={`flex-none ${logo}`} />
      <div className="flex-1 space-y-2 pt-1">
        <Bone className="h-4 w-2/3" />
        <Bone className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function VacancyListSkeleton({ label }: { label: string }) {
  return (
    <Loading label={label} className="flex flex-col gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-card bg-surface p-4">
          <CardHead />
          <Bone className="mt-4 h-4 w-2/5" />
          <div className="mt-3 flex gap-2">
            <Bone className="h-6 w-20" />
            <Bone className="h-6 w-24" />
          </div>
        </div>
      ))}
    </Loading>
  );
}

export function ApplicationListSkeleton({ label }: { label: string }) {
  return (
    <Loading label={label} className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-card bg-surface p-4">
          <CardHead />
          <div className="mt-3 flex items-center justify-between">
            <Bone className="h-6 w-24" />
            <Bone className="h-3 w-12" />
          </div>
          <div className="mt-3 flex gap-1.5">
            {[0, 1, 2, 3].map((s) => (
              <Bone key={s} className="h-1 flex-1" />
            ))}
          </div>
        </div>
      ))}
    </Loading>
  );
}

export function VacancyDetailSkeleton({ label }: { label: string }) {
  return (
    <Loading label={label} className="space-y-5">
      <div className="flex items-center gap-3.5">
        <Bone className="h-14 w-14 flex-none rounded-card bg-line" />
        <div className="flex-1 space-y-2">
          <Bone className="h-5 w-3/4 bg-line" />
          <Bone className="h-3 w-1/2 bg-line" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2 rounded-card bg-surface p-3.5">
            <Bone className="h-3 w-12" />
            <Bone className="h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="space-y-2.5">
        <Bone className="mb-3 h-4 w-28 bg-line" />
        <Bone className="h-3 w-full bg-line" />
        <Bone className="h-3 w-full bg-line" />
        <Bone className="h-3 w-11/12 bg-line" />
        <Bone className="h-3 w-2/3 bg-line" />
      </div>
    </Loading>
  );
}

export function ProfileSkeleton({ label }: { label: string }) {
  return (
    <Loading label={label} className="flex flex-col gap-4 pb-2">
      <div className="flex items-center gap-4 rounded-card bg-surface p-4">
        <Bone className="h-16 w-16 flex-none" />
        <div className="flex-1 space-y-2">
          <Bone className="h-5 w-2/3" />
          <Bone className="h-3 w-1/3" />
        </div>
      </div>
      <div className="space-y-3 rounded-card bg-surface p-4">
        <Bone className="h-4 w-1/2" />
        <Bone className="h-2 w-full" />
        <Bone className="h-11 w-full rounded-control" />
      </div>
      <div className="rounded-card bg-surface px-4 py-1">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex min-h-[52px] items-center justify-between gap-4">
            <Bone className="h-3 w-20" />
            <Bone className="h-3 w-24" />
          </div>
        ))}
      </div>
    </Loading>
  );
}

export function FormSkeleton({ label }: { label: string }) {
  return (
    <Loading label={label} className="flex flex-col gap-4">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i}>
          <Bone className="mb-2 h-3 w-24 bg-line" />
          <Bone className={`w-full rounded-control bg-surface ${i === 4 ? "h-[104px]" : "h-12"}`} />
        </div>
      ))}
    </Loading>
  );
}
