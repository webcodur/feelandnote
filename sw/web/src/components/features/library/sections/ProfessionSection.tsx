/*
  파일명: /components/features/library/sections/ProfessionSection.tsx
  기능: 길의 갈래 섹션
  책임: 분야별 인물들의 필독서를 보여준다.
*/ // ------------------------------

"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { Pagination } from "@/components/ui/Pagination";
import { DecorativeLabel } from "@/components/ui";
import { CategoryTabFilter } from "@/components/ui/CategoryTabFilter";
import { ContentCard } from "@/components/ui/cards";
import ContentGrid from "@/components/ui/ContentGrid";
import RepresentativeCelebs from "../RepresentativeCelebs";
import {
  CATEGORIES,
  getCategoryByDbType,
  type ContentTypeFilterValue,
} from "@/constants/categories";
import type { ContentType } from "@/types/database";
import SectionHeader from "@/components/shared/SectionHeader";
import {
  getLibraryByProfession,
  type LibraryByProfession as ProfessionData,
} from "@/actions/library";
import { PROFESSION_ROWS, PROFESSION_ROWS_EN } from "@/constants/library";
import { useTranslations, useLocale } from "next-intl";

// #region Types
interface ProfessionCount {
  profession: string;
  label: string;
  count: number;
}

interface Props {
  professionCounts: ProfessionCount[];
  initialProfession?: string;
}
// #endregion

const TARGET_ITEMS_PER_PAGE = 12;
const CONTENT_GRID_MIN_WIDTH = 150;
const CONTENT_GRID_GAP = 12;

function getResponsivePageSize(containerWidth: number) {
  const columns = Math.max(
    1,
    Math.floor((containerWidth + CONTENT_GRID_GAP) / (CONTENT_GRID_MIN_WIDTH + CONTENT_GRID_GAP)),
  );
  const rows = Math.max(2, Math.round(TARGET_ITEMS_PER_PAGE / columns));
  return columns * rows;
}

