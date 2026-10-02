/* ─────────────────────────────────────────────
 * [celeb 상세] analysis — 역량 스탯 목록
 * - 목차 위치: analysis > spectrum
 * - 데이터: items(AbilityKey/값/근거) props
 * - 함께 보기: StatReasonModal.tsx, SpectrumSection.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ScoreBar } from "@/components/ui";
import type { AbilityKey } from "@/lib/spectrum/constants";

import StatReasonModal from "./StatReasonModal";

interface AbilityItem {
  key: AbilityKey;
  label: string;
  value: number;
  reason?: string;
}

interface Props {
  items: AbilityItem[];
  isEn: boolean;
}

export default function AbilityStatList({ items, isEn }: Props) {
  const t = useTranslations("celebPage");
  const [selected, setSelected] = useState<AbilityKey | null>(null);
  const active = items.find((item) => item.key === selected);

  return (
    <div className="flex flex-1 flex-col gap-2 [overflow-anchor:none]">
      <div className="flex flex-col">
        {items.map((item) => {
          const pressed = selected === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={pressed}
              aria-haspopup="dialog"
              onClick={() => setSelected(item.key)}
              className="min-h-8 w-full rounded-control px-1 text-left hover:bg-bg-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <ScoreBar
                insetValue
                label={item.label}
                value={item.value}
                labelClassName={isEn ? "w-[5.5rem]" : "w-10"}
                selected={pressed}
                className="py-1"
              />
            </button>
          );
        })}
      </div>

      {active && (
        <StatReasonModal label={active.label} value={active.value} empty={t("abilityReasonEmpty")} reason={active.reason} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
