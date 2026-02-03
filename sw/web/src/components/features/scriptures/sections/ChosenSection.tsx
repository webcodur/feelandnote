/*
  파일명: /components/features/scriptures/sections/ChosenSection.tsx
  기능: 공통 서가 섹션
  책임: 가장 많은 인물이 감상한 경전을 카테고리별로 보여준다.
*/ // ------------------------------

"use client";

import { useState, useEffect, useTransition } from "react";
import { Scroll } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import { DecorativeLabel } from "@/components/ui";
import { ContentCard } from "@/components/ui/cards";
import ScriptureCelebModal from "../ScriptureCelebModal";
import SectionHeader from "@/components/shared/SectionHeader";
import { getCategoryByDbType } from "@/constants/categories";
import { getChosenScriptures, type ScripturesResult } from "@/actions/scriptures";
import type { ContentType } from "@/types/database";

// 인라인 래퍼 - ContentCard + Modal
function ScriptureContentCard({
  id, title, creator, thumbnail, type, celebCount, userCount = 0, avgRating, index,
}: {
  id: string; title: string; creator?: string | null; thumbnail?: string | null;
  type: string; celebCount: number; userCount?: number; avgRating?: number | null; index?: number;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const category = getCategoryByDbType(type);
  const href = `/content/${id}?category=${category?.id || "book"}`;

  return (
    <>
      <ContentCard
        thumbnail={thumbnail} title={title} creator={creator}
        contentType={type as ContentType} href={href} index={index}
        celebCount={celebCount} userCount={userCount} avgRating={avgRating ?? undefined}
        onStatsClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsModalOpen(true); }}
      />
      <ScriptureCelebModal
        isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        contentId={id} contentTitle={title} celebCount={celebCount} userCount={userCount}
      />
    </>
  );
}

// #region Types
type CategoryFilter = "ALL" | "BOOK" | "VIDEO" | "GAME" | "MUSIC";

interface Props {
  initialData: ScripturesResult;
}
// #endregion

// #region Constants
const CATEGORY_TABS: { value: CategoryFilter; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "BOOK", label: "도서" },
  { value: "VIDEO", label: "영상" },
  { value: "GAME", label: "게임" },
  { value: "MUSIC", label: "음악" },
];

const ITEMS_PER_PAGE = 12;
// #endregion

export default function ChosenSection({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [page, setPage] = useState(1);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    startTransition(async () => {
      const result = await getChosenScriptures({
        category: categoryFilter === "ALL" ? undefined : categoryFilter,
        page,
        limit: ITEMS_PER_PAGE,
      });
      setData(result);
    });
  }, [categoryFilter, page]);

  const handleCategoryChange = (category: CategoryFilter) => {
    setCategoryFilter(category);
    setPage(1);
  };

  return (
    <div>
      <SectionHeader
        title="공통 서가"
        label="CHOSEN ONES"
        description={
          <>
            가장 많은 인물이 감상한 경전.
            <br />
            <span className="text-text-tertiary text-xs sm:text-sm mt-1 block">
              수많은 위인이 같은 책을 선택했다면, 그건 우연이 아닙니다.
            </span>
          </>
        }
      />



      {/* 카테고리 선택 */}
      <div className="-mt-2 mb-4 flex justify-center">
        <DecorativeLabel label="카테고리 선택" />
      </div>
      <div className="mb-8 flex justify-center overflow-x-auto pb-4 scrollbar-hidden">
        <div className="inline-flex min-w-max p-1 bg-neutral-900/80 backdrop-blur-md rounded-xl border border-white/10 shadow-inner">
          {CATEGORY_TABS.map((tab) => {
            const isActive = categoryFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleCategoryChange(tab.value)}
                className={`
                  relative px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300
                  ${isActive 
                    ? "text-neutral-900 bg-gradient-to-br from-accent via-yellow-200 to-accent shadow-[0_0_15px_rgba(212,175,55,0.4)]" 
                    : "text-text-secondary hover:text-white hover:bg-white/5"
                  }
                `}
              >
                <span className={isActive ? "font-serif text-black" : "font-sans"}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 본문 라벨 */}
      <div className="mb-4 flex justify-center">
        <DecorativeLabel label="경전 목록" />
      </div>

      {/* 카드 그리드 */}
      <div className={`min-h-[300px] transition-opacity duration-500 ${isPending ? "opacity-50" : "opacity-100"}`}>
        {data.contents.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-3 md:gap-4 relative">
            {/* 배경 장식 (흐릿한 월계관 느낌) */}
            <div className="absolute inset-0 bg-radial-gradient from-accent/5 to-transparent opacity-50 pointer-events-none" />
            
            {data.contents.map((content, idx) => {
              const globalIndex = (page - 1) * ITEMS_PER_PAGE + idx + 1;
              const isTop3 = globalIndex <= 3;

              return (
                <div key={content.id} className="relative group">
                  {/* Top 3 강조 효과 */}
                  {isTop3 && (
                    <div className="absolute -inset-1 bg-gradient-to-br from-accent/30 to-transparent rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
                  )}

                  <ScriptureContentCard
                    id={content.id}
                    title={content.title}
                    creator={content.creator}
                    thumbnail={content.thumbnail_url}
                    type={content.type}
                    celebCount={content.celeb_count}
                    userCount={content.user_count}
                    avgRating={content.avg_rating}
                    index={globalIndex}
                  />
                  
                  {/* 순위 뱃지 커스텀 (기존 Card 내부 뱃지 외에 추가 강조가 필요하다면) */}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-60 bg-bg-card/30 rounded-xl border border-border/30 backdrop-blur-sm">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-3">
              <Scroll size={24} className="text-text-tertiary opacity-50" />
            </div>
            <p className="text-text-tertiary text-sm font-serif">선택된 경전이 없습니다</p>
          </div>
        )}
      </div>

      {/* 페이지네이션 */}
      {data.totalPages > 1 && (
        <div className="mt-6">
          <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
