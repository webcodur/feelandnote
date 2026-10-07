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
      className="inline-flex items-center rounded-md overflow-hidden border border-white/[0.06]"
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
            title={isDisabled ? (key === "ko" ? t("noKo") : t("noEn")) : undefined}
            onClick={() => !isDisabled && onToggle(key)}
            className={`min-h-11 min-w-11 px-3 py-1 text-xs font-semibold tracking-wide focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${
              idx > 0 ? "border-l border-white/[0.06]" : ""
            } ${
              isActive
                ? isConfirmedNo
                  ? "bg-red-900/40 text-red-400"
                  : "bg-accent-dim/30 text-accent"
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
