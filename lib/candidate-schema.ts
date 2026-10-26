import { z } from "zod";
import { MAJORS } from "@/lib/constants";

export const RESUME_MAX_SIZE_BYTES = 2 * 1024 * 1024;
export const RESUME_ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "zip",
  "rtf",
  "txt",
  "odt",
] as const;

const RESUME_CONTENT_TYPES: Record<(typeof RESUME_ALLOWED_EXTENSIONS)[number], string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  zip: "application/zip",
  rtf: "application/rtf",
  txt: "text/plain",
  odt: "application/vnd.oasis.opendocument.text",
};

export function getResumeExtension(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return RESUME_ALLOWED_EXTENSIONS.find((allowed) => allowed === extension) ?? null;
}

export function getResumeContentType(fileName: string) {
  const extension = getResumeExtension(fileName);
  return extension ? RESUME_CONTENT_TYPES[extension] : null;
}

export function isAllowedResumeFile(file: Pick<File, "name" | "size">) {
  return (
    getResumeExtension(file.name) !== null &&
    file.size > 0 &&
    file.size <= RESUME_MAX_SIZE_BYTES
  );
}

// Shared by the API route (server) and the form (client).
export const candidateInputSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+998\d{9}$/, "Format: +998901234567"),
  age: z.coerce.number().int().min(16, "Min age is 16").max(70, "Max age is 50"),
  major: z.enum(MAJORS, { message: "Choose a major" }),
  experience_years: z.coerce.number().int().min(0).max(50),
  experience_text: z.string().trim().max(1000).optional().default(""),
});

export type CandidateInput = z.infer<typeof candidateInputSchema>;

// What the DB returns for the logged-in candidate
export type CandidateRow = CandidateInput & {
  id: string;
  telegram_id: number;
  photo_url: string | null;
  resume_path: string | null;
  status: "new" | "reviewed" | "shortlisted" | "rejected";
  created_at: string;
  updated_at: string;
};
