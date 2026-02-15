/*
  파일명: /components/features/content/RecentContentsSection.tsx
  기능: 최근 접근한 콘텐츠 가로 스크롤 목록
  책임: 경량 썸네일+제목 카드로 최근 방문 콘텐츠를 렌더링한다.
*/ // ------------------------------
"use client";

import Link from "next/link";
import Image from "next/image";
import { Book, Film, Gamepad2, Music, Award } from "lucide-react";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";
import { getCategoryByDbType } from "@/constants/categories";
import { BLUR_DATA_URL } from "@/constants/image";
import type { RecentContentItem } from "@/hooks/useRecentContents";
import type { ContentType } from "@/types/database";

const TYPE_ICONS: Record<ContentType, typeof Book> = {
  BOOK: Book,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
  CERTIFICATE: Award,
};

interface RecentContentsSectionProps {
  items: RecentContentItem[];
}

export default function RecentContentsSection({ items }: RecentContentsSectionProps) {
  const { scrollRef, isDragging, events } = useHorizontalScroll();

  if (items.length === 0) return null;

  return (
    <div className="mb-4">
      <p className="text-[11px] text-text-tertiary mb-2">최근 본 콘텐츠</p>
      <div
        ref={scrollRef}
        className={`flex gap-2 overflow-x-auto scrollbar-hidden ${isDragging ? "cursor-grabbing" : ""}`}
        {...events}
      >
        {items.map((item) => {
          const category = getCategoryByDbType(item.type);
          const href = `/content/${item.id}?category=${category?.id || "book"}`;
          const Icon = TYPE_ICONS[item.type];

          return (
            <Link
              key={item.id}
              href={href}
              className="flex-shrink-0 w-[72px] group"
              onClick={(e) => isDragging && e.preventDefault()}
            >
              <div className="relative w-[72px] h-[100px] rounded-lg overflow-hidden border border-white/10 group-hover:border-accent/40 transition-colors bg-bg-secondary">
                {item.thumbnail ? (
                  <Image
                    src={item.thumbnail}
                    alt={item.title}
                    fill
                    sizes="72px"
                    className="object-cover"
                    placeholder="blur"
                    blurDataURL={BLUR_DATA_URL}
                    unoptimized
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-white/5">
                    <Icon size={20} className="text-text-tertiary" />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-text-secondary line-clamp-2 leading-tight mt-1 group-hover:text-accent transition-colors">
                {item.title}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
