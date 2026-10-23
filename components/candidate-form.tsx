"use client";

import { useEffect, useState } from "react";
import { z } from "zod";
import { MAJORS } from "@/lib/constants";
import { candidateInputSchema, type CandidateRow } from "@/lib/candidate-schema";

type Props = {
  initData: string;
  defaultName: string;
};

type FormState = {
  full_name: string;
  phone: string;
  age: string;
  major: string;
  experience_years: string;
  experience_text: string;
};

type Status = "loading" | "idle" | "saving" | "saved" | "error";

const inputClass =
  "w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-zinc-800";

export function CandidateForm({ initData, defaultName }: Props) {
  const [form, setForm] = useState<FormState>({
    full_name: defaultName,
    phone: "+998",
    age: "",
    major: "",
    experience_years: "0",
    experience_text: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("loading");
  const [isExisting, setIsExisting] = useState(false);
  const [message, setMessage] = useState("");

  const authHeaders = { Authorization: `tma ${initData}` };

  // Load the saved profile (if any) so re-opening the app edits instead of starting over
  useEffect(() => {
    let cancelled = false;

    fetch("/api/candidate", { headers: { Authorization: `tma ${initData}` } })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as { candidate: CandidateRow | null };
      })
      .then(({ candidate }) => {
        if (cancelled) return;
        if (candidate) {
          setIsExisting(true);
          setForm({
            full_name: candidate.full_name,
            phone: candidate.phone,
            age: String(candidate.age ?? ""),
            major: candidate.major,
            experience_years: String(candidate.experience_years),
            experience_text: candidate.experience_text ?? "",
          });
        }
        setStatus("idle");
      })
      .catch(() => {
        if (cancelled) return;
        setStatus("error");
        setMessage("Could not load your profile. Check your connection.");
      });

    return () => {
      cancelled = true;
    };
  }, [initData]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
    if (status === "saved") setStatus("idle");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation with the SAME schema the server uses
    const parsed = candidateInputSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors = z.flattenError(parsed.error).fieldErrors;
      setErrors(
        Object.fromEntries(
          Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? ""]),
        ),
      );
      return;
    }

    setStatus("saving");
    setMessage("");

    try {
      const res = await fetch("/api/candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(parsed.data),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      setIsExisting(true);
      setStatus("saved");
      setMessage("Saved! HR will review your profile.");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (status === "loading") {
    return (
      <div className="flex justify-center py-10">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" />
      </div>
    );
  }

  const busy = status === "saving";

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <Field label="Full name" error={errors.full_name}>
        <input
          className={inputClass}
          value={form.full_name}
          onChange={(e) => update("full_name", e.target.value)}
          autoComplete="name"
          placeholder="Aziz Karimov"
        />
      </Field>

      <Field label="Phone" error={errors.phone}>
        <input
          className={inputClass}
          value={form.phone}
          onChange={(e) => update("phone", e.target.value.replace(/[^\d+]/g, ""))}
          inputMode="tel"
          autoComplete="tel"
          placeholder="+998901234567"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Age" error={errors.age}>
          <input
            className={inputClass}
            value={form.age}
            onChange={(e) => update("age", e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            placeholder="22"
          />
        </Field>

        <Field label="Experience (years)" error={errors.experience_years}>
          <input
            className={inputClass}
            value={form.experience_years}
            onChange={(e) =>
              update("experience_years", e.target.value.replace(/\D/g, ""))
            }
            inputMode="numeric"
            placeholder="0"
          />
        </Field>
      </div>

      <Field label="Major / field" error={errors.major}>
        <select
          className={inputClass}
          value={form.major}
          onChange={(e) => update("major", e.target.value)}
        >
          <option value="" disabled>
            Choose...
          </option>
          {MAJORS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </Field>

      <Field label="About your experience (optional)" error={errors.experience_text}>
        <textarea
          className={`${inputClass} min-h-28 resize-none`}
          value={form.experience_text}
          onChange={(e) => update("experience_text", e.target.value)}
          maxLength={1000}
          placeholder="Where you worked, what you did, key skills..."
        />
      </Field>

      {message && (
        <p
          className={`text-sm ${
            status === "error" ? "text-red-500" : "text-emerald-600 dark:text-emerald-400"
          }`}
        >
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-blue-600 px-4 py-3.5 text-base font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
      >
        {busy ? "Saving..." : isExisting ? "Update profile" : "Submit profile"}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-300">
        {label}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-500">{error}</span>}
    </label>
  );
}
