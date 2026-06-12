/*
  파일명: /components/features/user/explore/hub/PersonaExtremeGrid/PersonaExtremeGrid.tsx
  기능: 극단의 기록가 그리드
  책임: persona 4그룹 탭 전환 + 2x2 수평 카드. 축별 고유 컬러 + 차순위 확대.
*/ // ------------------------------

"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import type { PersonaExtremeEntry } from "@/actions/home/getPersonaExtremes";
import { cn } from "@/lib/utils";
import { GROUPS, AXIS_COLORS } from "../../personaAxis";
import PersonaQuickViewModal from "../PersonaQuickViewModal";
import DispositionsOpposingCard from "./sections/DispositionsOpposingCard";
import AxisExtremeCard from "./sections/AxisExtremeCard";

interface PersonaExtremeGridProps {
  entries: PersonaExtremeEntry[];
}

export default function PersonaExtremeGrid({
  entries,
}: PersonaExtremeGridProps) {
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCard, setSelectedCard] = useState<{ entry: PersonaExtremeEntry; isOpposing: boolean; color: string } | null>(null);

  if (entries.length === 0) return null;

  const entryMap = new Map(entries.map((e) => [e.axis, e]));
  const currentGroup = GROUPS[activeTab];
  const currentEntries = currentGroup.keys
    .map((k) => entryMap.get(k))
    .filter(Boolean) as PersonaExtremeEntry[];

  const handleCardClick = (entry: PersonaExtremeEntry, isOpposing: boolean, color: string) =>
    setSelectedCard({ entry, isOpposing, color });

  return (
    <div className="space-y-6">
      {/* 탭 */}
      <div className="flex flex-wrap justify-center gap-2">
        {GROUPS.map((group, i) => {
          const label = locale === "en" ? group.en : group.ko;
          const isActive = i === activeTab;
          return (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={cn(
                "px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300",
                isActive
                  ? "bg-accent/15 text-accent border border-accent/40 shadow-[0_0_15px_rgba(var(--color-accent-rgb),0.2)]"
                  : "bg-bg-card/40 text-text-secondary hover:text-text-primary hover:bg-bg-card border border-border/40 hover:border-border"
              )}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* 그리드 — 성향 탭은 2열, 나머지는 4열 */}
      <div className={cn(
        "grid gap-4 mx-auto",
        activeTab === 3
          ? "grid-cols-1 lg:grid-cols-2 max-w-[1080px]"
          : "grid-cols-2 lg:grid-cols-4 max-w-[1200px]"
      )}>
        {currentEntries.map((entry) => {
          const color = AXIS_COLORS[entry.axis] ?? "#d4af37";

          // 성향 탭(Dispositions)이고 양쪽 극단이 존재하는 경우 대칭 카드 렌더링
          if (entry.opposing) {
            return <DispositionsOpposingCard key={entry.axis} entry={entry} locale={locale} color={color} onCardClick={handleCardClick} />;
          }

          return <AxisExtremeCard key={entry.axis} entry={entry} locale={locale} color={color} onCardClick={handleCardClick} />;
        })}
      </div>

      <PersonaQuickViewModal
        isOpen={selectedCard !== null}
        onClose={() => setSelectedCard(null)}
        entry={selectedCard?.entry ?? null}
        isOpposing={selectedCard?.isOpposing}
        color={selectedCard?.color ?? "#ffffff"}
      />
    </div>
  );
}
