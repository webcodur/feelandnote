/* ─────────────────────────────────────────────
 * [celeb 상세] analysis — 성향(양극) 스탯 목록
 * - 목차 위치: analysis > spectrum
 * - 데이터: items(neg/pos/값/근거) props
 * - 함께 보기: StatReasonModal.tsx, SpectrumSection.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { TendencyKey } from "@/lib/spectrum/constants";
import { cn } from "@/lib/utils";

import StatReasonModal from "./StatReasonModal";

interface DispositionItem {
  key: TendencyKey;
  neg: string;
  pos: string;
  value: number;
  reason?: string;
}

interface Props {
  items: DispositionItem[];
  isEn: boolean;
}

function TendencyBar({
  neg,
  pos,
  value,
  isEn,
  selected,
}: {
  neg: string;
  pos: string;
  value: number;
  isEn: boolean;
  selected: boolean;
}) {
  const position = Math.min(100, Math.max(0, value + 50));
  const activeLabel =
    Math.abs(value) > 10 ? (value < 0 ? "neg" : "pos") : null;
  const labelW = isEn ? "w-[5.5rem]" : "w-10";

  return (
    <div className="flex items-center gap-2 py-1">
      <span
        className={cn(
          "shrink-0 text-center text-sm tracking-tight sm:text-sm",
          labelW,
          activeLabel === "neg" && "font-bold text-blue-400",
        )}
      >
        {neg}
      </span>
      <div
        className={cn(
          "relative h-6 min-w-9 flex-1 overflow-hidden rounded-control",
          selected
            ? "bg-white/[0.08] ring-1 ring-white/35"
            : "bg-white/10 ring-1 ring-white/5",
        )}
      >
        <div className="absolute inset-y-0 left-1/2 z-20 w-px bg-white/20" />
        <div
          className={cn(
            "absolute inset-y-0",
            selected
              ? "bg-white/20"
              : value < 0
                ? "bg-blue-500/30"
                : "bg-orange-500/30",
          )}
          style={
            value < 0
              ? { left: `${position}%`, right: "50%" }
              : { left: "50%", width: `${position - 50}%` }
          }
        />
        <div
          aria-hidden
          className="absolute inset-y-1.5 z-20 w-0.5 rounded-full bg-white/80"
          style={{ left: `calc(${position}% - ${position / 100 * 2}px)` }}
        />
        <span
          className="absolute inset-0 z-30 flex items-center justify-center font-serif text-sm font-semibold tabular-nums text-text-primary sm:text-sm [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]"
        >
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
      <span
        className={cn(
          "shrink-0 text-center text-sm tracking-tight sm:text-sm",
          labelW,
          activeLabel === "pos" && "font-bold text-orange-400",
        )}
      >
        {pos}
      </span>
    </div>
  );
}

export default function DispositionStatList({ items, isEn }: Props) {
  const t = useTranslations("celebPage");
  const [selected, setSelected] = useState<TendencyKey | null>(null);
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
              <TendencyBar
                neg={item.neg}
                pos={item.pos}
                value={item.value}
                isEn={isEn}
                selected={pressed}
              />
            </button>
          );
        })}
      </div>

      {active && (
        <StatReasonModal label={`${active.neg} / ${active.pos}`} value={active.value} empty={t("dispositionReasonEmpty")} reason={active.reason} onClose={() => setSelected(null)}>
          <TendencyBar neg={active.neg} pos={active.pos} value={active.value} isEn={isEn} selected={false} />
        </StatReasonModal>
      )}
    </div>
  );
}
