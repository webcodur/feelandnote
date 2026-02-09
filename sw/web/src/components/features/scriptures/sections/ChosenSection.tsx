/*
  파일명: /components/features/scriptures/sections/ChosenSection.tsx
  기능: 공통 서가 섹션
  책임: 가장 많은 인물이 감상한 경전을 카테고리별로 보여준다.
*/ // ------------------------------

"use client";

import { useState, useTransition } from "react";
import { Scroll } from "lucide-react";
import { Pagination } from "@/components/ui/Pagination";
import { DecorativeLabel } from "@/components/ui";
import { CategoryTabFilter } from "@/components/ui/CategoryTabFilter";
import { SavedContentCard } from "@/components/ui/cards";
import ContentGrid from "@/components/ui/ContentGrid";
import SectionHeader from "@/components/shared/SectionHeader";
import { getCategoryByDbType } from "@/constants/categories";
import { getChosenScriptures, type ScripturesResult } from "@/actions/scriptures";
import type { ContentType } from "@/types/database";

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

  // useEffect 제거 — 이벤트 핸들러에서 직접 fetch (Strict Mode 이중 실행 방지)
  const fetchData = (category: CategoryFilter, targetPage: number) => {
    startTransition(async () => {
      const result = await getChosenScriptures({
        category: category === "ALL" ? undefined : category,
        page: targetPage,
        limit: ITEMS_PER_PAGE,
      });
      setData(result);
    });
  };

  const handleCategoryChange = (category: CategoryFilter) => {
    setCategoryFilter(category);
    setPage(1);
    fetchData(category, 1);
  };

  const handlePageChange = (targetPage: number) => {
    setPage(targetPage);
    fetchData(categoryFilter, targetPage);
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
      <CategoryTabFilter
        options={CATEGORY_TABS}
        value={categoryFilter}
        onChange={handleCategoryChange}
        className="mb-8"
      />

      {/* 본문 라벨 */}
      <div className="mb-4 flex justify-center">
        <DecorativeLabel label="경전 목록" />
      </div>

      {/* 카드 그리드 */}
      <div className={`min-h-[300px] ${isPending ? "opacity-50" : ""}`}>
        {data.contents.length > 0 ? (
          <ContentGrid className="relative">
            {/* 배경 장식 (흐릿한 월계관 느낌) */}
            <div className="absolute inset-0 bg-radial-gradient from-accent/5 to-transparent opacity-50 pointer-events-none" />

            {data.contents.map((content, idx) => {
              const isTop3 = ((page - 1) * ITEMS_PER_PAGE + idx + 1) <= 3;

              return (
                <div key={content.id} className="relative group">
                  {/* Top 3 강조 효과 */}
                  {isTop3 && (
                    <div className="absolute -inset-1 bg-gradient-to-br from-accent/30 to-transparent rounded-xl blur-sm opacity-0 group-hover:opacity-100" />
                  )}

                  <SavedContentCard
                    contentId={content.id}
                    contentType={content.type as ContentType}
                    title={content.title}
                    creator={content.creator}
                    thumbnail={content.thumbnail_url}
                    celebCount={content.celeb_count}
                    userCount={content.user_count}
                    rating={content.avg_rating ?? undefined}
                    href={`/content/${content.id}?category=${getCategoryByDbType(content.type)?.id || "book"}`}
                  />

                  {/* 순위 뱃지 커스텀 (기존 Card 내부 뱃지 외에 추가 강조가 필요하다면) */}
                </div>
              );
            })}
          </ContentGrid>
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
          <Pagination currentPage={page} totalPages={data.totalPages} onPageChange={handlePageChange} />
        </div>
      )}
    </div>
  );
}
