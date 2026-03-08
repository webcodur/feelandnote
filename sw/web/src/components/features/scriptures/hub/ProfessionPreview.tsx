"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Briefcase, GraduationCap, Microscope, Palette, Music, BookOpen } from "lucide-react";

interface ProfessionCount {
  profession: string;
  count: number;
}

interface ProfessionPreviewProps {
  professionCounts: ProfessionCount[];
}

const getIconForProfession = (profession: string) => {
  switch (profession) {
    case 'entrepreneur':
    case 'business':
      return <Briefcase className="w-6 h-6" />;
    case 'scientist':
    case 'inventor':
      return <Microscope className="w-6 h-6" />;
    case 'artist':
    case 'director':
      return <Palette className="w-6 h-6" />;
    case 'musician':
      return <Music className="w-6 h-6" />;
    case 'writer':
    case 'philosopher':
      return <BookOpen className="w-6 h-6" />;
    default:
      return <GraduationCap className="w-6 h-6" />;
  }
};

export default function ProfessionPreview({ professionCounts }: ProfessionPreviewProps) {
  const tp = useTranslations("profession");

  // 상위 6개만 표시 또는 랜덤/주요 직군 고정 표시
  // 여기서는 count 기준 상위 6개
  const topProfessions = [...professionCounts]
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  if (topProfessions.length === 0) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
      {topProfessions.map((p, index) => {
        const title = tp(p.profession as any);
        // Slightly delay animations per index
        const delayClass = `delay-[${index * 50}ms]`;

        return (
          <Link
            key={p.profession}
            href={`/scriptures/profession?p=${p.profession}`}
            className="group relative overflow-hidden rounded-2xl bg-[#161616]/80 backdrop-blur-xl border border-white/5 hover:bg-[#1a1a1a] hover:border-accent/40 hover:shadow-[0_0_30px_rgba(212,175,55,0.05)] transition-all duration-500 p-5 md:p-6 flex flex-col items-start gap-5 min-h-[140px]"
          >
            {/* Background Icon (Decorative) */}
            <div className={`absolute -right-6 -bottom-6 opacity-[0.02] group-hover:opacity-[0.06] transition-all duration-700 ease-out scale-[2] transform group-hover:scale-[2.5] group-hover:-rotate-12 ${delayClass} pointer-events-none`}>
              {getIconForProfession(p.profession)}
            </div>
            
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

            <div className="flex items-center justify-between w-full">
              <div className="p-2.5 rounded-xl bg-white/5 group-hover:bg-accent/10 group-hover:text-accent/90 text-text-tertiary transition-colors duration-500 shadow-inner">
                {getIconForProfession(p.profession)}
              </div>
              
              <div className="w-8 h-8 rounded-full border border-white/5 flex items-center justify-center group-hover:bg-accent/10 group-hover:border-accent/20 transition-all duration-300">
                <ArrowRight size={14} className="text-text-tertiary group-hover:text-accent group-hover:-rotate-45 transition-all duration-300" />
              </div>
            </div>

            <div className="mt-auto z-10">
              <h3 className="text-base md:text-lg font-bold text-text-secondary group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-accent/80 transition-all duration-500 tracking-tight">
                {title}
              </h3>
              <p className="text-xs text-text-tertiary/70 mt-1 font-semibold flex items-center gap-1.5 uppercase tracking-wider">
                <span className="text-text-tertiary">{p.count}</span> works
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
