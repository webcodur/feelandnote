/*
  파일명: /components/features/user/explore/sections/PersonaFullSection/sections/AxisCard.tsx
  기능: 일반 축 카드 (내면/외면/능력)
  책임: 1위 인물 + 차순위 목록 표시, 클릭 시 포커스 전환.
*/ // ------------------------------

"use client";

import { cn } from "@/lib/utils";
import type { PersonaExtremeEntry } from "@/actions/home/getPersonaExtremes";
import { AXIS_SHORT_LABELS } from "../../../personaAxis";
import Avatar from "../Avatar";
import { getName } from "../utils";
import { useTranslations } from "next-intl";

export default function AxisCard({
  entry, locale, color, focusedId, onSelect
}: {
  entry: PersonaExtremeEntry; locale: string; color: string;
  focusedId: string; onSelect: (id: string) => void;
}) {
  const t = useTranslations("explore.ui.personaDistribution");
  const label = AXIS_SHORT_LABELS[entry.axis]
    ? (locale === "en" ? AXIS_SHORT_LABELS[entry.axis].en : AXIS_SHORT_LABELS[entry.axis].ko)
    : (locale === "en" ? entry.label.en : entry.label.ko);
  const winnerName = getName(entry.celeb, locale);
  const reason = locale === "en" ? entry.reason.en : entry.reason.ko;
  return (
    <div
      className="relative flex flex-col bg-[#0a0a0b] border border-white/5 rounded-2xl overflow-hidden shadow-xl"
      style={{ ["--axis-color" as string]: color }}
    >
      <div className="h-1 opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

      <div className="px-5 pt-4 pb-2 flex items-center gap-2">
        <span
          className="px-2.5 py-1 rounded text-[11px] font-black uppercase tracking-wider border"
          style={{ backgroundColor: `${color}15`, borderColor: `${color}30`, color }}
        >
          {label}
        </span>
        <span className="text-xs text-text-tertiary">
          {locale === "en" ? entry.label.en : entry.label.ko}
        </span>
      </div>

      <button
        onClick={() => onSelect(entry.celeb.id)}
        className={cn(
          "w-full text-left group flex items-center gap-4 px-5 py-4 transition-colors",
          focusedId === entry.celeb.id ? "bg-white/10" : "hover:bg-white/[0.03]"
        )}
      >
        <div className="relative">
          <div className={cn("rounded-full transition-all duration-300", focusedId === entry.celeb.id ? "ring-2 ring-offset-2 ring-offset-[#0a0a0b]" : "ring-1 ring-white/10")} style={{ '--tw-ring-color': color } as React.CSSProperties}>
            <Avatar src={entry.celeb.avatar_url} alt={winnerName} size={20} />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-white/60">1</span>
            <h3 className={cn("text-lg font-black truncate transition-colors", focusedId === entry.celeb.id ? "text-white" : "text-text-primary")}>{winnerName}</h3>
          </div>
          <div className="flex items-baseline gap-1.5 mb-1.5" style={{ color: focusedId === entry.celeb.id ? color : `${color}cc` }}>
            <span className="text-xl font-black tabular-nums">{entry.score}</span>
            <span className="text-[10px] font-bold uppercase opacity-60">pts</span>
            <span className="text-[10px] font-bold uppercase opacity-60 ml-1">
              {t("topPercent", { percentile: entry.percentile })}
            </span>
          </div>
          {reason && (
            <p className="text-sm text-white/70 leading-relaxed line-clamp-2">{reason}</p>
          )}
        </div>
      </button>

      {entry.runnersUp.length > 0 && (
        <div className="border-t border-white/5 px-5 py-3">
          <span className="text-[10px] font-bold tracking-widest uppercase text-text-tertiary/60 block mb-2">
            {t("runnersUp")}
          </span>
          <div className="flex flex-col gap-0.5">
            {entry.runnersUp.map((r, i) => {
              const rName = getName(r, locale);
              const isSelected = focusedId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => onSelect(r.id)}
                  className={cn(
                    "w-full text-left flex items-center gap-2.5 py-1.5 px-1 -mx-1 rounded-lg transition-colors",
                    isSelected ? "bg-white/10" : "hover:bg-white/5"
                  )}
                >
                  <span className="text-[11px] font-bold text-text-tertiary/50 w-5 text-right tabular-nums shrink-0">{i + 2}</span>
                  <div className={cn("rounded-full transition-all", isSelected ? "ring-1 ring-offset-1 ring-offset-[#0a0a0b]" : "")} style={{ '--tw-ring-color': color } as React.CSSProperties}>
                    <Avatar src={r.avatar_url} alt={rName} size={8} />
                  </div>
                  <span className={cn("text-sm font-medium truncate flex-1", isSelected ? "text-white" : "text-text-secondary")}>{rName}</span>
                  <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: isSelected ? color : `${color}99` }}>
                    {r.score}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
