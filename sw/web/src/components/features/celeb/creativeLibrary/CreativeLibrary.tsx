"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SlidersHorizontal } from "lucide-react";
import { getCelebWorks, type CelebWorkItem } from "@/actions/celebs/getCelebWorks";
import { getCelebWorkCounts, type WorkTypeCounts } from "@/actions/celebs/getCelebWorkCounts";
import { ContentCard } from "@/components/ui/cards";
import ContentGrid from "@/components/ui/ContentGrid";
import { Pagination } from "@/components/ui";
import ControlPanel from "@/components/shared/ControlPanel";
import type { Locale } from "@/types/locale";
import { getCategoryByDbType } from "@/constants/categories";

const ROLE_LABELS: Record<string, Record<string, string>> = {
  ko: {
    author: "저자",
    director: "감독",
    composer: "작곡",
    artist: "작가",
    editor: "편저",
    screenwriter: "각본",
    developer: "개발",
    performer: "연주",
  },
  en: {
    author: "Author",
    director: "Director",
    composer: "Composer",
    artist: "Artist",
    editor: "Editor",
    screenwriter: "Screenwriter",
    developer: "Developer",
    performer: "Performer",
  },
};

const WORK_TYPE_TABS: { value: string; labelKo: string; labelEn: string }[] = [
  { value: "all", labelKo: "전체", labelEn: "All" },
  { value: "BOOK", labelKo: "도서", labelEn: "Books" },
  { value: "VIDEO", labelKo: "영상", labelEn: "Videos" },
  { value: "MUSIC", labelKo: "음악", labelEn: "Music" },
  { value: "GAME", labelKo: "게임", labelEn: "Games" },
  { value: "ART", labelKo: "미술", labelEn: "Art" },
];

interface CreativeLibraryProps {
  celebId: string;
  celebNickname: string;
}

export default function CreativeLibrary({ celebId, celebNickname }: CreativeLibraryProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("celebPage");

  const [activeType, setActiveType] = useState("all");
  const [items, setItems] = useState<CelebWorkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [typeCounts, setTypeCounts] = useState<WorkTypeCounts>({});
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);

  const totalCount = useMemo(
    () => Object.values(typeCounts).reduce((sum, c) => sum + c, 0),
    [typeCounts]
  );

  // 데이터가 있는 탭만 표시
  const visibleTabs = useMemo(() => {
    return WORK_TYPE_TABS.filter(
      (tab) => tab.value === "all" || (typeCounts[tab.value] ?? 0) > 0
    );
  }, [typeCounts]);

  const loadCounts = useCallback(async () => {
    const counts = await getCelebWorkCounts(celebId);
    setTypeCounts(counts);
  }, [celebId]);

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    const result = await getCelebWorks({
      celebId,
      workType: activeType === "all" ? undefined : activeType,
      page: currentPage,
      limit: pageSize,
    });
    setItems(result.items);
    setTotalPages(result.totalPages);
    setIsLoading(false);
  }, [celebId, activeType, currentPage, pageSize]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeType]);

  if (!isLoading && totalCount === 0) {
    return (
      <div className="py-12 text-center text-text-secondary">
        {t("worksEmpty")}
      </div>
    );
  }

  const getRoleLabel = (role: string) =>
    ROLE_LABELS[locale]?.[role] ?? ROLE_LABELS["ko"]?.[role] ?? role;

  const getSearchUrl = (item: CelebWorkItem) => {
    const keyword = item.search_keyword || item.title;
    return `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}`;
  };

  return (
    <div>
      {/* 카테고리 탭 */}
      <ControlPanel
        title={t("worksControl")}
        icon={<SlidersHorizontal size={16} className="text-accent/70" />}
        isExpanded={isControlsExpanded}
        onToggleExpand={() => setIsControlsExpanded(!isControlsExpanded)}
        className="mb-6 sticky top-0 z-30 max-w-2xl mx-auto"
      >
        <div className="flex flex-wrap gap-1.5">
          {visibleTabs.map((tab) => {
            const count = tab.value === "all" ? totalCount : (typeCounts[tab.value] ?? 0);
            const isActive = activeType === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveType(tab.value)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-accent/10 border-accent/20 text-accent"
                    : "bg-surface/50 border-border/40 text-text-tertiary hover:bg-surface-hover hover:text-text-primary"
                }`}
              >
                {locale === "en" ? tab.labelEn : tab.labelKo}
                <span className="ml-1 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      </ControlPanel>

      {/* 콘텐츠 목록 */}
      <div className="py-8">
        {isLoading ? (
          <div className="py-12 text-center text-text-tertiary animate-pulse">
            Loading...
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-text-secondary">
            {t("worksEmpty")}
          </div>
        ) : (
          <ContentGrid variant="list">
            {items.map((item) => {
              const hasContent = !!item.content;
              const title = hasContent
                ? (locale === "en" && item.content!.title_en
                    ? item.content!.title_en
                    : item.content!.title)
                : (locale === "en" && item.title_en ? item.title_en : item.title);
              const thumbnail = hasContent ? item.content!.thumbnail_url : null;
              const creator = hasContent ? item.content!.creator : null;
              const description = locale === "en" && item.description_en
                ? item.description_en
                : item.description;
              const contentId = hasContent ? item.content!.id : item.id;
              const href = hasContent
                ? `/content/${item.content!.id}?category=${getCategoryByDbType(item.content!.type)?.id || "book"}`
                : undefined;

              const roleLabel = getRoleLabel(item.role);
              const yearStr = item.release_year
                ? item.release_year < 0
                  ? `BC ${Math.abs(item.release_year)}`
                  : `${item.release_year}`
                : null;

              const headerContent = (
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
                    {roleLabel}
                  </span>
                  {yearStr && (
                    <span className="text-text-tertiary font-mono">{yearStr}</span>
                  )}
                </div>
              );

              return (
                <div key={item.id} className="w-full max-w-[300px] md:max-w-none">
                  <ContentCard
                    contentId={contentId}
                    contentType={hasContent ? (item.content!.type as any) : "BOOK"}
                    title={title}
                    creator={creator}
                    thumbnail={thumbnail}
                    review={description}
                    headerNode={headerContent}
                    href={href}
                    onClick={!hasContent ? () => window.open(getSearchUrl(item), "_blank") : undefined}
                    mobileLayout="review"
                    titleKo={hasContent ? item.content!.title_ko : null}
                    titleEn={hasContent ? item.content!.title_en : item.title_en}
                    creatorEn={hasContent ? item.content!.creator_en : null}
                    thumbnailEn={hasContent ? item.content!.thumbnail_en : null}
                    hasEnEdition={hasContent ? item.content!.has_en_edition : null}
                  />
                </div>
              );
            })}
          </ContentGrid>
        )}

        {/* 페이지네이션 */}
        {!isLoading && totalPages > 1 && (
          <>
            <hr className="border-white/10 mt-8 mb-8" />
            <div className="flex justify-center">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                onPageSizeChange={setPageSize}
                showPageSizeSelector
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
