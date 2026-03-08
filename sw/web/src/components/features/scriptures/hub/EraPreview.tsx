"use client";

import { Link } from "@/i18n/navigation";
import { Avatar } from "@/components/ui";
import { useLocale, useTranslations } from "next-intl";
import { Landmark, Swords, Telescope, Zap, BookOpen, Users, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface EraCeleb {
  id: string;
  nickname: string;
  avatar_url: string | null;
  title: string | null;
}

interface EraData {
  era: string;
  label: string;
  period: string;
  description: string;
  celebCount: number;
  contentCount: number;
  topCelebs: EraCeleb[];
}

interface EraPreviewProps {
  eras: EraData[];
}

// #region 시대별 테마 설정
interface EraTheme {
  icon: LucideIcon;
  accent: string;       // 악센트 텍스트 색
  accentBg: string;     // 아이콘 배경
  accentBorder: string; // hover 보더
  glowFrom: string;     // 배경 glow 시작색
  topBar: string;       // 상단 그라디언트 바
  iconHoverBg: string;  // hover 시 아이콘 배경
}

const ERA_THEME: Record<string, EraTheme> = {
  ancient: {
    icon: Landmark,
    accent: "text-amber-400",
    accentBg: "bg-amber-500/10",
    accentBorder: "hover:border-amber-400/40",
    glowFrom: "from-amber-500/[0.06]",
    topBar: "from-amber-600/80 via-amber-400/60 to-amber-600/80",
    iconHoverBg: "group-hover:bg-amber-500/20",
  },
  medieval: {
    icon: Swords,
    accent: "text-purple-400",
    accentBg: "bg-purple-500/10",
    accentBorder: "hover:border-purple-400/40",
    glowFrom: "from-purple-500/[0.06]",
    topBar: "from-purple-600/80 via-purple-400/60 to-purple-600/80",
    iconHoverBg: "group-hover:bg-purple-500/20",
  },
  modern: {
    icon: Telescope,
    accent: "text-teal-400",
    accentBg: "bg-teal-500/10",
    accentBorder: "hover:border-teal-400/40",
    glowFrom: "from-teal-500/[0.06]",
    topBar: "from-teal-600/80 via-teal-400/60 to-teal-600/80",
    iconHoverBg: "group-hover:bg-teal-500/20",
  },
  contemporary: {
    icon: Zap,
    accent: "text-sky-400",
    accentBg: "bg-sky-500/10",
    accentBorder: "hover:border-sky-400/40",
    glowFrom: "from-sky-500/[0.06]",
    topBar: "from-sky-600/80 via-sky-400/60 to-sky-600/80",
    iconHoverBg: "group-hover:bg-sky-500/20",
  },
};

const defaultTheme: EraTheme = {
  icon: BookOpen,
  accent: "text-white/60",
  accentBg: "bg-white/5",
  accentBorder: "hover:border-white/20",
  glowFrom: "from-white/[0.03]",
  topBar: "from-white/20 via-white/10 to-white/20",
  iconHoverBg: "group-hover:bg-white/10",
};
// #endregion

export default function EraPreview({ eras }: EraPreviewProps) {
  const locale = useLocale();
  const t = useTranslations("scriptures.hub");

  if (!eras || eras.length === 0) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {eras.map((era) => {
        const theme = ERA_THEME[era.era] ?? defaultTheme;
        const Icon = theme.icon;
        const celebCount = Number(era.celebCount) || 0;
        const contentCount = Number(era.contentCount) || 0;

        return (
          <Link
            key={era.era}
            href={`/scriptures/era?tab=${era.era}`}
            className={`group relative overflow-hidden rounded-2xl bg-[#111113]/90 backdrop-blur-xl border border-white/[0.06] ${theme.accentBorder} transition-all duration-500 flex flex-col`}
          >
            {/* ── 상단 악센트 바 ── */}
            <div className={`h-[2px] w-full bg-gradient-to-r ${theme.topBar} opacity-70 group-hover:opacity-100 transition-opacity duration-700`} />

            {/* ── 배경 글로우 ── */}
            <div className={`absolute inset-0 bg-gradient-to-b ${theme.glowFrom} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />

            {/* ── 콘텐츠 영역 ── */}
            <div className="relative z-10 p-5 md:p-6 flex flex-col gap-3 flex-1">
              {/* 아이콘 + 라벨 */}
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${theme.accentBg} ${theme.iconHoverBg} flex items-center justify-center transition-colors duration-500`}>
                  <Icon size={20} className={theme.accent} strokeWidth={1.8} />
                </div>
                <h4 className="text-lg md:text-xl font-bold text-white tracking-tight">
                  {era.label}
                </h4>
              </div>

              {/* 연대 */}
              <span className="text-xs font-mono text-white/60 tracking-wide font-medium">
                {era.period}
              </span>

              {/* 설명 */}
              <p className="text-sm text-white/70 leading-relaxed line-clamp-2 break-keep min-h-[40px]">
                {era.description}
              </p>

              {/* 하단 통계 + 화살표 */}
              <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/[0.08]">
                <div className="flex items-center gap-3 text-xs font-medium text-white/55">
                  <span className="flex items-center gap-1">
                    <Users size={13} className={theme.accent} style={{ opacity: 0.7 }} />
                    {celebCount}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen size={13} className={theme.accent} style={{ opacity: 0.7 }} />
                    {contentCount}
                  </span>
                </div>
                <ArrowUpRight
                  size={16}
                  className="text-white/20 group-hover:text-white/60 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                />
              </div>

              {/* 대표 인물 아바타 */}
              {era.topCelebs && era.topCelebs.length > 0 && (
                <div className="flex -space-x-2 mt-1">
                  {era.topCelebs.slice(0, 4).map((celeb) => (
                    <Avatar
                      key={celeb.id}
                      url={celeb.avatar_url}
                      name={celeb.nickname}
                      size="sm"
                      className="ring-1 ring-[#111113] opacity-80 group-hover:opacity-100 transition-opacity"
                    />
                  ))}
                  {celebCount > 4 && (
                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <span className="text-[9px] text-white/40">+{celebCount - 4}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
