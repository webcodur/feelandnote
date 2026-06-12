/*
  파일명: /components/features/user/explore/sections/PersonaFullSection.tsx
  기능: 비범한 기록가 전체 보기
  책임: persona 4그룹 탭 전환 + 축 네비게이션 + 1개 카드 및 포커스 패널 표시.
*/ // ------------------------------

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { PersonaExtremeEntry } from "@/actions/home/getPersonaExtremes";
import type { PersonaStatsWithReasons } from "@/lib/persona/types";
import PersonaStatPanel from "@/components/shared/PersonaStatPanel";

// #region 상수
const GROUPS = [
  { keys: ["temperance", "diligence", "reflection", "courage"], ko: "내적 덕목", en: "Inner Virtues" },
  { keys: ["loyalty", "benevolence", "fairness", "humility"], ko: "외적 덕목", en: "Outer Virtues" },
  { keys: ["command", "martial", "intellect", "charm"], ko: "능력", en: "Abilities" },
  { keys: ["pessimism_optimism", "conservative_progressive", "individual_social", "cautious_bold"], ko: "성향", en: "Dispositions" },
] as const;

const AXIS_COLORS: Record<string, string> = {
  temperance: "#7eb8da", diligence: "#e8a838", reflection: "#a78bfa", courage: "#ef5350",
  loyalty: "#f06292", benevolence: "#66bb6a", fairness: "#4fc3f7", humility: "#b0bec5",
  command: "#ff7043", martial: "#d32f2f", intellect: "#42a5f5", charm: "#ec407a",
  pessimism_optimism: "#fdd835", conservative_progressive: "#26c6da", individual_social: "#ab47bc", cautious_bold: "#ff9800",
};

const AXIS_SHORT_LABELS: Record<string, { ko: string; en: string }> = {
  temperance: { ko: "절제", en: "Temperance" },
  diligence: { ko: "근면", en: "Diligence" },
  reflection: { ko: "성찰", en: "Reflection" },
  courage: { ko: "용기", en: "Courage" },
  loyalty: { ko: "충의", en: "Loyalty" },
  benevolence: { ko: "자비", en: "Benevolence" },
  fairness: { ko: "공정", en: "Fairness" },
  humility: { ko: "겸양", en: "Humility" },
  command: { ko: "통솔", en: "Command" },
  martial: { ko: "무력", en: "Martial" },
  intellect: { ko: "지략", en: "Intellect" },
  charm: { ko: "매력", en: "Charm" },
};
// #endregion

// #region 유틸
function getName(celeb: { nickname: string; nickname_en: string | null }, locale: string) {
  return locale === "en" && celeb.nickname_en ? celeb.nickname_en : celeb.nickname;
}

function celebHref(celeb: { slug: string | null; id: string }) {
  return `/celeb/${celeb.slug || celeb.id}`;
}
// #endregion

// #region 아바타
function Avatar({ src, alt, size = 20 }: { src: string | null; alt: string; size?: number }) {
  const sizeClass = size === 32 ? "w-32 h-32" : size === 20 ? "w-20 h-20" : size === 10 ? "w-10 h-10" : "w-8 h-8";
  const textClass = size === 32 ? "text-4xl" : size === 20 ? "text-2xl" : size === 10 ? "text-sm" : "text-xs";

  return (
    <div className={cn("relative rounded-full overflow-hidden bg-[#161616] shrink-0", sizeClass)}>
      {src ? (
        <Image src={src} alt={alt} fill sizes="128px" className="object-cover" />
      ) : (
        <div className={cn("w-full h-full flex items-center justify-center font-serif text-text-tertiary", textClass)}>
          {alt.charAt(0)}
        </div>
      )}
    </div>
  );
}
// #endregion

// #region 포커스 패널
interface FocusedCeleb {
  id: string;
  slug: string | null;
  nickname: string;
  nickname_en: string | null;
  avatar_url: string | null;
  profession?: string | null;
  title?: string | null;
  title_en?: string | null;
}

