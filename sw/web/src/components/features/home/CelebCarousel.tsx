"use client";

import { useState, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import CelebProfileCard from "./CelebProfileCard";
import { getCelebs } from "@/actions/home";
import type { CelebProfile } from "@/types/home";

interface CelebCarouselProps {
  initialCelebs: CelebProfile[];
  initialTotal: number;
  initialTotalPages: number;
}

export default function CelebCarousel({
  initialCelebs,
  initialTotal,
  initialTotalPages,
}: CelebCarouselProps) {
  const [celebs, setCelebs] = useState<CelebProfile[]>(initialCelebs);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handlePageChange = useCallback(async (page: number) => {
    setIsLoading(true);
    const result = await getCelebs({ page, limit: 8 });
    setCelebs(result.celebs);
    setCurrentPage(page);
    setTotalPages(result.totalPages);
    setIsLoading(false);
  }, []);

  // 모바일 스크롤 네비게이션
  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 200;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (celebs.length === 0 && initialTotal === 0) {
    return null;
  }

  return (
    <section>
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-5 bg-accent rounded-full" />
          <Sparkles size={18} className="text-accent" />
          <h2 className="text-lg font-bold">추천 셀럽</h2>
        </div>

        {/* PC: 페이지 네비게이션 */}
        {totalPages > 1 && (
          <div className="hidden md:flex items-center gap-2">
            <span className="text-xs text-text-secondary">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1 || isLoading}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages || isLoading}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* 모바일: 스크롤 네비게이션 */}
        <div className="flex md:hidden items-center gap-1">
          <button
            onClick={() => scroll("left")}
            className="p-1.5 rounded-lg bg-white/5 active:bg-white/10"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => scroll("right")}
            className="p-1.5 rounded-lg bg-white/5 active:bg-white/10"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* 모바일: 가로 스크롤 캐러셀 */}
      <div
        ref={scrollRef}
        className={`
          flex gap-4 overflow-x-auto scrollbar-hide scroll-smooth snap-x snap-mandatory
          -mx-4 px-4 pb-2
          md:hidden
          ${isLoading ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        {celebs.map((celeb) => (
          <div key={celeb.id} className="shrink-0 snap-start">
            <CelebProfileCard celeb={celeb} size="lg" />
          </div>
        ))}
      </div>

      {/* PC: 그리드 레이아웃 */}
      <div
        className={`
          hidden md:grid grid-cols-4 lg:grid-cols-8 gap-4
          ${isLoading ? "opacity-50 pointer-events-none" : ""}
        `}
      >
        {celebs.map((celeb) => (
          <CelebProfileCard key={celeb.id} celeb={celeb} size="md" />
        ))}
      </div>
    </section>
  );
}
