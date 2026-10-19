"use client";

import { useTranslations } from "next-intl";
import type { BookEditions } from "@/lib/utils/editions";

interface EditionToggleProps {
  editions: BookEditions;
  activeEdition: "ko" | "en";
  onToggle: (edition: "ko" | "en") => void;
}

const EDITION_LABELS: { key: "ko" | "en"; label: string }[] = [
  { key: "ko", label: "KO" },
  { key: "en", label: "EN" },
];

export function EditionToggle({ editions, activeEdition, onToggle }: EditionToggleProps) {
  const t = useTranslations("content.edition");

  const hasKo = !!editions.ko;
  const hasEn = !!editions.en;
  const confirmedNoEn = !!editions.confirmedNoEn;

  if (!hasKo && !hasEn && !confirmedNoEn) return null;

  return (
    <div
      className="inline-flex shrink-0 items-center rounded-md overflow-hidden border border-white/[0.06]"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {EDITION_LABELS.map(({ key, label }, idx) => {
        const isActive = activeEdition === key;
        const isAvailable = key === "ko" ? hasKo : hasEn;
        const isConfirmedNo = key === "en" && confirmedNoEn && !hasEn;
        const isDisabled = !isAvailable && !isConfirmedNo;

        return (
          <button
            key={key}
            type="button"
            disabled={isDisabled}
            aria-pressed={isActive}
            title={isDisabled ? (key === "ko" ? t("noKo") : t("noEn")) : undefined}
            onClick={() => !isDisabled && onToggle(key)}
            className={`min-h-7 min-w-6 px-1 py-0.5 text-xs font-semibold leading-none tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
              idx > 0 ? "border-l border-white/[0.06]" : ""
            } ${
              isActive
                ? isConfirmedNo
                  ? "bg-red-900/40 text-red-400 hover:bg-red-900/55"
                  : "bg-accent-dim/30 text-accent hover:bg-accent-dim/45"
                : isAvailable
                  ? "text-text-secondary hover:text-text-primary hover:bg-white/[0.04]"
                  : isConfirmedNo
                    ? " hover:bg-white/[0.04]"
                    : "opacity-25 cursor-not-allowed "
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
