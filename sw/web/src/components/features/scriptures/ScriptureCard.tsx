/*
  파일명: /components/features/scriptures/ScriptureCard.tsx
  기능: 경전(콘텐츠) 카드 컴포넌트
  책임: 콘텐츠를 카드 형태로 표시한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import Link from "next/link";
import { Book, Film, Gamepad2, Music, Award, Users, Star } from "lucide-react";
import { getCategoryByDbType } from "@/constants/categories";
import ScriptureContent from "@/components/features/scriptures/ScriptureContent";
import ScriptureCelebModal from "./ScriptureCelebModal";

// #region Types
interface ScriptureCardProps {
  id: string;
  title: string;
  creator?: string | null;
  thumbnail?: string | null;
  type: string;
  celebCount: number;
  userCount?: number;
  avgRating?: number | null;
  rank?: number;
}
// #endregion

// #region Constants
const TYPE_ICONS: Record<string, typeof Book> = {
  BOOK: Book,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
  CERTIFICATE: Award,
};
// #endregion

export default function ScriptureCard({
  id,
  title,
  creator,
  thumbnail,
  type,
  celebCount,
  userCount = 0,
  avgRating,
  rank,
}: ScriptureCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const category = getCategoryByDbType(type);
  const href = `/content/${id}?category=${category?.id || "book"}`;
  const ContentIcon = TYPE_ICONS[type] || Book;

  const handleBadgeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsModalOpen(true);
  };

  return (
    <>
      <Link href={href} className="group flex flex-col">
        <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-bg-card border border-border/30 group-hover:border-accent/80">
          {thumbnail || type === "BOOK" ? (
            <div className="w-full h-full">
              <ScriptureContent
                type={type}
                title={title}
                imageUrl={thumbnail || ""}
                author={creator || undefined}
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-bg-secondary">
              <ContentIcon size={32} className="text-text-tertiary" />
            </div>
          )}

          {/* 하단 그라데이션 */}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* 랭크 뱃지 */}
          {rank && (
            <div className="absolute top-1.5 left-1.5 z-20 w-7 h-7 flex items-center justify-center bg-black/80 backdrop-blur-sm text-white text-xs font-bold rounded border border-white/30 shadow-lg group-hover:border-accent group-hover:text-accent">
              {rank}
            </div>
          )}

          {/* 통계 뱃지 - 클릭 시 모달 */}
          <button
            type="button"
            onClick={handleBadgeClick}
            className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-20"
          >
            <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2.5 py-1.5 rounded-full hover:bg-accent/80 cursor-pointer">
              <Users size={14} className="text-accent group-hover:text-white" />
              <span className="text-xs text-text-primary font-medium">
                {celebCount}
                {userCount > 0 && <span className="text-text-tertiary"> | {userCount}</span>}
              </span>
            </div>
            {avgRating && (
              <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-sm px-2.5 py-1.5 rounded-full">
                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                <span className="text-xs text-text-primary font-medium">{avgRating.toFixed(1)}</span>
              </div>
            )}
          </button>
        </div>

        {/* 카드 정보 */}
        <div className="p-2.5 flex-1 flex flex-col gap-0.5">
          <h3 className="text-xs font-semibold text-text-primary line-clamp-2 leading-tight group-hover:text-accent">
            {title}
          </h3>
          {creator && (
            <p className="text-[10px] text-text-secondary line-clamp-1">
              {creator.replace(/\^/g, ", ")}
            </p>
          )}
        </div>
      </Link>

      <ScriptureCelebModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        contentId={id}
        contentTitle={title}
        celebCount={celebCount}
        userCount={userCount}
      />
    </>
  );
}
