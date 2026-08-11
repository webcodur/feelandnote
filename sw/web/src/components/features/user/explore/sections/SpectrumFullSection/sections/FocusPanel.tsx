/*
  파일명: /components/features/user/explore/sections/SpectrumFullSection/sections/FocusPanel.tsx
  기능: 포커스 패널
  책임: 선택된 인물의 점수·기록·스탯 + 프로필 링크 표시.
*/ // ------------------------------

"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { SpectrumStatsWithReasons } from "@/lib/spectrum/types";
import SpectrumStatPanel from "@/components/shared/SpectrumStatPanel";
import Avatar from "../Avatar";
import { getName, celebHref } from "../utils";
import type { FocusedCeleb } from "../types";
import { useTranslations } from "next-intl";

export default function FocusPanel({
  celeb, score, reason, color, locale, label, stats
}: {
  celeb: FocusedCeleb;
  score: number;
  reason?: string;
  color: string;
  locale: string;
  label?: string;
  stats?: SpectrumStatsWithReasons;
}) {
  const t = useTranslations("explore.ui.spectrumDistribution");
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
             {t("assessment")}
           </div>
           {reason}
         </div>
       )}

       {stats && (
         <div className="w-full mb-8 text-left bg-black/40 rounded-2xl border border-white/5 overflow-hidden">
           <SpectrumStatPanel stats={stats} />
         </div>
       )}

       {!reason && !stats && (
         <div className="flex-1" />
       )}

       <Link href={celebHref(celeb)} className={cn("mt-auto w-full py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all", "bg-white text-black hover:bg-white/90 hover:scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.2)]")}>
         {t("viewProfile")}
       </Link>
    </div>
  )
}
