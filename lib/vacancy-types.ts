export type EmploymentType = "full_time" | "part_time" | "remote" | "internship";

export type VacancyRow = {
  id: string;
  title: string;
  company: string;
  city: string;
  major: string;
  employment_type: EmploymentType;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: "UZS" | "USD";
  description: string;
  requirements: string | null;
  created_at: string;
};
