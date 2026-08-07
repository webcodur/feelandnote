/*
  파일명: components/features/game/shared/GameContentItem.tsx
  기능: 게임 결과 콘텐츠 행 아이템
  책임: TrackerResult, DawnResult 공통 콘텐츠 행. 클릭 시 리뷰 모달 또는 상세 페이지 이동
*/
"use client";

import { useState } from "react";
import ContentImage from "@/components/ui/ContentImage";
import { Link } from "@/i18n/navigation";
import { Book, Film, Gamepad2, Music } from "lucide-react";
import { getCategoryByDbType } from "@/constants/categories";
import ContentReviewModal from "./ContentReviewModal";

const TYPE_ICONS: Record<string, typeof Book> = {
  BOOK: Book,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
};

const SIZE_CONFIG = {
  sm: {
    container: "gap-2 px-2.5 py-1.5",
    thumb: "h-8 w-6",
    thumbSizes: "24px",
    thumbIcon: 12,
    title: "text-xs",
    creator: "text-[10px]",
    typeIcon: 12,
  },
  md: {
    container: "gap-2.5 px-3 py-2",
    thumb: "h-10 w-8",
    thumbSizes: "32px",
    thumbIcon: 14,
    title: "text-sm",
    creator: "text-xs",
    typeIcon: 14,
  },
} as const;

export interface GameContentItemProps {
  contentId: string;
  title: string;
  creator?: string | null;
  thumbnailUrl?: string | null;
  type: string;
  review?: string | null;
  sourceUrl?: string | null;
  ownerNickname?: string;
  size?: "sm" | "md";
  /** 외부에서 클릭 핸들링 시 모달 대신 호출 */
  onClickOverride?: () => void;
}

export default function GameContentItem({
  contentId,
  title,
  creator,
  thumbnailUrl,
  type,
  review,
  sourceUrl,
  ownerNickname,
  size = "md",
  onClickOverride,
}: GameContentItemProps) {
  const [showReview, setShowReview] = useState(false);
  const Icon = TYPE_ICONS[type] ?? Book;
  const cfg = SIZE_CONFIG[size];

  const hasReview = !!review;
  const contentDetailUrl = `/content/${contentId}?category=${getCategoryByDbType(type)?.id || "book"}`;

  const inner = (
    <>
      <div
        className={`relative ${cfg.thumb} shrink-0 rounded overflow-hidden bg-bg-secondary`}
      >
        {thumbnailUrl ? (
          <ContentImage
            src={thumbnailUrl}
            alt={title}
            sizes={cfg.thumbSizes}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon size={cfg.thumbIcon} className="text-text-secondary" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`${cfg.title} font-bold text-white truncate`}>{title}</p>
        {creator && (
          <p className={`${cfg.creator} text-text-secondary truncate`}>
            {creator}
          </p>
        )}
      </div>
      <Icon size={cfg.typeIcon} className="shrink-0" />
    </>
  );

  if (hasReview) {
    return (
      <>
        <button
          type="button"
          onClick={() => onClickOverride ? onClickOverride() : setShowReview(true)}
          className={`flex items-center ${cfg.container} w-full rounded-lg border border-white/10 bg-black/20 hover:bg-white/5 text-left`}
        >
          {inner}
        </button>
        {!onClickOverride && (
          <ContentReviewModal
            isOpen={showReview}
            onClose={() => setShowReview(false)}
            title={title}
            creator={creator}
            review={review}
            sourceUrl={sourceUrl}
            ownerNickname={ownerNickname}
            contentDetailUrl={contentDetailUrl}
          />
        )}
      </>
    );
  }

  return (
    <Link
      href={contentDetailUrl}
      target="_blank"
      className={`flex items-center ${cfg.container} rounded-lg border border-white/10 bg-black/20 hover:bg-white/5`}
    >
      {inner}
    </Link>
  );
}
