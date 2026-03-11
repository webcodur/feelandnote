/*
  파일명: /components/features/user/explore/hub/PersonaExtremeGrid.tsx
  기능: 극단의 기록가 그리드
  책임: persona 4그룹 탭 전환 + 2x2 수평 카드. 축별 고유 컬러 + 차순위 확대.
*/ // ------------------------------

"use client";

import { useState } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import type { PersonaExtremeEntry } from "@/actions/home/getPersonaExtremes";
import { cn } from "@/lib/utils";
import PersonaQuickViewModal from "./PersonaQuickViewModal";

interface PersonaExtremeGridProps {
  entries: PersonaExtremeEntry[];
}

const GROUPS = [
  {
    keys: ["temperance", "diligence", "reflection", "courage"],
    ko: "내적 덕목",
    en: "Inner Virtues",
  },
  {
    keys: ["loyalty", "benevolence", "fairness", "humility"],
    ko: "외적 덕목",
    en: "Outer Virtues",
  },
  {
    keys: ["command", "martial", "intellect", "charm"],
    ko: "능력",
    en: "Abilities",
  },
  {
    keys: ["pessimism_optimism", "conservative_progressive", "individual_social", "cautious_bold"],
    ko: "성향",
    en: "Dispositions",
  },
] as const;

/** 축별 고유 컬러 */
const AXIS_COLORS: Record<string, string> = {
  // 내면 덕목
  temperance: "#7eb8da",
  diligence: "#e8a838",
  reflection: "#a78bfa",
  courage: "#ef5350",
  // 외면 덕목
  loyalty: "#f06292",
  benevolence: "#66bb6a",
  fairness: "#4fc3f7",
  humility: "#b0bec5",
  // 능력
  command: "#ff7043",
  martial: "#d32f2f",
  intellect: "#42a5f5",
  charm: "#ec407a",
// 성향 (양극단)
  pessimism_optimism: "#fdd835",
  conservative_progressive: "#26c6da",
  individual_social: "#ab47bc",
  cautious_bold: "#ff9800",
};

/** 축별 단축 라벨 (Paragon 등 수식어 생략) */
const AXIS_SHORT_LABELS: Record<string, { ko: string; en: string }> = {
  // 내면 덕목
  temperance: { ko: "절제", en: "Temperance" },
  diligence: { ko: "근면", en: "Diligence" },
  reflection: { ko: "성찰", en: "Reflection" },
  courage: { ko: "용기", en: "Courage" },
  // 외면 덕목
  loyalty: { ko: "충의", en: "Loyalty" },
  benevolence: { ko: "자비", en: "Benevolence" },
  fairness: { ko: "공정", en: "Fairness" },
  humility: { ko: "겸양", en: "Humility" },
  // 능력
  command: { ko: "통솔", en: "Command" },
  martial: { ko: "무력", en: "Martial" },
  intellect: { ko: "지략", en: "Intellect" },
  charm: { ko: "매력", en: "Charm" },
};


