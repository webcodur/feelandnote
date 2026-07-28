/*
  파일명: /components/features/user/explore/sections/PersonaFullSection/sections/DispositionCard.tsx
  기능: 성향 대칭 카드 (Dispositions)
  책임: 양극단 최고점자 VS 최저점자 + 차순위 표시, 클릭 시 포커스 전환.
*/ // ------------------------------

"use client";

import { cn } from "@/lib/utils";
import type { PersonaExtremeEntry } from "@/actions/home/getPersonaExtremes";
import Avatar from "../Avatar";
import { getName } from "../utils";
import AxisCard from "./AxisCard";

export default function DispositionCard({
  entry, locale, color, focusedId, onSelect
}: {
  entry: PersonaExtremeEntry; locale: string; color: string;
  focusedId: string; onSelect: (id: string) => void;
}) {
  if (!entry.opposing) return <AxisCard entry={entry} locale={locale} color={color} focusedId={focusedId} onSelect={onSelect} />;

  const axisLabel = locale === "en" ? entry.label.en : entry.label.ko;
  const sides = axisLabel.includes(" vs ") ? axisLabel.split(" vs ") : [axisLabel, "Opposite"];
  const isEn = locale === "en";

  const highName = getName(entry.celeb, locale);
  const lowName = getName(entry.opposing.celeb, locale);
  const highReason = isEn ? entry.reason.en : entry.reason.ko;
  const lowReason = isEn ? entry.opposing.reason.en : entry.opposing.reason.ko;

  const isHighWinnerSelected = focusedId === entry.celeb.id;
  const isLowWinnerSelected = focusedId === entry.opposing.celeb.id;

  return (
    <div
      className="relative flex flex-col bg-[#0a0a0b] border border-white/5 rounded-2xl overflow-hidden shadow-xl"
      style={{ ["--axis-color" as string]: color }}
    >
      {/* 상단 accent bar */}
      <div className="h-1 opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

      {/* 축 제목 */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-center">
        <span className="text-sm font-black tracking-[0.15em] text-text-primary uppercase" style={{ textShadow: `0 0 10px ${color}80` }}>
          {axisLabel}
        </span>
      </div>

      {/* 최고점자 */}
      <div className="px-5">
        <button
          onClick={() => onSelect(entry.celeb.id)}
          className={cn(
            "w-full text-left group flex items-center gap-4 p-4 rounded-xl border transition-colors",
            isHighWinnerSelected ? "bg-white/[0.08] border-white/30" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/20"
          )}
        >
          <div className={cn("rounded-full shrink-0 transition-all", isHighWinnerSelected ? "ring-2 ring-offset-2 ring-offset-[#0a0a0b]" : "ring-1 ring-white/10")} style={{ '--tw-ring-color': color } as React.CSSProperties}>
            <Avatar src={entry.celeb.avatar_url} alt={highName} size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[11px] font-bold tracking-widest uppercase" style={{ color }}>{sides[0]}</span>
              <span className="text-sm font-black tabular-nums" style={{ color }}>{entry.score}</span>
            </div>
            <h3 className={cn("text-lg font-black truncate mb-1", isHighWinnerSelected ? "text-white" : "text-text-primary")}>{highName}</h3>
            {highReason && <p className="text-sm text-white/70 line-clamp-2">{highReason}</p>}
          </div>
        </button>

        {/* 최고점자 runners-up */}
        {entry.runnersUp.length > 0 && (
          <div className="pl-4 py-2 mt-1">
            <span className="text-[10px] font-bold tracking-widest uppercase block mb-1">
              {isEn ? `${sides[0]} Runners-up` : `${sides[0]} 차순위`}
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
                      "w-full text-left flex items-center gap-2 py-1 px-1 -mx-1 rounded-lg transition-colors",
                      isSelected ? "bg-white/10" : "hover:bg-white/5"
                    )}
                  >
                    <span className="text-[11px] font-bold w-5 text-right tabular-nums shrink-0">{i + 2}</span>
                    <div className={cn("rounded-full transition-all", isSelected ? "ring-1 ring-offset-1 ring-offset-[#0a0a0b]" : "")} style={{ '--tw-ring-color': color } as React.CSSProperties}>
                      <Avatar src={r.avatar_url} alt={rName} size={8} />
                    </div>
                    <span className={cn("text-sm font-medium truncate flex-1", isSelected ? "text-white" : "text-text-secondary")}>{rName}</span>
                    <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: isSelected ? color : `${color}99` }}>{r.score}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* VS 구분 */}
      <div className="relative flex items-center justify-center py-2 px-5">
        <div className="absolute left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        <div className="relative w-8 h-8 bg-[#0a0a0b] rounded-full border border-white/15 flex items-center justify-center z-10">
          <span className="text-[9px] font-black tracking-widest text-text-secondary uppercase">VS</span>
        </div>
      </div>

      {/* 최저점자 */}
      <div className="px-5 pb-5">
        <button
          onClick={() => onSelect(entry.opposing!.celeb.id)}
          className={cn(
            "w-full text-right group flex items-center flex-row-reverse gap-4 p-4 rounded-xl border transition-colors",
            isLowWinnerSelected ? "bg-white/[0.08] border-white/30" : "bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/20"
          )}
        >
          <div className={cn("rounded-full shrink-0 transition-all", isLowWinnerSelected ? "ring-2 ring-offset-2 ring-offset-[#0a0a0b]" : "ring-1 ring-white/10")} style={{ '--tw-ring-color': color } as React.CSSProperties}>
            <Avatar src={entry.opposing!.celeb.avatar_url} alt={lowName} size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-end gap-2 mb-1">
              <span className="text-sm font-black tabular-nums" style={{ color }}>{entry.opposing!.score}</span>
              <span className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[11px] font-bold tracking-widest uppercase" style={{ color }}>{sides[1] ?? "Opposite"}</span>
            </div>
            <h3 className={cn("text-lg font-black truncate mb-1", isLowWinnerSelected ? "text-white" : "text-text-primary")}>{lowName}</h3>
            {lowReason && <p className="text-sm text-white/70 line-clamp-2">{lowReason}</p>}
          </div>
        </button>
      </div>
    </div>
  );
}
