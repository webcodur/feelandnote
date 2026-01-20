/*
  파일명: /components/features/user/contentLibrary/item/InterestCard.tsx
  기능: 관심 콘텐츠 전용 카드
  책임: WANT 상태 콘텐츠를 표시하고 선택 상태를 관리한다.
*/ // ------------------------------
"use client";

import Link from "next/link";
import Image from "next/image";
import { Book, Film, Gamepad2, Music, Award } from "lucide-react";
import type { ContentType } from "@/types/database";

// #region 타입
interface InterestCardProps {
  contentType: ContentType;
  title: string;
  creator?: string | null;
  thumbnail?: string | null;
  href: string;
  isSelected?: boolean;
  onSelect?: () => void;
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
  contentType,
  title,
  creator,
  thumbnail,
  href,
  isSelected = false,
  onSelect,
}: InterestCardProps) {
  const ContentIcon = TYPE_ICONS[contentType];

  const handleClick = (e: React.MouseEvent) => {
    if (onSelect) {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`group block bg-bg-card hover:bg-bg-secondary border rounded-lg overflow-hidden ${
        isSelected
          ? "border-accent ring-2 ring-accent/30 bg-accent/5"
          : "border-border/30 hover:border-accent/50"
      }`}
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
        <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
          <h3 className="text-sm font-semibold text-text-primary truncate group-hover:text-accent">
            {title}
          </h3>
          {creator && (
            <p className="text-xs text-text-secondary truncate mt-0.5">
              {creator.replace(/\^/g, ", ")}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