function FocusPanel({
  celeb, score, reason, color, locale, label, stats
}: {
  celeb: FocusedCeleb;
  score: number;
  reason?: string;
  color: string;
  locale: string;
  label?: string;
  stats?: PersonaStatsWithReasons;
}) {
  const name = getName(celeb, locale);
  const title = locale === "en" ? (celeb.title_en || celeb.profession) : (celeb.title || celeb.profession);
  
  return (
    <div className="bg-[#0e0e10] lg:sticky lg:top-8 border border-white/5 rounded-3xl p-8 flex flex-col items-center text-center relative overflow-hidden shadow-2xl h-fit min-h-[500px]" style={{ ["--axis-color" as string]: color }}>
       {/* Background Glow */}
       <div className="absolute inset-x-0 top-0 h-64 opacity-[0.15] pointer-events-none" style={{ background: `linear-gradient(180deg, ${color}, transparent)` }} />
       <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
       
       <div className="relative mt-4 mb-6 ring-4 ring-white/5 rounded-full p-2 bg-[#0a0a0b] shadow-[0_0_30px_rgba(0,0,0,0.5)]">
         <Avatar src={celeb.avatar_url} alt={name} size={32} />
       </div>
       
       {label && (
         <span className="px-3 py-1 mb-4 rounded-full text-[10px] font-black uppercase tracking-widest border" style={{ backgroundColor: `${color}15`, borderColor: `${color}30`, color }}>
           {label}
         </span>
       )}
       
       <h2 className="text-3xl font-black text-white mb-1">{name}</h2>
       {title && <p className="text-white/50 text-sm font-medium mb-6 uppercase tracking-widest">{title}</p>}
       
       <div className="flex flex-col items-center mb-8">
         <div className="flex items-baseline justify-center gap-2 bg-black/40 px-6 py-3 rounded-2xl border border-white/5 shadow-inner">
           <span className="text-5xl font-black tabular-nums tracking-tighter" style={{ color }}>{score}</span>
           <span className="text-xs font-bold uppercase opacity-60 text-white">pts</span>
         </div>
       </div>

       {reason && (
         <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 mb-8 text-left text-white/80 leading-relaxed text-sm w-full shadow-sm relative">
           <div className="absolute top-0 left-6 -translate-y-1/2 bg-[#0e0e10] px-2 text-[10px] font-bold tracking-widest text-white/40 uppercase">
             {locale === "en" ? "Assessment" : "기록"}
           </div>
           {reason}
         </div>
       )}

       {stats && (
         <div className="w-full mb-8 text-left bg-black/40 rounded-2xl border border-white/5 overflow-hidden">
           <PersonaStatPanel stats={stats} />
         </div>
       )}

       {!reason && !stats && (
         <div className="flex-1" />
       )}

       <Link href={celebHref(celeb)} className={cn("mt-auto w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all", "bg-white text-black hover:bg-white/90 hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.2)]")}>
         {locale === "en" ? "View Full Profile" : "전체 프로필 보기"}
       </Link>
    </div>
  )
}
// #endregion

// #region 일반 축 카드 (내면/외면/능력)
function AxisCard({ 
  entry, locale, color, focusedId, onSelect 
}: { 
  entry: PersonaExtremeEntry; locale: string; color: string; 
  focusedId: string; onSelect: (id: string) => void;
}) {
  const label = AXIS_SHORT_LABELS[entry.axis]
    ? (locale === "en" ? AXIS_SHORT_LABELS[entry.axis].en : AXIS_SHORT_LABELS[entry.axis].ko)
    : (locale === "en" ? entry.label.en : entry.label.ko);
  const winnerName = getName(entry.celeb, locale);
  const reason = locale === "en" ? entry.reason.en : entry.reason.ko;
  const isEn = locale === "en";

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
              {isEn ? `Top ${entry.percentile}%` : `상위 ${entry.percentile}%`}
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
            {isEn ? "Runners-up" : "차순위"}
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
// #endregion

// #region 성향 대칭 카드 (Dispositions)
function DispositionCard({ 
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
            <span className="text-[10px] font-bold tracking-widest uppercase text-text-tertiary/50 block mb-1">
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
                    <span className="text-[11px] font-bold text-text-tertiary/50 w-5 text-right tabular-nums shrink-0">{i + 2}</span>
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
// #endregion

// #region 메인 컴포넌트
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
// #endregion