/** 성향 탭(Dispositions) 전용 대칭 카드 컴포넌트 (공간 최적화 가로형) */
function DispositionsOpposingCard({ entry, locale, color, onCardClick }: { entry: PersonaExtremeEntry; locale: string; color: string; onCardClick: (entry: PersonaExtremeEntry, isOpposing: boolean, color: string) => void }) {
  if (!entry.opposing) return null;

  const axisLabel = locale === "en" ? entry.label.en : entry.label.ko;
  const sides = axisLabel.includes(" vs ") ? axisLabel.split(" vs ") : [axisLabel, "Opposite"];
  const isEn = locale === "en";

  const highName = isEn && entry.celeb.nickname_en ? entry.celeb.nickname_en : entry.celeb.nickname;
  const lowName = isEn && entry.opposing.celeb.nickname_en ? entry.opposing.celeb.nickname_en : entry.opposing.celeb.nickname;

  return (
    <div
      className="group/card relative flex flex-col bg-[#0a0a0b] border border-white/5 rounded-2xl overflow-hidden shadow-2xl col-span-1 min-h-[160px] sm:min-h-[180px] max-w-[520px] mx-auto"
      style={{ ["--axis-color" as string]: color }}
    >
      {/* 1. 상단 포인트 바 및 띄워진 테마(축 제목) */}
      <div className="absolute top-0 inset-x-0 h-1 z-10 opacity-70" style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      <div className="absolute top-3 sm:top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
        <div className="px-4 py-1.5 rounded-full bg-[#0a0a0b]/80 backdrop-blur-md border border-white/10 shadow-xl flex items-center justify-center">
          <span className="text-xs sm:text-sm font-black tracking-[0.15em] text-text-primary uppercase" style={{ textShadow: `0 0 10px ${color}80` }}>
            {axisLabel}
          </span>
        </div>
      </div>

      {/* 2. 세로 스플릿 영역 (위아래) */}
      <div className="group/split relative flex flex-col w-full flex-1 pt-14 pb-4 sm:pb-6 px-4 sm:px-6 gap-3 sm:gap-4">
        {/* === Row 1: 최고점자 (예: 낙관) === */}
        <button 
          onClick={() => onCardClick(entry, false, color)}
          className="group relative flex flex-row items-center p-4 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/5 transition-[border-color,background-color,box-shadow,transform] duration-200 hover:bg-white/[0.06] hover:border-white/20 hover:shadow-[0_0_20px_rgba(var(--axis-color-rgb),0.3)] hover:duration-500 overflow-hidden opacity-100 group-hover/split:opacity-40 hover:!opacity-100 group-hover/split:grayscale hover:!grayscale-0 text-left"
          style={{ backgroundImage: `linear-gradient(135deg, ${color}0a, transparent)` }}
        >
          {/* Subtle Accent Glow */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ background: `radial-gradient(circle at 10% 50%, ${color}40, transparent 70%)` }} />
          
          {/* 아바타 (좌측) */}
          <div className="relative z-10 shrink-0 mr-4 sm:mr-6">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(var(--axis-color-rgb),0.3)]">
                <div className="absolute inset-0 rounded-full border border-white/10 group-hover:border-white/50 transition-colors z-20" />
                <div className="absolute inset-[2px] rounded-full overflow-hidden z-10 bg-[#161616]">
                  {entry.celeb.avatar_url ? (
                     <Image src={entry.celeb.avatar_url} alt={highName} fill sizes="80px" className="object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-2xl font-serif text-text-tertiary">
                       {highName.charAt(0)}
                     </div>
                   )}
                </div>
            </div>
          </div>
          
          {/* 텍스트 (좌측 정렬) */}
          <div className="relative z-10 flex flex-col flex-1 min-w-0">
             <div className="flex items-center gap-2 mb-1.5">
                <span className="px-2.5 py-1 rounded bg-black/40 border border-white/10 text-[11px] sm:text-xs font-bold tracking-widest uppercase truncate shadow-sm" style={{ color }}>{sides[0]}</span>
                <div className="flex items-baseline gap-0.5" style={{ color }}>
                  <span className="text-sm sm:text-base font-black tabular-nums">{entry.score}</span>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase opacity-60">pts</span>
                </div>
             </div>
             <h3 className="text-lg sm:text-xxl md:text-2xl font-black text-text-primary mb-1.5 truncate transition-colors drop-shadow-md">
               {highName}
             </h3>
             {entry.reason && (
               <div className="pl-3 border-l-2 mt-1" style={{ borderColor: `${color}40` }}>
                 <p className="text-[15px] sm:text-[17px] font-medium text-white leading-relaxed line-clamp-3" title={isEn ? entry.reason.en : entry.reason.ko}>
                   {isEn ? entry.reason.en : entry.reason.ko}
                 </p>
               </div>
             )}
          </div>
        </button>

        {/* === Row 2: 중앙 HR 및 VS 뱃지 === */}
        <div className="w-full relative flex items-center justify-center pointer-events-none py-1 sm:py-2">
          <div className="absolute left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          <div className="relative w-8 h-8 sm:w-10 sm:h-10 bg-[#0a0a0b] rounded-full border border-white/15 shadow-2xl flex items-center justify-center backdrop-blur-md z-30">
             <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-text-secondary uppercase">VS</span>
           </div>
        </div>

        {/* === Row 3: 최저점자 (예: 비관) === */}
        <button 
          onClick={() => onCardClick(entry, true, color)}
          className="group relative flex flex-row-reverse items-center p-4 sm:p-6 rounded-2xl bg-white/[0.02] border border-white/5 transition-[border-color,background-color,box-shadow,transform] duration-200 hover:bg-white/[0.06] hover:border-white/20 hover:shadow-[0_0_20px_rgba(var(--axis-color-rgb),0.3)] hover:duration-500 overflow-hidden opacity-100 group-hover/split:opacity-40 hover:!opacity-100 group-hover/split:grayscale hover:!grayscale-0 text-left"
          style={{ backgroundImage: `linear-gradient(-135deg, ${color}0a, transparent)` }}
        >
          {/* Subtle Accent Glow */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" style={{ background: `radial-gradient(circle at 90% 50%, ${color}40, transparent 70%)` }} />
          
          {/* 아바타 (우측) */}
          <div className="relative z-10 shrink-0 ml-4 sm:ml-6">
            <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-2xl transition-transform duration-500 group-hover:scale-105 group-hover:shadow-[0_0_20px_rgba(var(--axis-color-rgb),0.3)]">
                <div className="absolute inset-0 rounded-full border border-white/10 group-hover:border-white/50 transition-colors z-20" />
                <div className="absolute inset-[2px] rounded-full overflow-hidden z-10 bg-[#161616]">
                  {entry.opposing.celeb.avatar_url ? (
                     <Image src={entry.opposing.celeb.avatar_url} alt={lowName} fill sizes="80px" className="object-cover" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-2xl font-serif text-text-tertiary">
                       {lowName.charAt(0)}
                     </div>
                   )}
                </div>
            </div>
          </div>
          
          {/* 텍스트 (우측 정렬) */}
          <div className="relative z-10 flex flex-col flex-1 min-w-0 text-right items-end">
             <div className="flex items-center justify-end gap-2 mb-1.5">
                <div className="flex items-baseline gap-0.5" style={{ color }}>
                  <span className="text-sm sm:text-base font-black tabular-nums">{entry.opposing.score}</span>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase opacity-60">pts</span>
                </div>
                <span className="px-2.5 py-1 rounded bg-black/40 border border-white/10 text-[11px] sm:text-xs font-bold tracking-widest uppercase truncate shadow-sm" style={{ color }}>{sides[1] ?? 'Opposite'}</span>
             </div>
             <h3 className="text-lg sm:text-xxl md:text-2xl font-black text-text-primary mb-1.5 truncate transition-colors drop-shadow-md">
               {lowName}
             </h3>
             {entry.opposing.reason && (
               <div className="pr-3 border-r-2 mt-1" style={{ borderColor: `${color}40` }}>
                 <p className="text-[15px] sm:text-[17px] font-medium text-white leading-relaxed line-clamp-3" title={isEn ? entry.opposing.reason.en : entry.opposing.reason.ko}>
                   {isEn ? entry.opposing.reason.en : entry.opposing.reason.ko}
                 </p>
               </div>
             )}
          </div>
        </button>
      </div>
    </div>
  );
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

      {/* 2x2 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-[1080px] mx-auto">
        {currentEntries.map((entry) => {
          const color = AXIS_COLORS[entry.axis] ?? "#d4af37";

          // 성향 탭(Dispositions)이고 양쪽 극단이 존재하는 경우 대칭 카드 렌더링
          if (entry.opposing) {
            return <DispositionsOpposingCard key={entry.axis} entry={entry} locale={locale} color={color} onCardClick={(e, isOp, c) => setSelectedCard({ entry: e, isOpposing: isOp, color: c })} />;
          }

          const shortLabelObj = AXIS_SHORT_LABELS[entry.axis];
          const label = shortLabelObj
            ? (locale === "en" ? shortLabelObj.en : shortLabelObj.ko)
            : (locale === "en" ? entry.label.en : entry.label.ko);

          const name =
            locale === "en" && entry.celeb.nickname_en
              ? entry.celeb.nickname_en
              : entry.celeb.nickname;
          const reason =
            locale === "en" ? entry.reason.en : entry.reason.ko;

          return (
            <button
              key={entry.axis}
              onClick={() => setSelectedCard({ entry, isOpposing: false, color })}
              className="group relative flex flex-row items-center bg-bg-card/40 hover:bg-bg-card/80 border border-white/5 hover:border-white/20 rounded-2xl overflow-hidden transition-[border-color,background-color,box-shadow,transform] duration-200 hover:duration-500 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(var(--axis-color-rgb),0.25)] text-left max-w-[520px] mx-auto"
              style={{
                // hover 시 축 컬러 테두리 변수 활용 (rgba로 변환 필요할 수 있으나 shadow는 커스텀 구현 확인)
                // Tailwind에서 rgb 변수 처리용 스네이크케이스 rgba(var(...)) 지원
                ["--axis-color" as string]: color,
              }}
            >
              {/* 좌측: 인물 이미지 (정사각 고정 — 300x300 원본 선명도 유지) */}
              <div className="shrink-0 p-3 sm:p-4">
                <div className="relative w-[96px] h-[96px] sm:w-[128px] sm:h-[128px] rounded-xl overflow-hidden bg-black border border-white/5 shadow-lg">
                  {entry.celeb.avatar_url ? (
                    <Image
                      src={entry.celeb.avatar_url}
                      alt={name}
                      fill
                      sizes="110px"
                      className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl font-serif text-text-tertiary bg-white/5">
                      {name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>

              {/* 우측: 컨텐츠 */}
              <div className="relative flex flex-col flex-1 p-3 sm:p-5 md:p-6 min-w-0">
                {/* 배경 글로우 — 축 컬러 */}
                <div
                  className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 opacity-0 group-hover:opacity-30 transition-opacity duration-700 pointer-events-none"
                  style={{ backgroundColor: color }}
                />

                {/* 헤더: 라벨, 이름 & 점수 패널 */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4 mb-2 sm:mb-3 relative z-10 w-full">
                  <div className="flex flex-col min-w-0 flex-1 pt-0.5 sm:pt-1">
                    <div className="flex items-center mb-1 sm:mb-1.5">
                       <span
                         className="px-1.5 sm:px-2 py-0.5 rounded-sm text-[9px] sm:text-[11px] font-black uppercase tracking-wider border shadow-sm"
                         style={{
                           backgroundColor: `${color}15`,
                           borderColor: `${color}30`,
                           color,
                         }}
                       >
                         {label}
                       </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-0.5 sm:mb-1">
                      <h3 className="text-[15px] leading-snug sm:text-xl md:text-2xl font-black text-text-primary truncate">
                        {name}
                      </h3>
                      {/* 모바일: 점수 인라인 */}
                      <div className="flex sm:hidden items-baseline gap-0.5 shrink-0" style={{ color }}>
                        <span className="text-base font-black tabular-nums leading-none tracking-tighter">{entry.score}</span>
                        <span className="text-[8px] font-bold uppercase opacity-70">pts</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 점수 & 백분위 우측 상단 고정 (sm 이상에서만) */}
                  <div className="hidden sm:flex flex-col items-end shrink-0 bg-black/20 p-2 sm:p-3 rounded-lg sm:rounded-xl border border-white/5 shadow-inner backdrop-blur-sm">
                    <div className="flex items-baseline gap-0.5" style={{ color }}>
                      <span className="text-2xl md:text-3xl font-black tabular-nums leading-none tracking-tighter">
                        {entry.score}
                      </span>
                      <span className="text-xs font-bold uppercase opacity-70 ml-0.5">
                        pts
                      </span>
                    </div>
                  </div>
                </div>

                {/* 채점 사유 */}
                {reason && (
                  <p className="relative z-10 text-[13px] sm:text-[15px] md:text-[16px] text-white/80 sm:text-white/90 leading-snug sm:leading-relaxed overflow-hidden text-ellipsis mb-2 sm:mb-4 pr-1 sm:pr-2 line-clamp-2 md:line-clamp-3">
                    {reason}
                  </p>
                )}

                <div className="flex-1" />

                {/* 차순위 — 확대 */}
                {entry.runnersUp.length > 0 && (
                  <div className="relative z-10 pt-2 sm:pt-3 md:pt-4 border-t border-white/5 flex flex-col gap-1.5 sm:gap-2.5">
                    <span className="hidden sm:block text-[10px] font-bold tracking-widest uppercase text-text-tertiary/60">
                      {locale === "en" ? "Runners-up" : "차순위"}
                    </span>
                    <div className="flex flex-col gap-1 sm:gap-2">
                      {entry.runnersUp.slice(0, 1).map((r, i) => { // 모바일 공간 제약으로 1위 차순위만 표시될 수도 있으나 유지
                        const rName =
                          locale === "en" && r.nickname_en
                            ? r.nickname_en
                            : r.nickname;
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-2 sm:gap-2.5 group/runner hover:bg-white/5 p-1 -m-1 rounded-lg transition-colors outline-none"
                          >
                            <div className="relative w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden ring-1 ring-white/10 shrink-0 shadow-sm group-hover/runner:ring-white/20 transition-all">
                              {r.avatar_url ? (
                                <Image
                                  src={r.avatar_url}
                                  alt=""
                                  fill
                                  sizes="32px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-white/10" />
                              )}
                            </div>
                            <span className="text-xs sm:text-sm font-medium text-text-secondary group-hover/runner:text-text-primary transition-colors truncate flex-1">
                              {rName}
                            </span>
                            <span
                              className="text-xs sm:text-sm font-bold tabular-nums shrink-0 group-hover/runner:scale-105 transition-transform"
                              style={{ color: `${color}99` }}
                            >
                              {r.score}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </button>
          );
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