export default function ProfessionSection({ professionCounts, initialProfession }: Props) {
  const [data, setData] = useState<ProfessionData | null>(null);
  const resolved = initialProfession && professionCounts.some(p => p.profession === initialProfession)
    ? initialProfession
    : professionCounts.find(p => p.profession === 'entrepreneur')?.profession || professionCounts[0]?.profession || "";
  const [activeProfession, setActiveProfession] = useState(resolved);
  const [categoryFilter, setCategoryFilter] = useState<ContentTypeFilterValue>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | null>(null);
  const [isPending, startTransition] = useTransition();
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const pageSizeRef = useRef<number | null>(null);
  const locale = useLocale();
  const t = useTranslations("library.page.professionPage");
  const tp = useTranslations("profession");
  const tc = useTranslations("content.category");
  const te = useTranslations("library.page.empty");
  const rows = locale === "en" ? PROFESSION_ROWS_EN : PROFESSION_ROWS;
  const categoryTabs: { value: ContentTypeFilterValue; label: string }[] = [
    { value: "all", label: tc("all") },
    ...CATEGORIES.map((category) => ({
      value: category.dbType,
      label: tc(category.id),
    })),
  ];

  // 실제 그리드 폭에 맞춰 12개에 가장 가까운 완성 행 단위로 조회한다.
  useEffect(() => {
    const container = gridContainerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      const nextPageSize = getResponsivePageSize(entry.contentRect.width);
      if (pageSizeRef.current === nextPageSize) return;

      pageSizeRef.current = nextPageSize;
      setPage(1);
      setPageSize(nextPageSize);
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!activeProfession || pageSize === null) return;

    let cancelled = false;
    startTransition(async () => {
      const result = await getLibraryByProfession({
        profession: activeProfession,
        category: categoryFilter === "all" ? undefined : categoryFilter,
        page,
        limit: pageSize,
      });
      if (!cancelled) setData(result);
    });

    return () => {
      cancelled = true;
    };
  }, [activeProfession, categoryFilter, page, pageSize]);

  const handleProfessionChange = (profession: string) => {
    setActiveProfession(profession);
    setCategoryFilter("all");
    setPage(1);
  };

  const handleCategoryChange = (category: ContentTypeFilterValue) => {
    setCategoryFilter(category);
    setPage(1);
  };

  const handlePageChange = (pageNum: number) => {
    setPage(pageNum);
  };

  const totalPages = data && pageSize ? Math.ceil(data.total / pageSize) : 0;

  if (professionCounts.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
        <p className="text-sm">{te("noProfessionData")}</p>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title={t("title")}
        label="MASTERS OF THE FIELD"
        description={
          <>
            {t("description")}
            <br />
            <span className="text-sm mt-1 block">
              {t("descriptionSub")}
            </span>
          </>
        }
      />

      {/* 분야 선택 */}
      <div className="mb-6">
        <div className="flex justify-center mb-4">
          <DecorativeLabel label={t("selectProfession")} />
        </div>
        <div className="flex justify-center">
          <div className="inline-flex flex-col items-center gap-1.5 p-3 max-w-2xl bg-neutral-900/80 backdrop-blur-md rounded-xl border border-white/10 shadow-inner">
            {rows.map((row, ri) => (
              <div key={ri} className="flex justify-center gap-1.5">
                {row.map((key) => {
                  const item = professionCounts.find(p => p.profession === key);
                  if (!item) return null;

                  const isActive = activeProfession === item.profession;
                  return (
                    <button
                      key={item.profession}
                      onClick={() => handleProfessionChange(item.profession)}
                      className={`
                        inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold
                        ${isActive
                          ? "text-neutral-900 bg-gradient-to-br from-accent via-yellow-200 to-accent shadow-[0_0_15px_rgba(212,175,55,0.4)]"
                          : "text-text-secondary hover:text-white hover:bg-white/8"
                        }
                      `}
                    >
                      <span>{tp(item.profession)}</span>
                      <span
                        className={`
                          text-xs font-normal tabular-nums ml-0.5
                          ${isActive ? "text-neutral-900/60" : ""}
                        `}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 카테고리 선택 */}
      <div className="mb-8">
        <div className="flex justify-center mb-4">
          <DecorativeLabel label={t("selectCategory")} />
        </div>
        <CategoryTabFilter
          options={categoryTabs}
          value={categoryFilter}
          onChange={handleCategoryChange}
          className="mx-[-1rem] px-4 sm:mx-0 sm:px-0"
        />
      </div>

      <div className={`min-h-[300px] transition-opacity duration-300 ${isPending ? "opacity-50" : "opacity-100"}`}>
        {/* 대표 인물 */}
        {data?.topCelebs && data.topCelebs.length > 0 && (
          <div className="mb-10 sm:mb-14">
            <RepresentativeCelebs
              celebs={data.topCelebs}
              title={`${t("representativePrefix")}${tp(activeProfession)}`}
              centered
            />
          </div>
        )}

        {/* 카드 그리드 */}
        <div ref={gridContainerRef}>
          <div className="flex justify-center mb-6">
            <DecorativeLabel label={t("recommendedWorks")} />
          </div>
          
          {data && data.contents.length > 0 ? (
            <ContentGrid minWidth={CONTENT_GRID_MIN_WIDTH} gap={CONTENT_GRID_GAP}>
              {data.contents.map((content) => (
                <ContentCard
                  key={content.id}
                  contentId={content.id}
                  contentType={content.type as ContentType}
                  title={content.title}
                  creator={content.creator}
                  thumbnail={content.thumbnail_url}
                  rating={content.avg_rating ?? undefined}
                  href={`/content/${content.id}?category=${getCategoryByDbType(content.type)?.id || "book"}`}
                  addable={true}
                  titleKo={content.title_ko}
                  titleEn={content.title_en}
                  creatorEn={content.creator_en}
                  thumbnailEn={content.thumbnail_en}
                  hasEnEdition={content.has_en_edition}
                />
              ))}
            </ContentGrid>
          ) : !data ? (
            <ContentGrid
              minWidth={CONTENT_GRID_MIN_WIDTH}
              gap={CONTENT_GRID_GAP}
              className="animate-pulse"
            >
              {Array.from({ length: pageSize ?? TARGET_ITEMS_PER_PAGE }).map((_, i) => (
                <div key={i} className="aspect-[2/3] bg-bg-card rounded-xl" />
              ))}
            </ContentGrid>
          ) : (
            <div className="flex items-center justify-center h-40 bg-bg-card rounded-xl border border-border/30">
              <p className="text-sm">
                {te(categoryFilter === "all" ? "noProfession" : "noCategory")}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
        </div>
      )}
    </div>
  );
}
