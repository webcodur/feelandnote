"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { TendencyKey } from "@/lib/spectrum/constants";
import { cn } from "@/lib/utils";

import StatReasonBox from "./StatReasonBox";

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
  const position = ((value + 50) / 100) * 100;
  const activeLabel =
    Math.abs(value) > 10 ? (value < 0 ? "neg" : "pos") : null;
  const labelW = isEn ? "w-[5.5rem]" : "w-10";

  return (
    <div className="flex items-center gap-3 py-1.5">
      <span
        className={cn(
          "shrink-0 text-center text-sm tracking-tight",
          labelW,
          activeLabel === "neg" && "font-bold text-blue-400",
        )}
      >
        {neg}
      </span>
      <div
        className={cn(
          "relative h-1.5 flex-1 overflow-hidden rounded-full",
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
              ? "bg-white"
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
          className="absolute top-1/2 z-30 h-2 w-2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
          style={{ left: `${position}%` }}
        />
      </div>
      <span
        className={cn(
          "shrink-0 text-center text-sm tracking-tight",
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
              onClick={() =>
                setSelected((prev) => (prev === item.key ? null : item.key))
              }
              className="w-full rounded-[2px] px-1 text-left opacity-70 hover:opacity-100"
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

      <StatReasonBox
        hint={t("dispositionReasonHint")}
        empty={t("dispositionReasonEmpty")}
        reason={active?.reason}
        active={Boolean(active)}
      />
    </div>
  );
}
