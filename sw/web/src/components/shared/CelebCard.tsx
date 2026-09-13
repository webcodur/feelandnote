/*
  파일명: /components/shared/CelebCard.tsx
  기능: 셀럽 카드 공통 컴포넌트
  책임: 인물 사진과 이름은 상세페이지로 연결하고, 대사와 조회수는 별도 버튼으로 제공한다.
*/
"use client";

import { useState, useCallback } from "react";
import { Eye } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getCelebProfileUrl } from "@/lib/url";
import CelebViewsModal from "@/components/features/celeb/modals/CelebViewsModal";
import { CelebImage, VoiceBadge } from "@/components/ui";
import type { CelebProfile } from "@/types/home";
import type { DialogueSubtitleData } from "@/components/features/game/shared/hooks/useDialogue";
import { useCelebGreeting } from "@/hooks/useCelebGreeting";
import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/types/locale";
import { badgeStyles, quietBadgeStyles } from "./CelebCard.styles";

type Variant = "card" | "circle" | "medallion";
type CardShape = "circle" | "square";

interface CelebCardProps {
  id: string;
  nickname: string;
  avatar_url?: string | null;
  title?: string | null;
  count?: number;
  /** 최근 30일 조회수 — 값이 있을 때만 조회수 버튼을 표시한다. */
  recentViews?: number | null;
  className?: string;
  celebProfile?: CelebProfile;
  variant?: Variant;
  presentation?: "default" | "quiet";
  /** card variant 전용: 이미지 형태 (circle | square) */
  shape?: CardShape;
  /** 별도 대사 버튼에서 인사·한마디 자막을 표시한다. */
  onSubtitle?: (sub: DialogueSubtitleData) => void;
}

