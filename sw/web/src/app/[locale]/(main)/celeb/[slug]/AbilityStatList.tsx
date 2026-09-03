/* ─────────────────────────────────────────────
 * [celeb 상세] analysis — 역량 스탯 목록
 * - 목차 위치: analysis > spectrum
 * - 데이터: items(AbilityKey/값/근거) props
 * - 함께 보기: StatReasonBox.tsx, SpectrumSection.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { ScoreBar } from "@/components/ui";
import type { AbilityKey } from "@/lib/spectrum/constants";

import StatReasonBox from "./StatReasonBox";

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
              onClick={() =>
                setSelected((prev) => (prev === item.key ? null : item.key))
              }
              className="w-full rounded-[2px] px-1 text-left opacity-70 hover:opacity-100"
            >
              <ScoreBar
                label={item.label}
                value={item.value}
                labelClassName={isEn ? "w-[5.5rem]" : "w-10"}
                selected={pressed}
              />
            </button>
          );
        })}
      </div>

      <StatReasonBox
        hint={t("abilityReasonHint")}
        empty={t("abilityReasonEmpty")}
        reason={active?.reason}
        active={Boolean(active)}
      />
    </div>
  );
}
