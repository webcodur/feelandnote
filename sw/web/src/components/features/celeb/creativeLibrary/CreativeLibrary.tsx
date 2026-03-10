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

const ROLE_KEYS = ["author", "director", "composer", "artist", "editor", "screenwriter", "developer", "performer"] as const;

const ROLE_I18N_MAP: Record<string, string> = {
  author: "roleAuthor",
  director: "roleDirector",
  composer: "roleComposer",
  artist: "roleArtist",
  editor: "roleEditor",
  screenwriter: "roleScreenwriter",
  developer: "roleDeveloper",
  performer: "rolePerformer",
};

const WORK_TYPE_TABS = [
  { value: "all", i18nKey: "worksTypeAll" },
  { value: "BOOK", i18nKey: "worksTypeBook" },
  { value: "VIDEO", i18nKey: "worksTypeVideo" },
  { value: "MUSIC", i18nKey: "worksTypeMusic" },
  { value: "GAME", i18nKey: "worksTypeGame" },
  { value: "ART", i18nKey: "worksTypeArt" },
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

  const getRoleLabel = (role: string) => {
    const key = ROLE_I18N_MAP[role];
    return key ? t(key) : role;
  };

  const getSearchUrl = (item: CelebWorkItem) => {
    const keyword = item.search_keyword || item.title;
    return `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}`;
  };

  return (
    <div>
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
                {t(tab.i18nKey)}
                <span className="ml-1 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      </ControlPanel>

      <div className="py-8">
        {isLoading ? (
          <div className="py-12 text-center text-text-tertiary animate-pulse">
            {t("worksLoading")}
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-text-secondary">
            {t("worksEmpty")}
          </div>
        ) : (
          <ContentGrid variant="list">
            {items.map((item) => {
              const hasContent = !!item.content;
              // celeb_works.title_en을 content_locales en보다 우선
              const title = locale === "en" && item.title_en
                ? item.title_en
                : (hasContent ? item.content!.title : item.title);
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
                    reviewEn={item.description_en}
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
