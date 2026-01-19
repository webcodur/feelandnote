/*
  파일명: /components/features/user/contentLibrary/item/InterestCard.tsx
  기능: 관심 콘텐츠 전용 카드
  책임: WANT 상태 콘텐츠를 표시하고 완료 전환 버튼을 제공한다.
*/ // ------------------------------
"use client";

import Link from "next/link";
import Image from "next/image";
import { Book, Film, Gamepad2, Music, Award, Check } from "lucide-react";
import type { ContentType } from "@/types/database";
import Button from "@/components/ui/Button";

// #region 타입
interface InterestCardProps {
  userContentId: string;
  contentId: string;
  contentType: ContentType;
  title: string;
  creator?: string | null;
  thumbnail?: string | null;
  href: string;
  onComplete?: (userContentId: string, title: string) => void;
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
// #endregion

export default function InterestCard({
  userContentId,
  contentId,
  contentType,
  title,
  creator,
  thumbnail,
  href,
  onComplete,
}: InterestCardProps) {
  const ContentIcon = TYPE_ICONS[contentType];

  const handleComplete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onComplete?.(userContentId, title);
  };

  return (
    <Link
      href={href}
      className="group block bg-bg-card hover:bg-bg-secondary border border-border/30 hover:border-accent/50 rounded-lg overflow-hidden"
    >
      <div className="flex gap-3 p-3">
        {/* 썸네일 */}
        <div className="relative w-20 h-28 flex-shrink-0 rounded overflow-hidden bg-bg-secondary">
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

          {/* 하단: 완료 처리 버튼 */}
          {onComplete && (
            <div className="mt-auto pt-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleComplete}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 hover:bg-accent/10 hover:text-accent hover:border-accent/30"
              >
                <Check size={14} />
                <span>완료 처리</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
