"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { GraduationCap, BookOpen, Music, ChevronRight } from "lucide-react";

interface AcademyPreviewProps {
  isSignedIn?: boolean;
}

export default function AcademyPreview({ isSignedIn }: AcademyPreviewProps) {
  const t = useTranslations("scriptures.hub");

  return (
    <Link href="/scriptures/academy" className="block w-full group">
      <div className="relative overflow-hidden rounded-3xl bg-neutral-900 border border-white/10 hover:border-blue-500/40 transition-all duration-700 shadow-2xl">
        {/* 배경 */}
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-800/80 via-neutral-900 to-[#0a1128] z-0 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15),transparent_60%)] opacity-50 group-hover:opacity-100 transition-opacity duration-1000 z-0 pointer-events-none" />
        <div className="absolute left-0 top-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000 z-10" />
        <div className="absolute inset-0 opacity-[0.03] bg-[url('/noise.png')] mix-blend-overlay z-0 pointer-events-none" />

        <div className="relative z-10 p-8 sm:p-12 flex flex-col items-center text-center space-y-6">
          {/* 아이콘 */}
          <div className="p-5 rounded-2xl bg-blue-500/10 text-blue-400 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all duration-700 shadow-[0_0_40px_rgba(59,130,246,0.2)] group-hover:shadow-[0_0_60px_rgba(59,130,246,0.4)] backdrop-blur-sm border border-blue-500/20">
            <GraduationCap size={36} strokeWidth={1.5} />
          </div>

          {/* 제목 + 설명 */}
          <div className="space-y-3 max-w-xl">
            <h3 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-100 group-hover:to-blue-200 transition-colors duration-700 tracking-tight">
              {t("academyTitle")}
            </h3>
            <p className="text-text-secondary/90 text-sm sm:text-base leading-relaxed break-keep font-medium">
              {t("academy")}
            </p>
          </div>

          {/* 커리큘럼 태그 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 group-hover:border-blue-500/20 group-hover:bg-blue-500/5 transition-all duration-500">
              <BookOpen size={16} className="text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
              <span className="text-sm font-bold text-white/90">{t("academyReading")}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 group-hover:border-amber-500/20 group-hover:bg-amber-500/5 transition-all duration-500">
              <Music size={16} className="text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
              <span className="text-sm font-bold text-white/90">{t("academyMusic")}</span>
            </div>
          </div>

          {/* CTA */}
          <div className="pt-2">
            <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)] group-hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all duration-300 transform group-hover:scale-105">
              {isSignedIn ? t("continueLearning") : t("exploreAcademy")}
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}
