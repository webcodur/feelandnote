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
  const confirmedNoEn = !!editions.confirmedNoEn;

  // 양쪽 다 없고 확인된 없음도 아니면 렌더링하지 않음
  if (!hasKo && !hasEn && !confirmedNoEn) return null;

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
        const isConfirmedNo = key === "en" && confirmedNoEn && !hasEn;
        // confirmedNo: 클릭은 가능 (안내문 전환), disabled는 데이터 자체가 없는 미확인 상태만
        const isDisabled = !isAvailable && !isConfirmedNo;

        return (
          <button
            key={key}
            type="button"
            disabled={isDisabled}
            title={isDisabled ? (key === "ko" ? t("noKo") : t("noEn")) : undefined}
            onClick={() => !isDisabled && onToggle(key)}
            className={`px-1.5 py-0.5 text-[10px] font-bold transition-colors ${
              isActive
                ? isConfirmedNo
                  ? "bg-red-500/60 text-white/80 rounded-full"
                  : "bg-accent/80 text-white rounded-full"
                : isAvailable
                  ? "text-text-secondary hover:text-text-primary hover:bg-white/10 rounded-full"
                  : isConfirmedNo
                    ? "text-text-tertiary hover:text-text-secondary hover:bg-white/10 rounded-full opacity-60"
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
