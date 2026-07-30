"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Users } from "lucide-react";
import { PROFESSION_ICONS, PROFESSION_COLORS } from "@/constants/professionIcons";

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

/** 직군 색상 → 테마 매핑 (PROFESSION_COLORS의 text-xxx-400 → bg/glow 세트) */
const COLOR_THEME: Record<string, { bg: string; glow: string; topBar: string; hoverBorder: string }> = {
  "text-yellow-400":  { bg: "bg-yellow-500/10",  glow: "from-yellow-500/[0.06]",  topBar: "from-yellow-600/80 via-yellow-400/60 to-yellow-600/80",  hoverBorder: "hover:border-yellow-400/30" },
  "text-blue-400":    { bg: "bg-blue-500/10",    glow: "from-blue-500/[0.06]",    topBar: "from-blue-600/80 via-blue-400/60 to-blue-600/80",    hoverBorder: "hover:border-blue-400/30" },
  "text-red-400":     { bg: "bg-red-500/10",     glow: "from-red-500/[0.06]",     topBar: "from-red-600/80 via-red-400/60 to-red-600/80",     hoverBorder: "hover:border-red-400/30" },
  "text-emerald-400": { bg: "bg-emerald-500/10", glow: "from-emerald-500/[0.06]", topBar: "from-emerald-600/80 via-emerald-400/60 to-emerald-600/80", hoverBorder: "hover:border-emerald-400/30" },
  "text-green-400":   { bg: "bg-green-500/10",   glow: "from-green-500/[0.06]",   topBar: "from-green-600/80 via-green-400/60 to-green-600/80",   hoverBorder: "hover:border-green-400/30" },
  "text-cyan-400":    { bg: "bg-cyan-500/10",    glow: "from-cyan-500/[0.06]",    topBar: "from-cyan-600/80 via-cyan-400/60 to-cyan-600/80",    hoverBorder: "hover:border-cyan-400/30" },
  "text-amber-300":   { bg: "bg-amber-500/10",   glow: "from-amber-500/[0.06]",   topBar: "from-amber-600/80 via-amber-400/60 to-amber-600/80",   hoverBorder: "hover:border-amber-400/30" },
  "text-indigo-400":  { bg: "bg-indigo-500/10",  glow: "from-indigo-500/[0.06]",  topBar: "from-indigo-600/80 via-indigo-400/60 to-indigo-600/80",  hoverBorder: "hover:border-indigo-400/30" },
  "text-purple-400":  { bg: "bg-purple-500/10",  glow: "from-purple-500/[0.06]",  topBar: "from-purple-600/80 via-purple-400/60 to-purple-600/80",  hoverBorder: "hover:border-purple-400/30" },
  "text-pink-400":    { bg: "bg-pink-500/10",    glow: "from-pink-500/[0.06]",    topBar: "from-pink-600/80 via-pink-400/60 to-pink-600/80",    hoverBorder: "hover:border-pink-400/30" },
  "text-orange-400":  { bg: "bg-orange-500/10",  glow: "from-orange-500/[0.06]",  topBar: "from-orange-600/80 via-orange-400/60 to-orange-600/80",  hoverBorder: "hover:border-orange-400/30" },
  "text-stone-400":   { bg: "bg-stone-500/10",   glow: "from-stone-500/[0.06]",   topBar: "from-stone-600/80 via-stone-400/60 to-stone-600/80",   hoverBorder: "hover:border-stone-400/30" },
  "text-rose-400":    { bg: "bg-rose-500/10",    glow: "from-rose-500/[0.06]",    topBar: "from-rose-600/80 via-rose-400/60 to-rose-600/80",    hoverBorder: "hover:border-rose-400/30" },
  "text-fuchsia-400": { bg: "bg-fuchsia-500/10", glow: "from-fuchsia-500/[0.06]", topBar: "from-fuchsia-600/80 via-fuchsia-400/60 to-fuchsia-600/80", hoverBorder: "hover:border-fuchsia-400/30" },
  "text-sky-400":     { bg: "bg-sky-500/10",     glow: "from-sky-500/[0.06]",     topBar: "from-sky-600/80 via-sky-400/60 to-sky-600/80",     hoverBorder: "hover:border-sky-400/30" },
};

