/*
  파일명: /components/features/user/explore/sections/PersonaFullSection/PersonaFullSection.tsx
  기능: 비범한 기록가 전체 보기
  책임: persona 4그룹 탭 전환 + 축 네비게이션 + 1개 카드 및 포커스 패널 표시.
*/ // ------------------------------

"use client";

import { useState, useEffect } from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import type { PersonaExtremeEntry } from "@/actions/home/getPersonaExtremes";
import type { PersonaStatsWithReasons } from "@/lib/persona/types";
import { GROUPS, AXIS_COLORS, AXIS_SHORT_LABELS } from "../../personaAxis";
import type { FocusedCeleb } from "./types";
import FocusPanel from "./sections/FocusPanel";
import AxisCard from "./sections/AxisCard";
import DispositionCard from "./sections/DispositionCard";

interface PersonaFullSectionProps {
  entries: PersonaExtremeEntry[];
}

export default function PersonaFullSection({ entries }: PersonaFullSectionProps) {
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState(0);
  const [activeAxisIdx, setActiveAxisIdx] = useState(0);
  const [focusedCelebId, setFocusedCelebId] = useState<string | null>(null);

  useEffect(() => {
    setFocusedCelebId(null);
  }, [activeTab, activeAxisIdx]);

  if (entries.length === 0) return null;

  const entryMap = new Map(entries.map(e => [e.axis, e]));
  const currentGroup = GROUPS[activeTab];
  const currentEntries = currentGroup.keys
    .map(k => entryMap.get(k))
    .filter(Boolean) as PersonaExtremeEntry[];

  const isDispositions = activeTab === 3;
  const activeEntry = currentEntries[activeAxisIdx];
  if (!activeEntry) return null;

  const currentFocusedId = focusedCelebId ?? activeEntry.celeb.id;

  const isEn = locale === "en";
  const color = AXIS_COLORS[activeEntry.axis] ?? "#d4af37";
  const axisLabelBadge = isEn ? (AXIS_SHORT_LABELS[activeEntry.axis]?.en || activeEntry.label.en) : (AXIS_SHORT_LABELS[activeEntry.axis]?.ko || activeEntry.label.ko);

  let focusedInfo: {
    celeb: FocusedCeleb;
    score: number;
    reason?: string;
    label?: string;
    stats?: PersonaStatsWithReasons;
  } | null = null;

  if (activeEntry.celeb.id === currentFocusedId) {
    focusedInfo = {
      celeb: activeEntry.celeb,
      score: activeEntry.score,
      reason: isEn ? activeEntry.reason.en : activeEntry.reason.ko,
      label: axisLabelBadge,
      stats: activeEntry.celeb.stats,
    };
  } else if (activeEntry.opposing?.celeb.id === currentFocusedId) {
    const oppSides = (isEn ? activeEntry.label.en : activeEntry.label.ko).split(" vs ");
    focusedInfo = {
      celeb: activeEntry.opposing.celeb,
      score: activeEntry.opposing.score,
      reason: isEn ? activeEntry.opposing.reason.en : activeEntry.opposing.reason.ko,
      label: oppSides[1] ?? "Opposite",
      stats: activeEntry.opposing.celeb.stats,
    };
  } else {
    const runner = activeEntry.runnersUp.find(r => r.id === currentFocusedId);
    if (runner) {
      focusedInfo = {
        celeb: runner,
        score: runner.score,
        reason: isEn ? runner.reason.en : runner.reason.ko,
        label: axisLabelBadge,
        stats: runner.stats,
      };
    }
  }

  // fallback if somehow not found
  if (!focusedInfo) {
    focusedInfo = {
      celeb: activeEntry.celeb,
      score: activeEntry.score,
      reason: isEn ? activeEntry.reason.en : activeEntry.reason.ko,
      label: axisLabelBadge,
      stats: activeEntry.celeb.stats,
    };
  }

  return (
    <div className="space-y-8">
      {/* 탭 */}
      <div className="flex flex-wrap gap-2">
        {GROUPS.map((group, i) => {
          const label = locale === "en" ? group.en : group.ko;
          return (
            <button
              key={i}
              onClick={() => { setActiveTab(i); setActiveAxisIdx(0); }}
              className={cn(
                "px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300",
                i === activeTab
                  ? "bg-accent/15 text-accent border border-accent/40 shadow-[0_0_15px_rgba(var(--color-accent-rgb),0.2)]"
                  : "bg-bg-card/40 text-text-secondary hover:text-text-primary hover:bg-bg-card border border-border/40 hover:border-border"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 축 네비게이션 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {currentGroup.keys.map((k, idx) => {
          const e = entryMap.get(k);
          if (!e) return null;
          const label = locale === "en"
              ? (AXIS_SHORT_LABELS[k]?.en || e.label.en)
              : (AXIS_SHORT_LABELS[k]?.ko || e.label.ko);
          const c = AXIS_COLORS[k] ?? "#d4af37";
          return (
            <button
              key={k}
              onClick={() => setActiveAxisIdx(idx)}
              className={cn(
                "px-4 py-2 rounded-full text-xs font-bold transition-all border",
                activeAxisIdx === idx
                   ? "bg-white/10 text-white"
                   : "bg-transparent text-white/40 border-white/5 hover:bg-white/5 hover:border-white/10"
              )}
              style={activeAxisIdx === idx ? { borderColor: c, color: c, backgroundColor: `${c}15` } : undefined}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Grid: 1 카드, 1 포커스 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Card: 5 columns */}
        <div className="lg:col-span-5">
           {isDispositions
              ? <DispositionCard entry={activeEntry} locale={locale} color={color} focusedId={currentFocusedId} onSelect={setFocusedCelebId} />
              : <AxisCard entry={activeEntry} locale={locale} color={color} focusedId={currentFocusedId} onSelect={setFocusedCelebId} />
           }
        </div>

        {/* Right Focus Panel: 7 columns */}
        <div className="lg:col-span-7 h-full">
           <FocusPanel
              celeb={focusedInfo.celeb}
              score={focusedInfo.score}
              reason={focusedInfo.reason}
              color={color}
              locale={locale}
              label={focusedInfo.label}
              stats={focusedInfo.stats}
           />
        </div>
      </div>
    </div>
  );
}
