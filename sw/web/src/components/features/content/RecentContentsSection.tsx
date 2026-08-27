/*
  파일명: /components/features/content/RecentContentsSection.tsx
  기능: 최근 접근한 콘텐츠 가로 스크롤 목록
  책임: 경량 썸네일+제목 카드로 최근 방문 콘텐츠를 렌더링한다.
*/ // ------------------------------
"use client";

import { Link } from "@/i18n/navigation";
import ContentImage from "@/components/ui/ContentImage";
import { Book, Film, Gamepad2, Music, ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback } from "react";
import { useHorizontalScroll } from "@/hooks/useHorizontalScroll";
import { getCategoryByDbType } from "@/constants/categories";
import type { RecentContentItem } from "@/hooks/useRecentContents";
import type { ContentType } from "@/types/database";

const TYPE_ICONS: Record<ContentType, typeof Book> = {
  BOOK: Book,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
};

interface RecentContentsSectionProps {
  items: RecentContentItem[];
}

export default function RecentContentsSection({ items }: RecentContentsSectionProps) {
  const t = useTranslations("contentDetail");
  const { scrollRef, isDragging, events } = useHorizontalScroll();
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, [scrollRef]);

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
    };
  }, [items.length, scrollRef, updateArrows]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    const step = el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <div className="mb-5 group/recent relative">
      <p className="text-[11px] md:text-xs font-medium tracking-wide text-text-secondary mb-2.5">{t("recentContents")}</p>
      {/* 좌우 넘김 버튼 — PC에서만, 즉각 축은 테두리·배경색, 페이드는 연출 축 */}
      <button
        type="button"
        aria-label={t("previousRecent")}
        onClick={() => scrollBy(-1)}
        disabled={!canLeft}
        className={`hidden md:flex absolute left-1 top-[calc(50%+10px)] -translate-y-1/2 z-10 h-8 w-8 items-center justify-center rounded-full border bg-black/70 backdrop-blur hover:bg-accent hover:text-black hover:border-accent border-white/15 text-white transition-opacity duration-200 ${canLeft ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <ChevronLeft size={16} />
      </button>
      <button
        type="button"
        aria-label={t("nextRecent")}
        onClick={() => scrollBy(1)}
        disabled={!canRight}
        className={`hidden md:flex absolute right-1 top-[calc(50%+10px)] -translate-y-1/2 z-10 h-8 w-8 items-center justify-center rounded-full border bg-black/70 backdrop-blur hover:bg-accent hover:text-black hover:border-accent border-white/15 text-white transition-opacity duration-200 ${canRight ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      >
        <ChevronRight size={16} />
      </button>
      <div
        ref={scrollRef}
        className={`flex gap-2 md:gap-3 overflow-x-auto scrollbar-hidden pb-1 scroll-smooth snap-x snap-mandatory ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
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
              className="flex-shrink-0 w-[72px] md:w-[108px] lg:w-[120px] group"
              onClick={(e) => isDragging && e.preventDefault()}
            >
              {/* 카드 — 즉각 축: 테두리·배경·제목색 (transition 없음) / 연출 축: 이미지 확대 (transition-transform) */}
              <div className="relative w-[72px] h-[100px] md:w-[108px] md:h-[150px] lg:w-[120px] lg:h-[168px] rounded-xl overflow-hidden border border-white/10 bg-bg-secondary group-hover:border-accent/60 group-hover:bg-white/[0.04]">
                {/* 이미지 — 연출 축만 transition */}
                <div className="absolute inset-0 overflow-hidden">
                  {item.thumbnail ? (
                    <ContentImage
                      src={item.thumbnail}
                      alt={item.title}
                      sizes="(max-width: 768px) 108px, 120px"
                      className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                      <Icon size={22} className="text-text-secondary" />
                    </div>
                  )}
                </div>
                {/* 내부 헤어라인 */}
                <span aria-hidden className="pointer-events-none absolute inset-[2px] rounded-[10px] border border-white/[0.06]" />
              </div>
              <p className="text-[10px] md:text-xs text-text-secondary line-clamp-2 leading-tight mt-1.5 group-hover:text-accent">
                {item.title}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
