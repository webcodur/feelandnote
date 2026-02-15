/*
  파일명: components/features/game/tracker/StatReveal.tsx
  기능: Stage 1 - 기본 정보 + 페르소나 스탯 공개
  책임: 직군/국적/시대 뱃지 + PersonaStatPanel 표시 (이름/아바타 숨김)
*/
"use client";

import Image from "next/image";
import { Globe, Calendar } from "lucide-react";
import type { TrackerPersona } from "@/actions/game/getTrackerRound";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
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
  profession: string;
  nationalityLabel: string | null;
  birthDate: string | null;
  deathDate: string | null;
  revealedName?: string;
  revealedAvatar?: string | null;
}

export default function StatReveal({
  persona,
  profession,
  nationalityLabel,
  birthDate,
  deathDate,
  revealedName,
  revealedAvatar,
}: StatRevealProps) {
  const revealed = !!revealedName;
  return (
    <div className="rounded-lg border border-white/20 bg-[#d9d9d9]/5 p-3 sm:p-4 max-w-lg mx-auto space-y-3">
      {/* 기본 정보 */}
      <div className="space-y-3">
        <p className="text-[10px] text-text-tertiary font-cinzel uppercase tracking-wider text-center">
          Stage 1 — Profile & Stats
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-bold text-accent">
            {getCelebProfessionLabel(profession)}
          </span>
          {nationalityLabel && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-text-secondary">
              <Globe size={11} />
              {nationalityLabel}
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-text-secondary font-mono">
            <Calendar size={11} />
            {formatEra(birthDate, deathDate)}
          </span>
        </div>
      </div>

      {/* 스탯 패널 */}
      <div className="rounded border border-white/20 bg-black/25">
        <div className="flex items-center gap-3 border-b border-white/10 bg-black/30 p-3">
          <div className="relative h-14 w-14 rounded-sm border border-white/20 bg-bg-secondary flex items-center justify-center overflow-hidden">
            {revealed && revealedAvatar ? (
              <Image src={revealedAvatar} alt={revealedName!} fill sizes="56px" className="object-cover animate-in fade-in zoom-in-95" />
            ) : revealed ? (
              <span className="text-xl font-serif text-accent animate-in fade-in">{revealedName!.charAt(0)}</span>
            ) : (
              <span className="text-2xl font-serif text-text-secondary">?</span>
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
