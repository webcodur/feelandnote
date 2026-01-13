"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Avatar, Card, Button } from "@/components/ui";
import {
  Book,
  Film,
  Gamepad2,
  Music,
  Award,
  AlertTriangle,
  ExternalLink,
  FileText,
  Plus,
  Check,
  Loader2,
} from "lucide-react";
import { addContent } from "@/actions/contents/addContent";
import { checkContentSaved } from "@/actions/contents/getMyContentIds";
import type { CelebReview } from "@/types/home";
import type { ContentType } from "@/types/database";

// #region Constants
const CONTENT_TYPE_ICONS: Record<ContentType, typeof Book> = {
  BOOK: Book,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
  CERTIFICATE: Award,
};

const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  BOOK: "도서",
  VIDEO: "영상",
  GAME: "게임",
  MUSIC: "음악",
  CERTIFICATE: "자격증",
};
// #endregion

// #region Utils
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "방금 전";
  if (diffMins < 60) return `${diffMins}분 전`;
  if (diffHours < 24) return `${diffHours}시간 전`;
  if (diffDays < 7) return `${diffDays}일 전`;
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function extractDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
// #endregion

interface CelebReviewCardProps {
  review: CelebReview;
}

export default function CelebReviewCard({ review }: CelebReviewCardProps) {
  const [showSpoiler, setShowSpoiler] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAdding, startTransition] = useTransition();

  const ContentIcon = CONTENT_TYPE_ICONS[review.content.type] ?? Book;
  const contentTypeLabel = CONTENT_TYPE_LABELS[review.content.type] ?? "콘텐츠";

  // 기록관에 이미 추가된 콘텐츠인지 확인
  useEffect(() => {
    checkContentSaved(review.content.id).then((result) => {
      setIsAdded(result.saved);
      setIsChecking(false);
    });
  }, [review.content.id]);

  // 내 기록관에 추가 핸들러
  const handleAddToArchive = () => {
    if (isAdded || isAdding) return;

    startTransition(async () => {
      const result = await addContent({
        id: review.content.id,
        type: review.content.type,
        title: review.content.title,
        creator: review.content.creator ?? undefined,
        thumbnailUrl: review.content.thumbnail_url ?? undefined,
        status: "WANT",
      });

      if (result.success) {
        setIsAdded(true);
      }
    });
  };

  return (
    <Card className="overflow-hidden flex flex-col md:flex-row border-border/50 hover:border-border group bg-bg-card hover:shadow-lg hover:shadow-black/10">
      {/* 좌측: 콘텐츠 정보 영역 */}
      <Link
        href={`/archive/${review.content.id}?userId=${review.celeb.id}`}
        className="relative w-full md:w-[160px] lg:w-[180px] shrink-0 block bg-bg-secondary overflow-hidden group/content"
      >
        <div className="relative aspect-[4/5] md:h-full md:aspect-auto">
          {review.content.thumbnail_url ? (
            <Image
              src={review.content.thumbnail_url}
              alt={review.content.title}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-tertiary bg-gradient-to-br from-bg-secondary to-bg-card">
              <ContentIcon size={36} className="opacity-50" />
            </div>
          )}
          {/* 오버레이 그라데이션 */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

          {/* 카테고리 배지 */}
          <span className="absolute top-2 left-2 px-1.5 py-0.5 text-[9px] font-bold uppercase bg-black/60 backdrop-blur-sm text-white rounded">
            {contentTypeLabel}
          </span>

          {/* 콘텐츠 정보 (이미지 하단 오버레이) */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="text-sm font-bold text-white leading-tight line-clamp-2 mb-0.5 group-hover/content:text-accent">
              {review.content.title}
            </h3>
            {review.content.creator && (
              <p className="text-[11px] text-white/70 truncate">
                {review.content.creator}
              </p>
            )}
          </div>
        </div>
      </Link>

      {/* 우측: 셀럽 리뷰 영역 */}
      <div className="flex-1 p-4 flex flex-col min-w-0">
        {/* 셀럽 헤더 */}
        <Link
          href={`/archive/user/${review.celeb.id}`}
          className="flex items-center gap-2 mb-3 group/user"
        >
          <Avatar
            url={review.celeb.avatar_url}
            name={review.celeb.nickname}
            size="sm"
            verified={review.celeb.is_verified}
          />
          <div className="flex-1 min-w-0">
            <span className="text-sm">
              <span className="font-medium text-text-primary group-hover/user:text-accent">{review.celeb.nickname}</span>
              <span className="text-text-tertiary">의 추천</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-text-tertiary">{formatRelativeTime(review.updated_at)}</span>
              {review.celeb.is_platform_managed && (
                <span className="text-[9px] text-text-tertiary bg-white/5 px-1 py-0.5 rounded">Feelnnote</span>
              )}
            </div>
          </div>
        </Link>

        {/* 리뷰 텍스트 */}
        <div className="flex-1">
          {review.is_spoiler && !showSpoiler ? (
            <Button
              unstyled
              onClick={() => setShowSpoiler(true)}
              className="flex items-center gap-2 py-3 px-3 rounded-lg bg-bg-secondary/30 border border-white/5 text-text-secondary hover:bg-bg-secondary/50 w-full"
            >
              <AlertTriangle size={14} className="text-yellow-500 shrink-0" />
              <span className="text-xs">스포일러 포함 · 탭하여 확인</span>
            </Button>
          ) : (
            <p className="text-sm text-text-primary/90 leading-relaxed line-clamp-3">
              {review.review}
            </p>
          )}

          {review.source_url && (
            <a
              href={review.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-[11px] text-text-tertiary hover:text-text-secondary"
            >
              <ExternalLink size={10} />
              <span>{extractDomain(review.source_url)}</span>
            </a>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end mt-3 pt-3 border-t border-border/20">
          <Button
            variant={isAdded ? "ghost" : "secondary"}
            size="sm"
            onClick={handleAddToArchive}
            disabled={isChecking || isAdding || isAdded}
            className={`gap-1 text-xs h-7 px-2.5 ${isAdded ? "text-accent" : ""}`}
          >
            {(isChecking || isAdding) && <Loader2 size={12} className="animate-spin" />}
            {!isChecking && !isAdding && isAdded && <Check size={12} />}
            {!isChecking && !isAdding && !isAdded && <Plus size={12} />}
            <span>{isAdded ? "추가됨" : "기록관 추가"}</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}
