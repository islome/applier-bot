import type { WorkType } from "@/lib/candidate-schema";
import type { VacancyRow } from "@/lib/vacancy-types";

export type MatchCandidate = {
  major: string | null;
  desired_salary?: number | null;
  work_type?: WorkType | null;
};

export type MatchVacancy = Pick<
  VacancyRow,
  "major" | "employment_type" | "salary_min" | "salary_max" | "salary_currency"
>;

/**
 * Does this vacancy fit the candidate's saved preferences?
 * Used by the bot's job alerts (server) and the "For you" tag on cards (client).
 *
 * - The major must be the same.
 * - desired_salary (UZS per month): the vacancy's top salary (salary_max, else salary_min)
 *   must reach it. No salary on the vacancy, or a non-UZS salary, is not a reason to skip it.
 * - work_type "remote": only remote vacancies. "onsite" / "hybrid" / unset accept anything.
 */
export function matches(candidate: MatchCandidate, vacancy: MatchVacancy): boolean {
  if (!candidate.major || candidate.major !== vacancy.major) return false;

  const wanted = candidate.desired_salary;
  const top = vacancy.salary_max ?? vacancy.salary_min;
  if (wanted != null && top != null && vacancy.salary_currency === "UZS" && top < wanted) {
    return false;
  }

  if (candidate.work_type === "remote" && vacancy.employment_type !== "remote") return false;

  return true;
}
