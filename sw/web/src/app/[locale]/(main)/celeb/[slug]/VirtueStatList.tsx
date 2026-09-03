/* ─────────────────────────────────────────────
 * [celeb 상세] analysis — 덕목(내면·외면) 스탯 목록
 * - 목차 위치: analysis > spectrum
 * - 데이터: innerItems/outerItems props
 * - 함께 보기: StatReasonBox.tsx, SpectrumSection.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { StatKey } from "@/lib/spectrum/constants";
import { cn } from "@/lib/utils";

import StatReasonBox from "./StatReasonBox";

interface VirtueItem {
  key: StatKey;
  label: string;
  value: number;
  reason?: string;
}

interface GroupProps {
  title: string;
  items: VirtueItem[];
  selectedKey: StatKey | null;
  onSelect: (key: StatKey) => void;
}

function VirtueSummaryGroup({
  title,
  items,
  selectedKey,
  onSelect,
}: GroupProps) {
  return (
    <div className="min-w-0">
      <div className="border-b border-white/[0.07] bg-white/[0.018] px-3 py-1.5">
        <p className="text-center text-sm font-bold tracking-[0.12em] text-accent/75">
          {title}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-px bg-white/[0.07]">
        {items.map((item) => {
          const pressed = selectedKey === item.key;
          return (
            <button
              key={item.key}
              type="button"
              aria-pressed={pressed}
              onClick={() => onSelect(item.key)}
              className="flex min-w-0 w-full items-center justify-between gap-2 bg-[color:var(--material-panel,var(--color-bg-card))] px-2 py-1.5 opacity-70 hover:opacity-100"
            >
              <span className="min-w-0 truncate text-sm text-text-secondary">
                {item.label}
              </span>
              <span className="relative flex h-6 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[2px] border border-white/10 bg-black/20">
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-y-0 start-0 border-e",
                    pressed
                      ? "border-white/40 bg-white"
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
                    "relative z-10 font-serif text-sm tabular-nums",
                    pressed
                      ? "text-black"
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
  innerTitle: string;
  outerTitle: string;
  innerItems: VirtueItem[];
  outerItems: VirtueItem[];
}

export default function VirtueStatList({
  innerTitle,
  outerTitle,
  innerItems,
  outerItems,
}: Props) {
  const t = useTranslations("celebPage");
  const [selected, setSelected] = useState<StatKey | null>(null);
  const active = [...innerItems, ...outerItems].find(
    (item) => item.key === selected,
  );

  const toggle = (key: StatKey) => {
    setSelected((prev) => (prev === key ? null : key));
  };

  return (
    <div className="flex flex-1 flex-col gap-2 [overflow-anchor:none]">
      <div className="grid grid-cols-2 overflow-hidden rounded-sm border border-white/[0.08] bg-white/[0.012]">
        <VirtueSummaryGroup
          title={innerTitle}
          items={innerItems}
          selectedKey={selected}
          onSelect={toggle}
        />
        <div className="border-s border-white/[0.08]">
          <VirtueSummaryGroup
            title={outerTitle}
            items={outerItems}
            selectedKey={selected}
            onSelect={toggle}
          />
        </div>
      </div>

      <StatReasonBox
        hint={t("virtueReasonHint")}
        empty={t("virtueReasonEmpty")}
        reason={active?.reason}
        active={Boolean(active)}
      />
    </div>
  );
}
