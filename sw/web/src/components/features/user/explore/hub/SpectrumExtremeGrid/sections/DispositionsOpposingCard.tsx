/*
  파일명: /components/features/user/explore/hub/SpectrumExtremeGrid/sections/DispositionsOpposingCard.tsx
  기능: 성향 탭(Dispositions) 전용 대칭 카드 (공간 최적화 가로형)
  책임: 양극단 최고점자 VS 최저점자 세로 스플릿 표시, 클릭 시 퀵뷰 호출.
*/ // ------------------------------

"use client";

import Image from "next/image";
import BlurDissolve from "@/components/ui/BlurDissolve";
import type { SpectrumExtremeEntry } from "@/actions/home/getSpectrumExtremes";

export default function DispositionsOpposingCard({ entry, locale, color, onCardClick }: { entry: SpectrumExtremeEntry; locale: string; color: string; onCardClick: (entry: SpectrumExtremeEntry, isOpposing: boolean, color: string) => void }) {
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
                     <BlurDissolve className="absolute inset-0">
                       <Image src={entry.celeb.avatar_url} alt={highName} fill sizes="80px" className="object-cover" />
                     </BlurDissolve>
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-2xl font-serif">
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
                     <BlurDissolve className="absolute inset-0">
                       <Image src={entry.opposing.celeb.avatar_url} alt={lowName} fill sizes="80px" className="object-cover" />
                     </BlurDissolve>
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-2xl font-serif">
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
