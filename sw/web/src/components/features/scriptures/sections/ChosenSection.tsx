/*
  파일명: /components/features/scriptures/sections/ChosenSection.tsx
  기능: 다수의 선택 섹션
  책임: 가장 많은 인물이 감상한 경전을 카테고리별로 보여준다.
*/ // ------------------------------

"use client";

import { useState, useEffect, useTransition } from "react";
import { Scroll } from "lucide-react";
import { Tabs, Tab } from "@/components/ui/Tab";
import { Pagination } from "@/components/ui/Pagination";
import ScriptureCard from "../ScriptureCard";
import { getChosenScriptures, type ScripturesResult } from "@/actions/scriptures";

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
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-2 mb-2">
        <Scroll size={20} className="text-accent" />
        <h2 className="text-lg md:text-xl font-serif font-bold text-text-primary">다수의 선택</h2>
        <span className="text-sm text-text-tertiary">({data.total})</span>
      </div>
      <p className="text-sm text-text-secondary mb-6">가장 많은 인물이 감상한 경전</p>

      {/* 카테고리 탭 */}
      <div className="mb-6 overflow-x-auto scrollbar-hidden flex justify-center">
        <Tabs className="border-b border-border/30">
          {CATEGORY_TABS.map((tab) => (
            <Tab
              key={tab.value}
              active={categoryFilter === tab.value}
              onClick={() => handleCategoryChange(tab.value)}
              label={tab.label}
              className="whitespace-nowrap"
            />
          ))}
        </Tabs>
      </div>

      {/* 카드 그리드 */}
      <div className={`min-h-[300px] ${isPending ? "opacity-50" : ""}`}>
        {data.contents.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
            {data.contents.map((content, index) => (
              <ScriptureCard
                key={content.id}
                id={content.id}
                title={content.title}
                creator={content.creator}
                thumbnail={content.thumbnail_url}
                type={content.type}
                celebCount={content.celeb_count}
                avgRating={content.avg_rating}
                rank={(page - 1) * ITEMS_PER_PAGE + index + 1}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
            <p className="text-text-tertiary text-sm">해당 카테고리의 경전이 없습니다</p>
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
