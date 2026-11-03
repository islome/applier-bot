import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Kompaniya logotiplari hr_profiles.logo_url da turadi. vacancies jadvalida hr_profiles ga
 * havola yo'q, shuning uchun vacancies.company == hr_profiles.company_name (katta-kichik harf
 * va bo'shliqsiz) bo'yicha moslanadi. Logo muhim emas: xato bo'lsa bo'sh xarita qaytadi.
 */
export async function loadLogoMap(db: SupabaseClient): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const { data, error } = await db
    .from("hr_profiles")
    .select("company_name, logo_url")
    .not("logo_url", "is", null);
  if (error) {
    console.error("logo lookup failed:", error.message, error.code);
    return map;
  }
  for (const row of (data ?? []) as { company_name: string | null; logo_url: string | null }[]) {
    if (row.company_name && row.logo_url && /^https?:\/\//i.test(row.logo_url)) {
      map.set(norm(row.company_name), row.logo_url);
    }
  }
  return map;
}

export function logoFor(map: Map<string, string>, company: string): string | null {
  return map.get(norm(company)) ?? null;
}
