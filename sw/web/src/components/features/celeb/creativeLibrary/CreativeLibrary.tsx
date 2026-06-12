"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SlidersHorizontal } from "lucide-react";
import { useWikiSummaries } from "./useWikiSummaries";
import WorkDetailModal, { type WorkDetailItem } from "./WorkDetailModal";
import WorkListItem from "./WorkListItem";
import { ROLE_I18N_MAP, WORK_TYPE_TABS, WORK_TYPE_I18N, PAGE_SIZE } from "./constants";
import { resolveWorkItem, getSearchUrl } from "./resolveWorkItem";
import type { LiveWorkItem } from "./types";
import ContentGrid from "@/components/ui/ContentGrid";
import { Pagination } from "@/components/ui";
import ControlPanel from "@/components/shared/ControlPanel";
import type { Locale } from "@/types/locale";

interface CreativeLibraryProps {
  celebId: string;
  celebNickname: string;
  wikidataQid?: string | null;
  hideControlWrapper?: boolean;
}

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
  const [loadingElapsed, setLoadingElapsed] = useState(0);
  const [selectedItem, setSelectedItem] = useState<WorkDetailItem | null>(null);

  // 로딩 경과 시간 타이머
  useEffect(() => {
    if (!isLoading) { setLoadingElapsed(0); return; }
    const start = Date.now();
    const timer = setInterval(() => setLoadingElapsed(Math.floor((Date.now() - start) / 1000)), 500);
    return () => clearInterval(timer);
  }, [isLoading]);

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
      const wt = item.work_type || "OTHER";
      counts[wt] = (counts[wt] || 0) + 1;
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
  const wikiSummaries = useWikiSummaries(wikiSummaryItems, locale);

  // ── 유틸 ──

  const getRoleLabel = (role: string) => {
    const key = ROLE_I18N_MAP[role];
    return key ? t(key) : role;
  };

  const getWorkTypeLabel = (type: string) => {
    const key = WORK_TYPE_I18N[type];
    return key ? t(key) : type;
  };

  const openDetail = (item: LiveWorkItem) => {
    const r = resolveWorkItem(item, locale);
    setSelectedItem({
      id: item.id,
      title: r.title,
      subTitle: r.subTitle,
      typeLabel: item.work_type ? getWorkTypeLabel(item.work_type) : null,
      roleLabel: getRoleLabel(item.role),
      yearStr: r.yearStr,
      thumbnail: r.thumbnail,
      genreLabel: r.genreLabel,
      durationStr: r.durationStr,
      publisher: item.publisher,
      pages: item.pages,
      record_label: item.record_label,
      materialLabel: r.materialLabel,
      locationLabel: r.locationLabel,
      collectionLabel: r.collectionLabel,
      imdb_id: item.imdb_id,
      description: wikiSummaries[item.id] || null,
      searchUrl: getSearchUrl(item, locale, celebNickname),
      wikidataQid: item.id,
      titleEn: item.title_en,
      titleKo: item.title_ko || null,
    });
  };

  // ── 렌더 ──

  if (!wikidataQid || (!isLoading && totalCount === 0)) {
    return (
      <div className="py-12 text-center text-text-secondary">
        {t("worksEmpty")}
      </div>
    );
  }

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
            <span className="ml-1 text-text-tertiary">{count}</span>
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
          <div className="py-12 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
            <p className="text-sm text-text-primary font-medium">
              {loadingElapsed < 3
                ? t("worksLoadingStep1")
                : loadingElapsed < 7
                  ? t("worksLoadingStep2")
                  : t("worksLoadingStep3")}
            </p>
            <div className="flex items-center gap-2 text-xs text-text-tertiary">
              <span>{loadingElapsed}s</span>
              <span>·</span>
              <span>{t("worksLoadingSource")}</span>
            </div>
          </div>
        ) : pageItems.length === 0 ? (
          <div className="py-12 text-center text-text-secondary">
            {t("worksEmpty")}
          </div>
        ) : (
          <ContentGrid variant="list">
            {pageItems.map((item) => (
              <WorkListItem
                key={item.id}
                item={item}
                resolved={resolveWorkItem(item, locale)}
                roleLabel={getRoleLabel(item.role)}
                typeLabel={item.work_type ? getWorkTypeLabel(item.work_type) : null}
                description={wikiSummaries[item.id] || null}
                onClick={() => openDetail(item)}
              />
            ))}
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

      {/* 작품 상세 모달 */}
      <WorkDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        locale={locale}
      />
    </div>
  );
}
