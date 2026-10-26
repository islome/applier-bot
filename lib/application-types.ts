export type ApplicationStatus = "new" | "reviewed" | "shortlisted" | "rejected";

// What the candidate sees (HR statuses are worded kindly)
export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  new: "Sent",
  reviewed: "In review",
  shortlisted: "Shortlisted",
  rejected: "Not selected",
};

export type ApplicationSummary = {
  id: string;
  status: ApplicationStatus;
  created_at: string;
};

export type ApplicationRow = ApplicationSummary & {
  vacancy: { id: string; title: string; company: string; city: string };
};
