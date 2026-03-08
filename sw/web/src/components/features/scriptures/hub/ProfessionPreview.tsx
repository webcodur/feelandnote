"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ArrowRight, Briefcase, GraduationCap, Microscope, Palette, Music, BookOpen, Users } from "lucide-react";

interface ProfessionCount {
  profession: string;
  count: number;
}

interface ContentSample {
  id: string;
  title: string;
  thumbnail_url: string | null;
  type: string;
  creator: string | null;
}

interface ProfessionPreviewProps {
  professionCounts: ProfessionCount[];
  contentSamples?: Record<string, ContentSample[]>;
}

const PROFESSION_COLORS: Record<string, { accent: string; bg: string; glow: string }> = {
  entrepreneur: { accent: "text-amber-400", bg: "bg-amber-500/10", glow: "rgba(251,191,36,0.15)" },
  business: { accent: "text-amber-400", bg: "bg-amber-500/10", glow: "rgba(251,191,36,0.15)" },
  scientist: { accent: "text-emerald-400", bg: "bg-emerald-500/10", glow: "rgba(52,211,153,0.15)" },
  inventor: { accent: "text-emerald-400", bg: "bg-emerald-500/10", glow: "rgba(52,211,153,0.15)" },
  artist: { accent: "text-rose-400", bg: "bg-rose-500/10", glow: "rgba(251,113,133,0.15)" },
  director: { accent: "text-rose-400", bg: "bg-rose-500/10", glow: "rgba(251,113,133,0.15)" },
  musician: { accent: "text-violet-400", bg: "bg-violet-500/10", glow: "rgba(167,139,250,0.15)" },
  writer: { accent: "text-sky-400", bg: "bg-sky-500/10", glow: "rgba(56,189,248,0.15)" },
  philosopher: { accent: "text-sky-400", bg: "bg-sky-500/10", glow: "rgba(56,189,248,0.15)" },
};

const getIconForProfession = (profession: string) => {
  switch (profession) {
    case 'entrepreneur':
    case 'business':
      return <Briefcase className="w-5 h-5" />;
    case 'scientist':
    case 'inventor':
      return <Microscope className="w-5 h-5" />;
    case 'artist':
    case 'director':
      return <Palette className="w-5 h-5" />;
    case 'musician':
      return <Music className="w-5 h-5" />;
    case 'writer':
    case 'philosopher':
      return <BookOpen className="w-5 h-5" />;
    default:
      return <GraduationCap className="w-5 h-5" />;
  }
};

const getColors = (profession: string) =>
  PROFESSION_COLORS[profession] ?? { accent: "text-white/70", bg: "bg-white/5", glow: "rgba(255,255,255,0.1)" };

export default function ProfessionPreview({ professionCounts, contentSamples }: ProfessionPreviewProps) {
  const tp = useTranslations("profession");
  const locale = useLocale();

  const topProfessions = [...professionCounts]
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  if (topProfessions.length === 0) return null;

  const maxCount = topProfessions[0]?.count ?? 1;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
      {topProfessions.map((p) => {
        const title = tp(p.profession as any);
        const colors = getColors(p.profession);
        const barWidth = Math.max(20, Math.round((p.count / maxCount) * 100));

        return (
          <Link
            key={p.profession}
            href={`/scriptures/profession?p=${p.profession}`}
            className="group relative overflow-hidden rounded-2xl bg-[#161616]/80 backdrop-blur-xl border border-white/5 hover:bg-[#1a1a1a] hover:border-white/15 hover:shadow-lg transition-all duration-500 p-5 md:p-6 flex flex-col gap-4 min-h-[150px]"
          >
            {/* 배경 글로우 */}
            <div
              className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[60px] pointer-events-none"
              style={{ background: colors.glow }}
            />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

            {/* 아이콘 + 화살표 */}
            <div className="flex items-center justify-between">
              <div className={`p-2.5 rounded-xl ${colors.bg} ${colors.accent} transition-colors duration-500 shadow-inner`}>
                {getIconForProfession(p.profession)}
              </div>
              <div className="w-7 h-7 rounded-full border border-white/5 flex items-center justify-center group-hover:bg-white/5 group-hover:border-white/10 transition-all duration-300">
                <ArrowRight size={13} className="text-text-tertiary group-hover:text-white group-hover:-rotate-45 transition-all duration-300" />
              </div>
            </div>

            {/* 직업명 */}
            <div className="mt-auto space-y-2.5">
              <h3 className="text-base md:text-lg font-bold text-text-secondary group-hover:text-white transition-colors duration-300 tracking-tight">
                {title}
              </h3>

              {/* 대표 콘텐츠 + 인원 수 */}
              <div className="space-y-2">
                {contentSamples?.[p.profession]?.length ? (
                  <div className="flex items-center gap-1.5">
                    {contentSamples[p.profession].map((c) => (
                      <div key={c.id} className="w-8 h-11 rounded-md overflow-hidden bg-white/5 border border-white/10 shadow-sm flex-shrink-0">
                        {c.thumbnail_url && <img src={c.thumbnail_url} alt={c.title} className="w-full h-full object-cover" />}
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="flex items-center gap-1.5">
                  <Users size={12} className="text-text-tertiary/60" />
                  <span className="text-xs font-semibold text-text-tertiary tabular-nums">
                    {p.count}{locale === "ko" ? "명" : ""}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
