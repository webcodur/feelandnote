/*
  파일명: /components/features/content/ReviewCard.tsx
  기능: 작품 상세 리뷰 카드
  책임:
    - 날짜 완전 제거
    - 상단: 인물사진 큼직하게 확대하여 헤더 세로 영역을 꽉 채움 (모바일/PC 반응형 최적화)
    - 헤드라인/타이틀 (위) → 인물명 (아래) 2단 구조
    - 직군(리더, 정치인, 기업인 등) 아이콘화
    - 서재 링크 제거 후 그 자리(상단 우측)에 `[출처 ↗]` 텍스트 버튼 배치
    - 360px 모바일 화면에서도 요소 겹침/깨짐 없는 콤팩트 반응형 보장
*/ // ------------------------------
"use client";

import { useState } from "react";
import Image from "next/image";
import { EyeOff, Star, ExternalLink } from "lucide-react";
import { BlurDissolve, FormattedText } from "@/components/ui";
import Button from "@/components/ui/Button";
import UserAvatarWithPopover from "@/components/shared/UserAvatarWithPopover";
import { BLUR_DATA_URL } from "@/constants/image";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ReviewFeedItem } from "@/actions/contents/getReviewFeed";
import { PROFESSION_ICONS, PROFESSION_COLORS } from "@/constants/professionIcons";
import { cn } from "@/lib/utils";

interface ReviewCardProps {
  item: ReviewFeedItem;
  className?: string;
  isExpanded?: boolean;
  hideTime?: boolean;
}

