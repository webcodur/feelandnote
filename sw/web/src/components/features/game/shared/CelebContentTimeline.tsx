/*
  파일명: components/features/game/shared/CelebContentTimeline.tsx
  기능: 셀럽 콘텐츠 수직 연대기 타임라인
  책임: 셀럽들의 감상 콘텐츠를 출생연도 순 수직 타임라인으로 표시 (DawnResult, Faction 공유)
*/
"use client";

import Image from "next/image";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { cn } from "@/lib/utils";
import BlurDissolve from "@/components/ui/BlurDissolve";
import GameContentItem from "./GameContentItem";

export interface TimelineCeleb {
  id: string;
  nickname: string;
  nickname_en?: string | null;
  avatar_url: string | null;
  profession?: string | null;
  birthYear: number;
}

export interface TimelineContent {
  contentId: string;
  title: string;
  title_en?: string | null;
  creator: string | null;
  creator_en?: string | null;
  thumbnailUrl: string | null;
  type: string;
  review: string | null;
  review_en?: string | null;
  sourceUrl: string | null;
}

interface CelebContentTimelineProps {
  celebs: TimelineCeleb[];
  contentsMap: Record<string, TimelineContent[]>;
  isLoading?: boolean;
  highlightCelebId?: string | null;
  onReviewClick?: (content: TimelineContent, ownerNickname: string) => void;
  emptyLabel?: string;
  locale?: string;
}

function formatYear(year: number): string {
  if (year < 0) return `BC ${Math.abs(year)}`;
  return `AD ${year}`;
}

export default function CelebContentTimeline({
  celebs,
  contentsMap,
  isLoading = false,
  highlightCelebId,
  onReviewClick,
  emptyLabel = "등록된 감상 기록 없음",
  locale,
}: CelebContentTimelineProps) {
  const isEn = locale === 'en';

  return (
    <div className="relative pl-7">
      {/* 수직선 */}
      <div className="absolute left-[6px] top-2 bottom-2 w-[2px] bg-accent/30" />

      {celebs.map((celeb) => {
        const contents = contentsMap[celeb.id];
        const isHighlighted = highlightCelebId === celeb.id;
        const displayNickname = isEn ? (celeb.nickname_en ?? celeb.nickname) : celeb.nickname;

        return (
          <div key={celeb.id} className="relative pb-7 last:pb-0">
            {/* 노드 */}
            <div
              className={cn(
                "absolute left-[-24px] top-1.5 w-3.5 h-3.5 rounded-full",
                isHighlighted ? "bg-red-400" : "bg-accent"
              )}
            />

            {/* 연도 */}
            <p className="text-sm font-cinzel text-accent/80 mb-1.5">
              {formatYear(celeb.birthYear)}
            </p>

            {/* 셀럽 정보 */}
            <div className="flex items-center gap-2.5 mb-2.5">
              <div className="relative w-11 h-11 rounded-full overflow-hidden border border-white/20 bg-bg-secondary shrink-0">
                {celeb.avatar_url ? (
                  <BlurDissolve className="absolute inset-0">
                    <Image
                      src={celeb.avatar_url}
                      alt={displayNickname}
                      fill
                      sizes="44px"
                      className="object-cover"
                    />
                  </BlurDissolve>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-serif text-text-secondary">
                    {displayNickname.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p
                  className={cn(
                    "text-base font-bold truncate",
                    isHighlighted ? "text-red-400" : "text-white"
                  )}
                >
                  {displayNickname}
                </p>
                {celeb.profession && (
                  <p className="text-xs">
                    {getCelebProfessionLabel(celeb.profession, locale)}
                  </p>
                )}
              </div>
            </div>

            {/* 콘텐츠 목록 */}
            {isLoading ? (
              <div className="space-y-2 ml-1">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-9 rounded bg-white/5 animate-pulse"
                  />
                ))}
              </div>
            ) : contents && contents.length > 0 ? (
              <div className="space-y-1.5 ml-1">
                {contents.map((c) => {
                  const displayTitle = isEn ? (c.title_en ?? c.title) : c.title;
                  const displayCreator = isEn ? (c.creator_en ?? c.creator) : c.creator;
                  return (
                    <GameContentItem
                      key={c.contentId}
                      contentId={c.contentId}
                      title={displayTitle}
                      creator={displayCreator}
                      thumbnailUrl={c.thumbnailUrl}
                      type={c.type}
                      review={isEn ? (c.review_en ?? c.review) : c.review}
                      sourceUrl={c.sourceUrl}
                      ownerNickname={displayNickname}
                      size="sm"
                      onClickOverride={
                        c.review && onReviewClick
                          ? () => onReviewClick(c, displayNickname)
                          : undefined
                      }
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-xs ml-1">
                {emptyLabel}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
