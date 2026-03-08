"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Scroll, Sparkles } from "lucide-react";

export default function MuseumPreview() {
  const t = useTranslations("scriptures.hub");

  return (
    <Link href="/scriptures/museum" className="block w-full group">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#1c1814] to-[#120f0c] border border-[#d4af37]/20 hover:border-[#d4af37]/50 transition-all duration-700 shadow-2xl">
        {/* 프리미엄 장식 배경 */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.4),transparent_70%)] blur-[80px] rounded-full group-hover:scale-125 transition-transform duration-1000" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.15),transparent_70%)] blur-[80px] rounded-full group-hover:scale-125 transition-transform duration-1000" />
        </div>
        
        {/* 상단 빛 효과 */}
        <div className="absolute left-0 top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
        
        {/* 텍스처 오버레이 */}
        <div className="absolute inset-0 opacity-[0.05] bg-[url('/noise.png')] mix-blend-overlay pointer-events-none" />

        <div className="relative z-10 p-8 sm:p-12 flex flex-col md:flex-row items-center md:items-start md:justify-between gap-10">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#d4af37]/15 text-[#d4af37] text-xs font-bold tracking-widest border border-[#d4af37]/30 mb-5 shadow-[0_0_15px_rgba(212,175,55,0.15)] group-hover:shadow-[0_0_25px_rgba(212,175,55,0.3)] transition-all">
              <Scroll size={14} className="opacity-90" />
              <span>TIMELINE</span>
            </div>
            
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-br from-[#fdfbf7] via-[#f5ebd8] to-[#d4af37] mb-4 group-hover:to-[#f5ebd8] transition-all duration-700 tracking-tight">
              {t("museumTitle")}
            </h3>
            
            <p className="text-sm md:text-base text-[#e8dcc4]/80 max-w-xl leading-relaxed font-medium">
              {t("museum")}
            </p>
            
            <div className="mt-8 inline-flex flex-col items-center md:items-start">
              <div className="inline-flex items-center gap-2 text-sm font-bold text-black px-6 py-3 rounded-xl bg-gradient-to-r from-[#d4af37] to-[#e6c65c] shadow-[0_0_20px_rgba(212,175,55,0.3)] group-hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] group-hover:scale-105 transition-all duration-300 transform">
                {t("enterMuseum")} <Sparkles size={16} />
              </div>
            </div>
          </div>

          <div className="shrink-0 w-full max-w-[240px] aspect-[4/3] rounded-2xl border border-[#d4af37]/20 bg-black/60 shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative overflow-hidden group-hover:-translate-y-2 group-hover:rotate-2 transition-all duration-700 hidden sm:block backdrop-blur-md">
            {/* 박물관 타임라인 미니어처 같은 장식 */}
            <div className="absolute inset-0 p-5 flex flex-col justify-end gap-4 opacity-50 group-hover:opacity-100 transition-opacity duration-700 z-10">
               <div className="flex justify-between items-end">
                 <div className="w-1.5 h-16 rounded-t-full bg-gradient-to-t from-[#d4af37] to-transparent opacity-80" />
                 <div className="w-1.5 h-10 rounded-t-full bg-[#d4af37]/40" />
                 <div className="w-1.5 h-20 rounded-t-full bg-gradient-to-t from-[#d4af37] to-transparent" />
                 <div className="w-1.5 h-12 rounded-t-full bg-[#d4af37]/30" />
                 <div className="w-1.5 h-24 rounded-t-full bg-[#d4af37]/80 shadow-[0_0_15px_rgba(212,175,55,0.5)]" />
                 <div className="w-1.5 h-8 rounded-t-full bg-[#d4af37]/20" />
               </div>
               <div className="w-full h-1 rounded-full bg-gradient-to-r from-transparent via-[#d4af37] to-transparent opacity-50" />
            </div>
            
            <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.1),transparent_50%)]" />
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#120f0c] via-[#120f0c]/80 to-transparent z-0" />
          </div>
        </div>
      </div>
    </Link>
  );
}
