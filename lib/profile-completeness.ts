import type { CandidateRow } from "@/lib/candidate-schema";

export type NextStep = "resume" | "about" | "prefs" | "photo";

// Required fields (name, phone, age, field, experience years) are always filled once the
// profile exists, so they are the 50% base; the rest are the optional extras.
const WEIGHTS: Record<NextStep, number> = { resume: 20, about: 15, prefs: 10, photo: 5 };
const ORDER: NextStep[] = ["resume", "about", "prefs", "photo"];

export function profileCompleteness(c: Pick<
  CandidateRow,
  "resume_path" | "experience_text" | "desired_salary" | "work_type" | "photo_url"
>) {
  const done: Record<NextStep, boolean> = {
    resume: Boolean(c.resume_path),
    about: Boolean(c.experience_text?.trim()),
    prefs: c.desired_salary != null || c.work_type != null,
    photo: Boolean(c.photo_url),
  };
  const percent = 50 + ORDER.reduce((sum, k) => sum + (done[k] ? WEIGHTS[k] : 0), 0);
  const missing = ORDER.filter((k) => !done[k]);
  return { percent, missing, next: missing[0] ?? null, weights: WEIGHTS };
}

/** 5000000 -> "5 000 000" */
export function formatAmount(n: number) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}