const defaultTheme = { bg: "bg-white/5", glow: "from-white/[0.03]", topBar: "from-white/20 via-white/10 to-white/20", hoverBorder: "hover:border-white/20" };

function getTheme(profession: string) {
  const colorClass = PROFESSION_COLORS[profession] ?? "";
  return COLOR_THEME[colorClass] ?? defaultTheme;
}

export default function ProfessionPreview({ professionCounts, contentSamples }: ProfessionPreviewProps) {
  const tp = useTranslations("profession");
  const locale = useLocale();

  const sorted = [...professionCounts].sort((a, b) => b.count - a.count);
  if (sorted.length === 0) return null;

  // 모바일 2×2=4개, md 이상 3×3=9개
  const mobileLimit = 4;
  const desktopLimit = 9;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
      {sorted.map((p, idx) => {
        // 모바일: 4개 초과 숨김, 데스크탑: 9개 초과 숨김
        const visibilityClass = idx >= desktopLimit
          ? "hidden"
          : idx >= mobileLimit
            ? "hidden md:block"
            : "";
        const Icon = PROFESSION_ICONS[p.profession];
        const colorClass = PROFESSION_COLORS[p.profession] ?? "text-white/50";
        const theme = getTheme(p.profession);
        const title = tp(p.profession);
        const samples = contentSamples?.[p.profession];

        return (
          <Link
            key={p.profession}
            href={`/library/profession?p=${p.profession}`}
            className={`${visibilityClass} group relative overflow-hidden rounded-2xl bg-[#111113]/90 backdrop-blur-xl border border-white/[0.06] ${theme.hoverBorder} transition-all duration-500 flex flex-col`}
          >
            {/* 상단 악센트 바 */}
            <div className={`h-[2px] w-full bg-gradient-to-r ${theme.topBar} opacity-60 group-hover:opacity-100 transition-opacity duration-700`} />

            {/* 배경 글로우 */}
            <div className={`absolute inset-0 bg-gradient-to-b ${theme.glow} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />

            {/* 1행: 아이콘 + 직군명 + 인원 */}
            <div className="relative z-10 px-3 pt-3 md:px-4 md:pt-3.5 flex items-center gap-2">
              <div className={`w-7 h-7 rounded-lg ${theme.bg} group-hover:scale-110 flex items-center justify-center transition-transform duration-500 flex-shrink-0`}>
                {Icon && <Icon size={14} className={colorClass} strokeWidth={1.8} />}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs md:text-sm font-bold text-text-secondary group-hover:text-white transition-colors leading-tight truncate">
                  {title}
                </h4>
                <div className="flex items-center gap-1 mt-0.5">
                  <Users size={10} className={`${colorClass} opacity-60`} />
                  <span className="text-[10px] font-semibold tabular-nums">
                    {p.count}{locale === "ko" ? "명" : ""}
                  </span>
                </div>
              </div>
            </div>

            {/* 2행: 대표작 썸네일 */}
            <div className="relative z-10 px-3 pb-3 pt-2 md:px-4 md:pb-3.5 flex items-end gap-1.5 flex-1 w-full">
              {samples && samples.length > 0 ? (
                samples.slice(0, 3).map((c) => (
                  <div key={c.id} className="flex-1 aspect-[2/3] rounded-lg overflow-hidden bg-white/5 border border-white/[0.08]">
                    {c.thumbnail_url ? (
                      <img src={c.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full" />
                    )}
                  </div>
                ))
              ) : (
                <div className="flex-1 aspect-[2/3]" />
              )}
            </div>

          </Link>
        );
      })}
    </div>
  );
}
