/*
  파일명: /components/features/scriptures/ScriptureCard.tsx
  기능: 경전(콘텐츠) 카드 컴포넌트
  책임: 콘텐츠를 카드 형태로 표시한다.
*/ // ------------------------------
"use client";

import Image from "next/image";
import Link from "next/link";
import { Book, Film, Gamepad2, Music, Award, Users, Star } from "lucide-react";
import { BLUR_DATA_URL } from "@/constants/image";
import { getCategoryByDbType } from "@/constants/categories";
import ScriptureContent from "@/components/features/scriptures/ScriptureContent";

// #region Types
interface ScriptureCardProps {
  id: string;
  title: string;
  creator?: string | null;
  thumbnail?: string | null;
  type: string;
  celebCount: number;
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
  avgRating,
  rank,
}: ScriptureCardProps) {
  const category = getCategoryByDbType(type);
  const href = `/content/${id}?category=${category?.id || "book"}`;
  const ContentIcon = TYPE_ICONS[type] || Book;

  return (
    <Link href={href} className="group flex flex-col transition-all">
      <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-bg-card border border-border/30 group-hover:border-accent/80 transition-colors duration-75">
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
          <div className="absolute top-2 left-2 z-20 w-6 h-6 flex items-center justify-center bg-accent text-white text-[10px] font-bold rounded-full shadow-lg">
            {rank}
          </div>
        )}

        {/* 통계 뱃지 */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-20">
          <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
            <Users size={10} className="text-accent" />
            <span className="text-[10px] text-text-primary font-medium">{celebCount}</span>
          </div>
          {avgRating && (
            <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm px-1.5 py-0.5 rounded-full">
              <Star size={10} className="text-yellow-500 fill-yellow-500" />
              <span className="text-[10px] text-text-primary font-medium">{avgRating.toFixed(1)}</span>
            </div>
          )}
        </div>
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
  );
}
