/*
  파일명: /components/features/user/explore/sections/TimelineSection/sections/CelebTimelineItem.tsx
  기능: 타임라인 인물 행
  책임: 연도+도트 + 셀럽 카드(PC/모바일) + 동시대 인물 패널 토글.
*/ // ------------------------------

"use client";

import { ExternalLink, Clock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { CelebImage, VoiceBadge } from "@/components/ui";
import type { Locale } from "@/types/locale";
import type { TimelineCeleb } from "@/actions/home";
import { getYear, formatYear, formatLifespan } from "../utils";
import ContemporariesPanel from "./ContemporariesPanel";
import { useTranslations } from "next-intl";

interface Props {
  celeb: TimelineCeleb;
  locale: Locale;
  isBioExpanded: boolean;
  isContemporariesShown: boolean;
  onToggleBio: (id: string) => void;
  onToggleContemporaries: (id: string) => void;
  onFireDialogue: (celeb: TimelineCeleb) => void;
  getContemporaries: (celeb: TimelineCeleb) => TimelineCeleb[];
}

export default function CelebTimelineItem({
  celeb,
  locale,
  isBioExpanded,
  isContemporariesShown,
  onToggleBio,
  onToggleContemporaries,
  onFireDialogue,
  getContemporaries,
}: Props) {
  const t = useTranslations("explore.ui.timeline");
  const year = getYear(celeb.birth_date!);
  const displayName =
    locale === "en" && celeb.nickname_en
      ? celeb.nickname_en
      : celeb.nickname;
  const displayTitle =
    locale === "en" && celeb.title_en
      ? celeb.title_en
      : celeb.title;
  const displayBio =
    locale === "en" && celeb.bio_en
      ? celeb.bio_en
      : celeb.bio;

  const hasVoice = celeb.has_voice;

  return (
    <div className="mb-3 md:mb-5 group/item">
      {/* 인물 행 */}
      <div className="flex gap-1.5 md:gap-3">
        {/* 연도 + 도트 */}
        <div className="w-[38px] md:w-[120px] flex items-center justify-end shrink-0 pt-3 md:pt-2.5">
          <span className="text-[10px] md:text-sm text-text-primary/80 font-mono mr-1 md:mr-2">
            {formatYear(year)}
          </span>
          <div className={`w-2 h-2 md:w-3 md:h-3 rounded-full shrink-0 transition-colors z-10 ${
            hasVoice
              ? "bg-emerald-500/30 border-[1.5px] md:border-2 border-emerald-400/60"
              : "bg-bg-card border-[1.5px] md:border-2 border-accent/40"
          }`} />
        </div>

        {/* 셀럽 카드 */}
        <div className="flex-1 min-w-0 py-1.5 md:p-2.5">
          {/* === PC 레이아웃 === */}
          <div className="hidden md:flex items-start gap-3">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => onFireDialogue(celeb)}
                className={`block w-14 h-14 rounded-full overflow-hidden border hover:scale-105 transition-all cursor-pointer ${
                  hasVoice ? "border-emerald-400/40 hover:border-emerald-400/70" : "border-white/10 hover:border-accent/50"
                }`}
              >
                <CelebImage src={celeb.avatar_url} alt={displayName} shape="circle" sizes="56px" maxPx={128} fallbackSize={24} />
              </button>
              {hasVoice && (
                <div className="absolute -bottom-0.5 -right-0.5 z-10"><VoiceBadge size="sm" /></div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-text-primary leading-tight">
                    {displayName}
                    <span className="text-sm text-text-primary/70 font-normal ml-1.5">
                      {formatLifespan(celeb.birth_date, celeb.death_date)}
                    </span>
                  </p>
                  {displayTitle && (
                    <p className="text-sm text-amber-400/80 truncate mt-0.5">{displayTitle}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => onToggleContemporaries(celeb.id)}
                    className={`p-2 rounded-lg border transition-colors ${isContemporariesShown ? "border-accent/50 text-accent bg-accent/10" : "border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20 hover:bg-white/5"}`}
                    title={t("contemporaries")}>
                    <Clock size={16} />
                  </button>
                  <Link href={celeb.slug ? `/celeb/${celeb.slug}` : `/celeb/${celeb.id}`}
                    className="p-2 rounded-lg border border-white/10 text-text-secondary hover:text-text-primary hover:border-white/20 hover:bg-white/5 transition-colors">
                    <ExternalLink size={16} />
                  </Link>
                </div>
              </div>
              {displayBio && (
                <p role="button" onClick={() => onToggleBio(celeb.id)}
                  className={`text-sm text-text-primary/60 mt-1 cursor-pointer hover:text-text-primary/80 transition-colors ${isBioExpanded ? "" : "line-clamp-2"}`}>
                  {displayBio}
                </p>
              )}
            </div>
          </div>
          {/* === 모바일 레이아웃 === */}
          <div className="md:hidden">
            <div className="flex items-center gap-2">
              {/* 아바타 — 이름+연도 2행에 걸침 */}
              <div className="relative shrink-0 self-start">
                <button type="button" onClick={() => onFireDialogue(celeb)}
                  className={`block w-9 h-9 rounded-full overflow-hidden border hover:scale-105 transition-all cursor-pointer ${
                    hasVoice ? "border-emerald-400/40 hover:border-emerald-400/70" : "border-white/10 hover:border-accent/50"
                  }`}>
                  <CelebImage src={celeb.avatar_url} alt={displayName} shape="circle" sizes="36px" maxPx={72} fallbackSize={16} />
                </button>
                {hasVoice && (
                  <div className="absolute -bottom-0.5 -right-0.5 z-10"><VoiceBadge size="sm" /></div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                {/* 1행: 이름 + 아이콘 */}
                <div className="flex items-center gap-1">
                  <p className="text-sm font-semibold text-text-primary truncate flex-1">{displayName}</p>
                  <button type="button" onClick={() => onToggleContemporaries(celeb.id)}
                    className={`p-1 rounded border transition-colors shrink-0 ${isContemporariesShown ? "border-accent/50 text-accent bg-accent/10" : "border-white/10 text-text-secondary"}`}>
                    <Clock size={12} />
                  </button>
                  <Link href={celeb.slug ? `/celeb/${celeb.slug}` : `/celeb/${celeb.id}`}
                    className="p-1 rounded border border-white/10 text-text-secondary shrink-0">
                    <ExternalLink size={12} />
                  </Link>
                </div>
                {/* 2행: 연도 */}
                <p className="text-[11px] text-text-primary/60">{formatLifespan(celeb.birth_date, celeb.death_date)}</p>
              </div>
            </div>
            {/* 3행: 별명 */}
            {displayTitle && (
              <p className="text-[11px] text-amber-400/80 truncate mt-0.5 pl-11">{displayTitle}</p>
            )}
            {/* 4행: bio */}
            {displayBio && (
              <p role="button" onClick={() => onToggleBio(celeb.id)}
                className={`text-[11px] text-text-primary/50 mt-0.5 pl-11 cursor-pointer hover:text-text-primary/70 transition-colors ${isBioExpanded ? "" : "line-clamp-1"}`}>
                {displayBio}
              </p>
            )}
          </div>
        </div>
      </div>
      {/* 동시대 인물 패널 */}
      {isContemporariesShown && (
        <ContemporariesPanel
          celeb={celeb}
          contemporaries={getContemporaries(celeb)}
          locale={locale}
        />
      )}
    </div>
  );
}