export default function CelebCard({
  id,
  nickname,
  avatar_url,
  title,
  count,
  recentViews,
  className = "",
  celebProfile,
  variant = "card",
  presentation = "default",
  shape = "circle",
  onSubtitle,
}: CelebCardProps) {
  const t = useTranslations("shared.celeb");
  const locale = useLocale();
  const reality = celebProfile?.celeb_reality;
  const realityLabel = reality === "FICTION" ? t("reality.myth") : reality === "BOTH" ? t("reality.both") : null;
  const displayNickname = locale === "en" && celebProfile?.nickname_en ? celebProfile.nickname_en : nickname;
  const displayTitle = locale === "en" && celebProfile?.title_en ? celebProfile.title_en : title;
  // UUID 주소도 기존 프로필 라우트가 정식 slug 주소로 연결한다.
  const profileHref = getCelebProfileUrl({ id, slug: celebProfile?.slug });
  const [isViewsOpen, setIsViewsOpen] = useState(false);
  const [voicePulse, setVoicePulse] = useState(0);
  const hasVoice = celebProfile?.has_voice ?? false;
  const badgeViews = recentViews == null ? null : (celebProfile?.view_count ?? recentViews);
  const { fireGreeting } = useCelebGreeting({ onSubtitle, locale: locale as Locale });
  const dialogueLabel = `${displayNickname} · ${t("playDialogue")}`;
  const fireDialogue = useCallback(() => {
    if (!celebProfile) return;
    fireGreeting({ ...celebProfile, nickname: displayNickname });
    if (hasVoice) setVoicePulse(prev => prev + 1);
  }, [celebProfile, displayNickname, hasVoice, fireGreeting]);

  const isQuiet = presentation === "quiet";
  const isCard = variant === "card";
  const isCircle = variant === "circle";
  const roundedClass = isCard && shape === "square" ? "rounded-md" : "rounded-full";
  const config = isCard
    ? { container: "aspect-square w-full", sizes: "(max-width: 640px) 120px, (max-width: 1024px) 180px, 200px", fallbackSize: 32 }
    : isCircle
      ? { container: "w-24 h-24", sizes: "96px", fallbackSize: 32 }
      : { container: "w-14 h-14 sm:w-16 sm:h-16", sizes: "64px", fallbackSize: 20 };

  return (
    <>
      <div className={`relative flex flex-col items-center ${isCard ? "@container" : ""} ${className}`}>
        <Link
          href={profileHref}
          prefetch={false}
          aria-label={displayNickname}
          className={`group flex flex-col items-center outline-none ${isCard ? "w-full" : isCircle ? "gap-2" : ""}`}
        >
          <div
            className={`relative shrink-0 ${config.container} ${roundedClass}
              ${isQuiet ? "border border-white/10 bg-bg-card group-hover:border-white/30" : "border border-white/5 ring-1 ring-inset ring-white/5 shadow-inner group-hover:border-accent/60"}
              group-focus-visible:border-accent group-focus-visible:ring-2 group-focus-visible:ring-accent
            `}
            style={isQuiet ? undefined : { background: "radial-gradient(circle at 50% 0%, #302b27 0%, #171513 40%, #0a0908 100%)" }}
          >
            <div className={`absolute inset-0 overflow-hidden ${roundedClass}`}>
              <div
                className="absolute inset-0 opacity-[0.06] pointer-events-none mix-blend-overlay"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
              />
              {!isQuiet && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[70%] rounded-full bg-accent/20 blur-[20px] opacity-40 transition-[opacity,transform,background-color] duration-700 pointer-events-none mix-blend-screen group-hover:opacity-100 group-hover:scale-125 group-hover:bg-accent/40" />}
              <CelebImage
                src={avatar_url}
                alt={displayNickname}
                shape={isCard && shape === "square" ? "square" : "circle"}
                sizes={config.sizes}
                maxPx={isCard ? 300 : undefined}
                fallbackSize={config.fallbackSize}
                className={`z-10 relative ${isQuiet ? "drop-shadow-sm" : "[filter:drop-shadow(0_10px_15px_rgba(0,0,0,0.8))]"} transition-transform duration-500 group-hover:scale-105`}
              />
            </div>

            {count !== undefined && count > 0 && (
              <span className={`${isQuiet ? `${quietBadgeStyles[variant]} border border-white/15 bg-bg-main text-text-secondary` : badgeStyles[variant]} z-20 flex items-center justify-center font-bold leading-none`} title={t("contentCount", { count })}>
                {count}
              </span>
            )}
            {isCard && realityLabel && (
              <span
                className="absolute bottom-[clamp(4px,3cqw,8px)] right-[clamp(4px,3cqw,8px)] z-20 flex h-[clamp(17px,13cqw,24px)] items-center rounded-full border border-white/15 bg-black/70 px-[clamp(4px,2cqw,8px)] text-[clamp(9px,6.5cqw,12px)] font-bold leading-none text-white/75 group-hover:border-white/35 group-hover:text-white"
                title={realityLabel}
              >
                {realityLabel}
              </span>
            )}
          </div>

          {isCard ? (
            <div className="mt-1.5 w-full text-center px-0.5">
              <p className="text-xs md:text-sm font-semibold text-text-primary truncate leading-tight group-hover:text-accent">{displayNickname}</p>
              {displayTitle && (
                <p className={`text-[10px] md:text-xs ${isQuiet ? "text-text-secondary" : "text-amber-400/80"} truncate leading-tight mt-0.5`}>{displayTitle}</p>
              )}
            </div>
          ) : isCircle ? (
            <span className="text-sm font-medium text-text-secondary group-hover:text-accent text-center leading-tight line-clamp-2">
              {displayNickname}
            </span>
          ) : null}
        </Link>

        {/* 사진 위에 놓되 링크 밖의 독립 버튼으로 제공한다. */}
        <div className={`absolute top-0 pointer-events-none ${config.container}`}>
          {onSubtitle && celebProfile && (
            <button
              type="button"
              onClick={fireDialogue}
              aria-label={dialogueLabel}
              title={dialogueLabel}
              className={`absolute z-30 pointer-events-auto rounded-full border ${isQuiet ? "border-white/15 bg-bg-main text-text-secondary [&_svg]:text-text-secondary [&>div]:shadow-none hover:bg-bg-card hover:border-white/40 hover:[&_svg]:text-text-primary focus-visible:[&_svg]:text-text-primary" : "border-white/20 bg-black/70 hover:bg-black hover:border-accent"} outline-none focus-visible:ring-2 focus-visible:ring-accent ${isCard ? "top-[clamp(4px,3cqw,8px)] left-[clamp(4px,3cqw,8px)]" : "top-0 left-0"}`}
            >
              <VoiceBadge size={isCard ? "md" : "sm"} active={hasVoice} pulse={voicePulse} className="border-0 bg-transparent" />
            </button>
          )}
          {isCard && badgeViews !== null && badgeViews > 0 && (
            <button
              type="button"
              onClick={() => setIsViewsOpen(true)}
              aria-label={`${displayNickname} · ${t("viewsBadge", { count: badgeViews })}`}
              title={t("viewsBadge", { count: badgeViews })}
              className="absolute bottom-[clamp(4px,3cqw,8px)] left-[clamp(4px,3cqw,8px)] z-20 pointer-events-auto flex items-center gap-[clamp(2px,1cqw,4px)] h-[clamp(17px,13cqw,24px)] px-[clamp(4px,2cqw,8px)] rounded-full bg-black/70 border border-white/15 text-white/75 text-[clamp(9px,6.5cqw,12px)] hover:bg-white hover:border-white hover:text-black outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Eye className="shrink-0 opacity-70 w-[clamp(8px,6cqw,14px)] h-[clamp(8px,6cqw,14px)]" />
              <span className="font-bold leading-none tabular-nums">{badgeViews}</span>
            </button>
          )}
        </div>
      </div>

      {isViewsOpen && recentViews != null && (
        <CelebViewsModal
          isOpen={isViewsOpen}
          onClose={() => setIsViewsOpen(false)}
          nickname={displayNickname}
          recentViews={recentViews}
          totalViews={celebProfile?.view_count ?? null}
          windowStart={celebProfile?.views_window_start ?? null}
          windowEnd={celebProfile?.views_window_end ?? null}
        />
      )}
    </>
  );
}
