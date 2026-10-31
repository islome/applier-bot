// HR panel bilan bir xil statuslar (bitta manba)
export const APPLICATION_STATUSES = ["new", "confirmed", "interview", "hired", "cancel"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

// Eski qiymatlar bazada qolgan bo'lishi mumkin
const LEGACY: Record<string, ApplicationStatus> = {
  reviewed: "confirmed",
  shortlisted: "interview",
  rejected: "cancel",
};

export function normalizeStatus(raw: string | null | undefined): ApplicationStatus {
  if (raw && (APPLICATION_STATUSES as readonly string[]).includes(raw)) {
    return raw as ApplicationStatus;
  }
  return (raw && LEGACY[raw]) || "new";
}

// Nomzod ko'radigan qadamlar tartibi ("cancel" bu ketma-ketlikka kirmaydi)
export const PROGRESS_STEPS: ApplicationStatus[] = ["new", "confirmed", "interview", "hired"];

export type ApplicationSummary = {
  id: string;
  status: ApplicationStatus;
  created_at: string;
};

export type ApplicationRow = ApplicationSummary & {
  vacancy: { id: string; title: string; company: string; city: string };
};
