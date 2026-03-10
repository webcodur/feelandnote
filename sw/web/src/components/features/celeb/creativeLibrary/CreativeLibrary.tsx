"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SlidersHorizontal } from "lucide-react";
import { useWikiSummaries } from "./useWikiSummaries";
import ContentGrid from "@/components/ui/ContentGrid";
import { Pagination } from "@/components/ui";
import ControlPanel from "@/components/shared/ControlPanel";
import type { Locale } from "@/types/locale";

const ROLE_I18N_MAP: Record<string, string> = {
  author: "roleAuthor",
  director: "roleDirector",
  composer: "roleComposer",
  artist: "roleArtist",
  editor: "roleEditor",
  screenwriter: "roleScreenwriter",
  developer: "roleDeveloper",
  performer: "rolePerformer",
  notable: "roleNotable",
  creator: "roleCreator",
};

const WORK_TYPE_TABS = [
  { value: "all", i18nKey: "worksTypeAll" },
  { value: "BOOK", i18nKey: "worksTypeBook" },
  { value: "VIDEO", i18nKey: "worksTypeVideo" },
  { value: "MUSIC", i18nKey: "worksTypeMusic" },
  { value: "GAME", i18nKey: "worksTypeGame" },
  { value: "ART", i18nKey: "worksTypeArt" },
];

interface LiveWorkItem {
  id: string;
  title_en: string;
  title_ko: string;
  work_type: string | null;
  role: string;
  release_year: number | null;
  props: string[];
}

interface CreativeLibraryProps {
  celebId: string;
  celebNickname: string;
  wikidataQid?: string | null;
  hideControlWrapper?: boolean;
}

const PAGE_SIZE = 20;

export default function CreativeLibrary({
  celebId,
  celebNickname,
  wikidataQid,
  hideControlWrapper = false,
}: CreativeLibraryProps) {
  const locale = useLocale() as Locale;
  const t = useTranslations("celebPage");

  const [activeType, setActiveType] = useState("all");
  const [allItems, setAllItems] = useState<LiveWorkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [isControlsExpanded, setIsControlsExpanded] = useState(false);

  // 실시간 Wikidata 조회
  const loadLive = useCallback(async () => {
    if (!wikidataQid) { setIsLoading(false); return; }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/celeb-works?qid=${wikidataQid}`);
      const data = await res.json();
      setAllItems(data.works || []);
    } catch {
      setAllItems([]);
    }
    setIsLoading(false);
  }, [wikidataQid]);

  useEffect(() => { loadLive(); }, [loadLive]);

  useEffect(() => { setCurrentPage(1); }, [activeType]);

  // 타입별 카운트
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const item of allItems) {
      const t = item.work_type || "OTHER";
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }, [allItems]);

  const totalCount = allItems.length;

  const visibleTabs = useMemo(() => {
    return WORK_TYPE_TABS.filter(
      (tab) => tab.value === "all" || (typeCounts[tab.value] ?? 0) > 0
    );
  }, [typeCounts]);

  // 필터링 + 페이징
  const filtered = useMemo(() => {
    if (activeType === "all") return allItems;
    return allItems.filter((item) => item.work_type === activeType);
  }, [allItems, activeType]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Wikipedia summary fallback
  const wikiSummaryItems = useMemo(
    () => pageItems.map((item) => ({ id: item.id, title_en: item.title_en, description: null as string | null })),
    [pageItems]
  );
  const wikiSummaries = useWikiSummaries(wikiSummaryItems);

  if (!wikidataQid) {
    return (
      <div className="py-12 text-center text-text-secondary">
        {t("worksEmpty")}
      </div>
    );
  }

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

  const getSearchUrl = (item: LiveWorkItem) => {
    const keyword = `${item.title_en} ${celebNickname}`;
    return `https://search.naver.com/search.naver?query=${encodeURIComponent(keyword)}`;
  };

  const renderTabs = (className: string) => (
    <div className={className}>
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
  );

  return (
    <div>
      {hideControlWrapper ? (
        renderTabs("flex flex-wrap items-center justify-center gap-2 py-2 px-2")
      ) : (
        <ControlPanel
          title={t("worksControl")}
          icon={<SlidersHorizontal size={16} className="text-accent/70" />}
          isExpanded={isControlsExpanded}
          onToggleExpand={() => setIsControlsExpanded(!isControlsExpanded)}
          className="mb-6 sticky top-0 z-30 max-w-2xl mx-auto"
        >
          {renderTabs("flex flex-wrap gap-1.5")}
        </ControlPanel>
      )}

      <div className="py-8">
        {isLoading ? (
          <div className="py-12 text-center text-text-tertiary animate-pulse">
            {t("worksLoading")}
          </div>
        ) : pageItems.length === 0 ? (
          <div className="py-12 text-center text-text-secondary">
            {t("worksEmpty")}
          </div>
        ) : (
          <ContentGrid variant="list">
            {pageItems.map((item) => {
              const title = locale === "en"
                ? item.title_en
                : (item.title_ko || item.title_en);
              const description = wikiSummaries[item.id] || null;
              const roleLabel = getRoleLabel(item.role);
              const yearStr = item.release_year
                ? item.release_year < 0
                  ? `BC ${Math.abs(item.release_year)}`
                  : `${item.release_year}`
                : null;

              return (
                <div
                  key={item.id}
                  className="w-full max-w-[300px] md:max-w-none cursor-pointer"
                  onClick={() => window.open(getSearchUrl(item), "_blank")}
                >
                  <div className="p-4 rounded-xl border border-border/30 bg-surface/30 hover:bg-surface-hover/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2 text-[11px]">
                      {item.work_type && (
                        <span className="px-1.5 py-0.5 rounded bg-surface-hover text-text-secondary font-medium">
                          {item.work_type}
                        </span>
                      )}
                      <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
                        {roleLabel}
                      </span>
                      {yearStr && (
                        <span className="text-text-tertiary font-mono">{yearStr}</span>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-text-primary leading-snug">
                      {title}
                    </h3>
                    {locale === "en" && item.title_ko && (
                      <p className="text-sm text-text-secondary mt-0.5">{item.title_ko}</p>
                    )}
                    {locale !== "en" && item.title_en && item.title_ko && (
                      <p className="text-sm text-text-secondary mt-0.5">{item.title_en}</p>
                    )}
                    {description && (
                      <p className="text-sm text-text-secondary mt-2 line-clamp-2">{description}</p>
                    )}
                  </div>
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
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
