/* ─────────────────────────────────────────────
 * [celeb 상세] analysis — 덕목(내면·외면) 스탯 목록
 * - 목차 위치: analysis > spectrum
 * - 데이터: innerItems/outerItems props
 * - 함께 보기: StatReasonModal.tsx, SpectrumSection.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { StatKey } from "@/lib/spectrum/constants";
import { cn } from "@/lib/utils";

import StatReasonModal from "./StatReasonModal";

interface VirtueItem {
  key: StatKey;
  label: string;
  value: number;
  reason?: string;
}

interface GroupProps {
  items: VirtueItem[];
  selectedKey: StatKey | null;
  onSelect: (key: StatKey) => void;
}

function VirtueSummaryGroup({
  items,
  selectedKey,
  onSelect,
}: GroupProps) {
  return (
    <div className="min-w-0">
      <div className="grid grid-cols-1 gap-px bg-white/[0.07]">
        {items.map((item) => {
          const pressed = selectedKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={pressed}
              aria-haspopup="dialog"
              onClick={() => onSelect(item.key)}
              className={cn(
                "flex min-h-8 min-w-0 w-full items-center justify-between gap-2 px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
                pressed
                  ? "bg-white/[0.08] opacity-100 ring-1 ring-inset ring-white/20"
                  : "bg-[color:var(--material-panel,var(--color-bg-card))] hover:bg-bg-raised",
              )}
            >
              <span
                className={cn(
                  "min-w-0 truncate text-sm sm:text-sm",
                  pressed ? "font-medium text-text-primary" : "text-text-secondary",
                )}
              >
                {item.label}
              </span>
              <span
                className={cn(
                  "relative flex h-6 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[2px] border",
                  pressed
                    ? "border-white/80 bg-white/70 shadow-sm"
                    : "border-white/10 bg-black/20",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-y-0 start-0 border-e",
                    pressed
                      ? "border-black/20 bg-white"
                      : item.value >= 80
                        ? "border-accent/30 bg-accent/20"
                        : item.value >= 60
                          ? "border-accent/20 bg-accent/[0.12]"
                          : "border-white/10 bg-white/[0.055]",
                  )}
                  style={{ width: `${item.value}%` }}
                />
                <strong
                  className={cn(
                    "relative z-10 font-serif text-sm tabular-nums sm:text-sm",
                    pressed
                      ? "font-bold text-black"
                      : item.value >= 80
                        ? "text-accent"
                        : item.value >= 60
                          ? "text-text-primary"
                          : "text-text-secondary",
                  )}
                >
                  {item.value}
                </strong>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface Props {
  innerItems: VirtueItem[];
  outerItems: VirtueItem[];
}

export default function VirtueStatList({
  innerItems,
  outerItems,
}: Props) {
  const t = useTranslations("celebPage");
  const [selected, setSelected] = useState<StatKey | null>(null);
  const active = [...innerItems, ...outerItems].find(
    (item) => item.key === selected,
  );

  return (
    <div className="flex flex-1 flex-col gap-2 [overflow-anchor:none]">
      <div className="grid grid-cols-2 overflow-hidden rounded-sm border border-white/[0.08] bg-white/[0.012]">
        <VirtueSummaryGroup
          items={innerItems}
          selectedKey={selected}
          onSelect={setSelected}
        />
        <div className="border-s border-white/[0.08]">
          <VirtueSummaryGroup
            items={outerItems}
            selectedKey={selected}
            onSelect={setSelected}
          />
        </div>
      </div>

      {active && (
        <StatReasonModal label={active.label} value={active.value} empty={t("virtueReasonEmpty")} reason={active.reason} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
