/*
  파일명: components/features/game/tracker/StatReveal.tsx
  기능: Stage 1 - 기본 정보 + 페르소나 스탯 공개
  책임: 직군/국적/시대 뱃지 + PersonaStatPanel 표시 (이름/아바타 숨김)
*/
"use client";

import Image from "next/image";
import { Calendar } from "lucide-react";
import type { TrackerPersona } from "@/actions/game/getTrackerRound";
import PersonaStatPanel from "@/components/shared/PersonaStatPanel";

// region: 연도 포맷
function formatEra(birth: string | null, death: string | null): string {
  const fmt = (d: string | null) => {
    if (!d) return "?";
    if (d.startsWith("-")) return `BC ${Math.abs(parseInt(d))}`;
    const match = d.match(/^(\d{1,4})/);
    return match ? match[1] : d;
  };
  return `${fmt(birth)} ~ ${fmt(death)}`;
}

interface StatRevealProps {
  persona: TrackerPersona;
  birthDate: string | null;
  deathDate: string | null;
  revealedName?: string;
  revealedAvatar?: string | null;
}

export default function StatReveal({
  persona,
  birthDate,
  deathDate,
  revealedName,
  revealedAvatar,
}: StatRevealProps) {
  const revealed = !!revealedName;
  return (
    <div className="relative rounded-lg border border-white/20 bg-bg-main p-3 sm:p-4 max-w-lg mx-auto max-h-[45vh] flex flex-col animate-clue-reveal animate-clue-glow-line overflow-hidden">
      {/* 기본 정보 */}
      <div className="shrink-0 space-y-2">
        <p className="text-[10px] text-text-tertiary font-cinzel uppercase tracking-wider text-center">
          Stage 1 — Profile & Stats
        </p>
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-[#1a1a1a] px-3 py-1 text-xs text-text-secondary font-mono">
            <Calendar size={12} />
            {formatEra(birthDate, deathDate)}
          </span>
        </div>
      </div>

      {/* 스탯 패널 */}
      <div className="rounded border border-white/20 bg-[#0e0e0e] mt-3 min-h-0 overflow-y-auto">
        <div className="flex items-center gap-3 border-b border-white/10 bg-[#0a0a0a] p-3">
          <div
            className="relative h-14 w-14 rounded-sm border border-white/20 flex items-center justify-center overflow-hidden ring-1 ring-inset ring-white/5"
            style={{ background: "radial-gradient(circle at 50% 0%, #302b27 0%, #171513 40%, #0a0908 100%)" }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] rounded-full bg-accent/20 blur-[12px] opacity-40 pointer-events-none mix-blend-screen" />
            {revealed && revealedAvatar ? (
              <Image src={revealedAvatar} alt={revealedName!} fill sizes="56px" className="object-cover relative z-10 animate-in fade-in zoom-in-95 drop-shadow-[0_6px_10px_rgba(0,0,0,0.8)]" />
            ) : revealed ? (
              <span className="relative z-10 text-xl font-serif text-accent animate-in fade-in">{revealedName!.charAt(0)}</span>
            ) : (
              <span className="relative z-10 text-2xl font-serif text-text-secondary">?</span>
            )}
          </div>
          <div>
            <h3 className={`text-lg font-serif font-bold ${revealed ? "text-accent animate-in fade-in" : "text-text-primary"}`}>
              {revealedName ?? "???"}
            </h3>
            <p className="text-xs text-accent/80">인간정보 분석 창</p>
          </div>
        </div>
        <PersonaStatPanel stats={persona} />
      </div>
    </div>
  );
}
