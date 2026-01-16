/*
  파일명: /components/features/archive/contentLibrary/item/RecordCard.tsx
  기능: 기록관 전용 컴팩트 카드
  책임: 콘텐츠 기록을 컴팩트하게 표시한다.
*/ // ------------------------------
"use client";

import Link from "next/link";
import Image from "next/image";
import { Book, Film, Gamepad2, Music, Award, Star } from "lucide-react";
import type { ContentType, ContentStatus } from "@/types/database";

// #region 타입
interface RecordCardProps {
  // 콘텐츠 정보
  contentId: string;
  contentType: ContentType;
  title: string;
  creator?: string | null;
  thumbnail?: string | null;
  // 기록 정보
  status: ContentStatus;
  rating?: number | null;
  review?: string | null;
  isSpoiler?: boolean;
  // 링크
  href: string;
}
// #endregion

// #region 상수
const TYPE_ICONS: Record<ContentType, typeof Book> = {
  BOOK: Book,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
  CERTIFICATE: Award,
};

const STATUS_STYLES: Record<ContentStatus, { label: string; color: string }> = {
  WANT: { label: "보고싶음", color: "text-status-wish" },
  WATCHING: { label: "보는중", color: "text-status-watching" },
  DROPPED: { label: "중단", color: "text-status-paused" },
  FINISHED: { label: "완료", color: "text-status-completed" },
  RECOMMENDED: { label: "추천", color: "text-green-500" },
  NOT_RECOMMENDED: { label: "비추천", color: "text-red-500" },
};
// #endregion

export default function RecordCard({
  contentId,
  contentType,
  title,
  creator,
  thumbnail,
  status,
  rating,
  review,
  isSpoiler = false,
  href,
}: RecordCardProps) {
  const ContentIcon = TYPE_ICONS[contentType];
  const statusInfo = STATUS_STYLES[status];

  return (
    <Link
      href={href}
      className="group block bg-bg-card hover:bg-bg-secondary border border-border/30 hover:border-accent/50 rounded-lg overflow-hidden"
    >
      <div className="flex gap-3 p-3">
        {/* 썸네일 */}
        <div className="relative w-20 h-32 flex-shrink-0 rounded overflow-hidden bg-bg-secondary">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={title}
              fill
              unoptimized
              className="object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ContentIcon size={24} className="text-text-tertiary" />
            </div>
          )}
        </div>

        {/* 정보 */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          {/* 상단: 제목 + 작가 */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-accent">
              {title}
            </h3>
            {creator && (
              <p className="text-xs text-text-secondary truncate mt-0.5">
                {creator.replace(/\^/g, ", ")}
              </p>
            )}
          </div>

          {/* 중간: 리뷰 미리보기 */}
          {review && (
            <p className="text-xs text-text-tertiary line-clamp-4 mt-2 leading-relaxed">
              {isSpoiler ? "스포일러 포함" : review}
            </p>
          )}

          {/* 하단: 상태 + 별점 */}
          <div className="flex items-center gap-2 mt-auto">
            <span className={`text-[10px] font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
            {rating && (
              <span className="flex items-center gap-0.5 text-[10px] text-text-secondary">
                <Star size={10} className="text-yellow-500 fill-yellow-500" />
                {rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
