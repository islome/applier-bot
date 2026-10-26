"use client";

import { useEffect } from "react";
import { IconCheck } from "@/components/icons";
import { haptic } from "@/lib/haptics";
import { useTelegramBackButton } from "@/lib/use-telegram-back-button";
import { useLanguage } from "@/components/language-provider";

export type FilterOption = { value: string | null; label: string; count: number };

/**
 * Bottom sheet with a single-choice list. Mount it only while it is open:
 * mounting shows Telegram's BackButton (closes the sheet), unmounting hides it.
 * Keep `onClose` stable (useCallback) so the button isn't re-registered every render.
 */
export function FilterSheet({
  title,
  options,
  selected,
  onSelect,
  onClose,
}: {
  title: string;
  options: FilterOption[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  useTelegramBackButton(onClose);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="fade-in absolute inset-0 bg-black/35"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="glass-strong sheet-in absolute inset-x-0 bottom-0 max-h-[75dvh] overflow-y-auto rounded-t-[28px] border-b-0 px-3 pt-2 pb-[max(env(safe-area-inset-bottom),16px)]"
      >
        <div aria-hidden="true" className="mx-auto mb-2 h-1 w-9 rounded-full bg-muted/40" />
        <h2 className="px-3 pt-1 pb-2 text-lg leading-6 font-extrabold">{title}</h2>

        <ul className="flex flex-col gap-1">
          {options.map((o) => {
            const isSelected = o.value === selected;
            return (
              <li key={o.label}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    haptic.select();
                    onSelect(o.value);
                  }}
                  className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl px-4 text-left text-[15px] font-semibold ${
                    isSelected ? "bg-accent/12 text-accent-text" : "text-ink active:bg-chip"
                  }`}
                >
                  <span className="min-w-0 truncate">{o.label}</span>
                  <span className="flex flex-none items-center gap-3">
                    <span className="text-sm font-medium text-muted">{o.count}</span>
                    {isSelected ? (
                      <IconCheck className="h-5 w-5" />
                    ) : (
                      <span className="h-5 w-5" aria-hidden="true" />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
