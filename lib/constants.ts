// Fixed list (not free text) so HR can match vacancies to candidates by major later.
export const MAJORS = [
  "IT / Software",
  "Design",
  "Marketing / SMM",
  "Sales",
  "Finance / Accounting",
  "Economics / Management",
  "Education / Teaching",
  "Engineering",
  "Medicine / Pharmacy",
  "Logistics / Transport",
  "Law",
  "Customer Support",
  "Other",
] as const;

export type Major = (typeof MAJORS)[number];
