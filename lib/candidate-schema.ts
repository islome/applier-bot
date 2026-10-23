import { z } from "zod";
import { MAJORS } from "@/lib/constants";

// Shared by the API route (server) and the form (client).
export const candidateInputSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(100),
  phone: z
    .string()
    .trim()
    .regex(/^\+998\d{9}$/, "Format: +998901234567"),
  age: z.coerce.number().int().min(16, "Min age is 16").max(70, "Max age is 70"),
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
  status: "new" | "reviewed" | "shortlisted" | "rejected";
  created_at: string;
  updated_at: string;
};