export default function ReviewCard({
  item,
  className = "",
  isExpanded = false,
}: ReviewCardProps) {
  const [showSpoiler, setShowSpoiler] = useState(false);
  const t = useTranslations("contentDetail.review");
  const locale = useLocale();
  const isEn = locale === "en";

  const isCeleb = item.user.subject_kind === "celeb";
  const nickname = (isEn && item.user.nickname_en) || item.user.nickname || t("anonymous");
  const reviewText = (isEn && item.review_en) ? item.review_en : item.review;

  // 헤드라인(한줄소개) 우선, 없으면 직함(title)
  const celebHeadline = (isEn && item.user.headline_en) || item.user.headline;
  const celebTitle = (isEn && item.user.title_en) || item.user.title;
  const topSubtitle = celebHeadline || celebTitle;

  const celebSlug = item.user.slug;
  const professionKey = item.user.profession;
  const ProfessionIcon = professionKey ? PROFESSION_ICONS[professionKey] : null;
  const professionColor = professionKey ? PROFESSION_COLORS[professionKey] : null;

  // 출처 라벨
  const sourceLabel = isEn ? "Source" : "출처";

  // ==========================================
  // 1. 셀럽 리뷰 카드 (프리미엄 큐레이터 스타일)
  // ==========================================
  if (isCeleb) {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-b from-white/[0.045] to-white/[0.015] p-3.5 sm:p-5 shadow-lg transition-all hover:border-accent/40 group",
          className
        )}
      >
        {/* 상단 앰비언트 라인 */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-accent/50 to-transparent" />

        {/* 상단 헤더: 아바타 + 2단 신원 + (우측: 별점 & 출처 텍스트 버튼) */}
        <div className="flex items-center justify-between gap-2.5 sm:gap-3 pb-3 sm:pb-3.5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            {/* 셀럽 아바타 (모바일 44px, 태블릿 52px, PC 60px로 유려한 비례) */}
            <UserAvatarWithPopover
              userId={item.user.id}
              subjectKind={item.user.subject_kind}
              trigger={
                <div className="relative w-11 h-11 sm:w-13 sm:h-13 md:w-15 md:h-15 rounded-xl sm:rounded-2xl overflow-hidden ring-2 ring-accent/35 hover:ring-accent/70 transition-all cursor-pointer shrink-0 shadow-md bg-black/40">
                  {item.user.avatar_url ? (
                    <BlurDissolve className="absolute inset-0">
                      <Image
                        src={item.user.avatar_url}
                        alt={nickname}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                      />
                    </BlurDissolve>
                  ) : (
                    <div className="w-full h-full bg-accent/20 flex items-center justify-center text-accent font-bold text-lg">
                      {nickname[0]}
                    </div>
                  )}
                </div>
              }
            />

            {/* 2단: 위(헤드라인/직함) → 아래(인물명 + 직군 아이콘) */}
            <div className="flex flex-col min-w-0 justify-center gap-0.5 sm:gap-1">
              {/* 1행 (위): 헤드라인 또는 타이틀 */}
              {topSubtitle && (
                <p className="text-[11px] sm:text-xs md:text-sm text-text-secondary/85 font-normal truncate leading-tight">
                  {topSubtitle}
                </p>
              )}

              {/* 2행 (아래): 인물명 + 직군 아이콘 */}
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                {celebSlug ? (
                  <Link
                    href={`/celeb/${celebSlug}`}
                    className="font-bold text-sm sm:text-base md:text-lg text-text-primary hover:text-accent transition-colors truncate tracking-tight"
                  >
                    {nickname}
                  </Link>
                ) : (
                  <span className="font-bold text-sm sm:text-base md:text-lg text-text-primary truncate tracking-tight">
                    {nickname}
                  </span>
                )}

                {/* 직군 아이콘화 */}
                {ProfessionIcon && (
                  <span
                    className="inline-flex items-center justify-center p-1 sm:p-1.5 rounded-full bg-white/[0.06] border border-white/[0.09] shrink-0 shadow-sm"
                    title={professionKey ?? undefined}
                  >
                    <ProfessionIcon size={11} className={cn(professionColor || "text-accent", "sm:w-3 sm:h-3")} />
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* 우측: 별점 & 출처 텍스트 버튼 (모바일에서도 콤팩트하게 안착) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {item.rating && (
              <div className="flex items-center gap-1 text-[11px] sm:text-xs font-bold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shadow-sm">
                <Star size={10} className="fill-amber-400 text-amber-400 sm:w-3 sm:h-3" />
                <span>{item.rating}</span>
              </div>
            )}

            {item.source_url && (
              <a
                href={item.source_url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-medium text-text-secondary/75 hover:text-accent py-0.5 px-2 sm:py-1 sm:px-2.5 rounded-lg hover:bg-white/[0.05] transition-colors"
                title={isEn ? "View source" : "원문 출처 보기"}
              >
                <span>{sourceLabel}</span>
                <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>

        {/* 본문: 셀럽 감상평 */}
        <div className="pt-3 sm:pt-3.5 space-y-2">
          {item.is_spoiler && !showSpoiler ? (
            <Button
              unstyled
              onClick={() => setShowSpoiler(true)}
              className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary py-3 w-full justify-center bg-white/[0.03] rounded-xl border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
            >
              <EyeOff size={14} />
              <span>{t("spoilerWarning")}</span>
            </Button>
          ) : (
            <div className={cn(!isExpanded && "max-h-[220px] sm:max-h-[260px] md:max-h-[320px] overflow-y-auto custom-scrollbar")}>
              <div className="relative text-xs sm:text-sm md:text-[14.5px] leading-relaxed text-text-secondary font-normal whitespace-pre-wrap">
                {item.is_spoiler && (
                  <Button
                    unstyled
                    onClick={() => setShowSpoiler(false)}
                    className="inline-flex items-center gap-1 mr-1.5 text-red-400 hover:text-red-300 transition-colors"
                    title={t("hideSpoiler")}
                  >
                    <EyeOff size={12} />
                  </Button>
                )}
                <FormattedText text={reviewText} />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ==========================================
  // 2. 일반 사용자 리뷰 카드
  // ==========================================
  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 sm:p-4 transition-all hover:border-white/[0.12]",
        className
      )}
    >
      {/* 헤더: 아바타 + 닉네임 + 별점 + 출처 */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/[0.05]">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <UserAvatarWithPopover
            userId={item.user.id}
            subjectKind={item.user.subject_kind}
            trigger={
              <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/[0.05] overflow-hidden hover:ring-2 hover:ring-accent/40 cursor-pointer shrink-0">
                {item.user.avatar_url ? (
                  <Image
                    src={item.user.avatar_url}
                    alt={nickname}
                    fill
                    unoptimized
                    className="object-cover"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-text-secondary text-xs font-bold">
                    {nickname[0]}
                  </div>
                )}
              </div>
            }
          />
          <span className="font-semibold text-xs sm:text-sm text-text-primary truncate">{nickname}</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {item.rating && (
            <div className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/20">
              <Star size={10} className="fill-accent text-accent" />
              <span>{item.rating}</span>
            </div>
          )}

          {item.source_url && (
            <a
              href={item.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary/70 hover:text-accent transition-colors py-0.5 px-1.5 sm:px-2 rounded-md hover:bg-white/[0.05]"
            >
              <span>{sourceLabel}</span>
              <ExternalLink size={10} />
            </a>
          )}
        </div>
      </div>

      {/* 본문 */}
      <div className="pt-2.5 space-y-2">
        {item.is_spoiler && !showSpoiler ? (
          <Button
            unstyled
            onClick={() => setShowSpoiler(true)}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary py-2.5 w-full justify-center bg-white/[0.02] rounded-lg border border-white/[0.05] hover:bg-white/[0.05] transition-colors"
          >
            <EyeOff size={13} />
            <span>{t("spoilerWarning")}</span>
          </Button>
        ) : (
          <div className={cn(!isExpanded && "max-h-[180px] sm:max-h-[220px] md:max-h-[260px] overflow-y-auto custom-scrollbar")}>
            <div className="text-xs sm:text-sm leading-relaxed text-text-secondary font-normal whitespace-pre-wrap">
              {item.is_spoiler && (
                <Button
                  unstyled
                  onClick={() => setShowSpoiler(false)}
                  className="inline-flex items-center gap-1 mr-1.5 text-red-400 hover:text-red-300 transition-colors"
                  title={t("hideSpoiler")}
                >
                  <EyeOff size={12} />
                </Button>
              )}
              <FormattedText text={reviewText} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
