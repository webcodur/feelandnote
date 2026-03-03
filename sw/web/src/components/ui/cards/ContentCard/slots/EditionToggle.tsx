"use client";

import { useLocale, useTranslations } from "next-intl";
import type { BookEditions } from "@/lib/utils/editions";

interface EditionToggleProps {
  editions: BookEditions;
  activeEdition: "ko" | "en";
  onToggle: (edition: "ko" | "en") => void;
}

export function EditionToggle({ editions, activeEdition, onToggle }: EditionToggleProps) {
  const locale = useLocale();
  const t = useTranslations("content.edition");

  const hasKo = !!editions.ko;
  const hasEn = !!editions.en;

  // 양쪽 다 없으면 렌더링하지 않음
  if (!hasKo && !hasEn) return null;

  const labels: { key: "ko" | "en"; label: string }[] = [
    { key: "en", label: "A" },
    { key: "ko", label: "가" },
  ];

  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10 overflow-hidden px-0.5"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {labels.map(({ key, label }) => {
        const isActive = activeEdition === key;
        const isAvailable = key === "ko" ? hasKo : hasEn;
        const disabledTitle = key === "ko" ? t("noKo") : t("noEn");

        return (
          <button
            key={key}
            type="button"
            disabled={!isAvailable}
            title={!isAvailable ? disabledTitle : undefined}
            onClick={() => isAvailable && onToggle(key)}
            className={`px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
              isActive
                ? "bg-accent/80 text-white rounded-full"
                : isAvailable
                  ? "text-text-secondary hover:text-text-primary hover:bg-white/10 rounded-full"
                  : "opacity-40 cursor-not-allowed text-text-tertiary"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
