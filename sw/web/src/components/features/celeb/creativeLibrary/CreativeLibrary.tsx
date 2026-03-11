"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { SlidersHorizontal, Clock, BookOpen, Building2, MapPin, Palette } from "lucide-react";
import { useWikiSummaries } from "./useWikiSummaries";
import WorkDetailModal, { type WorkDetailItem } from "./WorkDetailModal";
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

// work_type → i18n 키 (배지 표시용)
const WORK_TYPE_I18N: Record<string, string> = {
  BOOK: "worksTypeBook",
  VIDEO: "worksTypeVideo",
  MUSIC: "worksTypeMusic",
  GAME: "worksTypeGame",
  ART: "worksTypeArt",
};

const WORK_TYPE_EMOJI: Record<string, string> = {
  BOOK: "📖",
  VIDEO: "🎬",
  MUSIC: "🎵",
  ART: "🎨",
};

interface LiveWorkItem {
  id: string;
  title_en: string;
  title_ko: string;
  work_type: string | null;
  role: string;
  release_year: number | null;
  props: string[];
  image: string | null;
  genre: string | null;
  genre_ko: string | null;
  imdb_id: string | null;
  poster: string | null;
  duration: number | null;
  publisher: string | null;
  pages: number | null;
  isbn: string | null;
  record_label: string | null;
  music_duration: number | null;
  collection: string | null;
  collection_ko: string | null;
  material: string | null;
  material_ko: string | null;
  location: string | null;
  location_ko: string | null;
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

  const getSearchUrl = (item: LiveWorkItem) => {
    const title = locale === "en" ? item.title_en : (item.title_ko || item.title_en);
    const keyword = `${title} ${celebNickname}`;
    return `https://www.google.com/search?q=${encodeURIComponent(keyword)}`;
  };

  const resolveItem = (item: LiveWorkItem): {
    title: string;
    subTitle: string | null;
    yearStr: string | null;
    thumbnail: string | null;
    genreLabel: string | null;
    durationStr: string | null;
    collectionLabel: string | null;
    materialLabel: string | null;
    locationLabel: string | null;
  } => {
    const title = locale === "en" ? item.title_en : (item.title_ko || item.title_en);
    const subTitle = locale === "ko" && item.title_ko ? item.title_en : null;
    const yearStr = item.release_year
      ? item.release_year < 0 ? `BC ${Math.abs(item.release_year)}` : `${item.release_year}`
      : null;
    const thumbnail = item.image || null;
    const genreLabel = locale === "en" ? item.genre : (item.genre_ko || item.genre);
    const durationStr = item.duration
      ? item.duration >= 60
        ? `${Math.floor(item.duration / 60)}h ${item.duration % 60}m`
        : `${item.duration}m`
      : null;
    const collectionLabel = locale === "en" ? item.collection : (item.collection_ko || item.collection);
    const materialLabel = locale === "en" ? item.material : (item.material_ko || item.material);
    const locationLabel = locale === "en" ? item.location : (item.location_ko || item.location);
    return { title, subTitle, yearStr, thumbnail, genreLabel, durationStr, collectionLabel, materialLabel, locationLabel };
  };

  const openDetail = (item: LiveWorkItem) => {
    const r = resolveItem(item);
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
      searchUrl: getSearchUrl(item),
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
            {pageItems.map((item) => {
              const r = resolveItem(item);
              const roleLabel = getRoleLabel(item.role);
              const description = wikiSummaries[item.id] || null;

              return (
                <div
                  key={item.id}
                  className="w-full max-w-[300px] md:max-w-none cursor-pointer"
                  onClick={() => openDetail(item)}
                >
                  <div className="flex gap-3 p-3 rounded-xl border border-border/30 bg-surface/30 hover:bg-surface-hover/50 transition-colors">
                    {/* 썸네일 */}
                    {r.thumbnail ? (
                      <div className="shrink-0 w-16 h-22 rounded-lg overflow-hidden bg-surface-hover">
                        <img
                          src={r.thumbnail}
                          alt={r.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      </div>
                    ) : (
                      <div className="shrink-0 w-16 h-22 rounded-lg bg-surface-hover/50 flex items-center justify-center">
                        <span className="text-text-tertiary text-lg">
                          {WORK_TYPE_EMOJI[item.work_type || ""] || "📄"}
                        </span>
                      </div>
                    )}

                    {/* 정보 */}
                    <div className="flex-1 min-w-0">
                      {/* 배지 행 */}
                      <div className="flex items-center gap-1.5 mb-1.5 text-xs">
                        {item.work_type && (
                          <span className="px-1.5 py-0.5 rounded bg-surface-hover text-text-secondary font-medium">
                            {getWorkTypeLabel(item.work_type)}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
                          {roleLabel}
                        </span>
                        {r.yearStr && (
                          <span className="text-text-tertiary font-mono">{r.yearStr}</span>
                        )}
                      </div>

                      {/* 제목 */}
                      <h3 className="text-sm font-medium text-text-primary leading-snug line-clamp-2">
                        {r.title}
                      </h3>
                      {r.subTitle && (
                        <p className="text-sm text-text-secondary mt-0.5 truncate">{r.subTitle}</p>
                      )}

                      {/* 메타 정보 */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-xs text-text-tertiary">
                        {r.genreLabel && <span>{r.genreLabel}</span>}
                        {r.durationStr && (
                          <span className="flex items-center gap-0.5">
                            <Clock size={10} />
                            {r.durationStr}
                          </span>
                        )}
                        {item.publisher && (
                          <span className="flex items-center gap-0.5">
                            <Building2 size={10} />
                            {item.publisher}
                          </span>
                        )}
                        {item.pages && (
                          <span className="flex items-center gap-0.5">
                            <BookOpen size={10} />
                            {item.pages}p
                          </span>
                        )}
                        {item.record_label && <span>{item.record_label}</span>}
                        {r.materialLabel && (
                          <span className="flex items-center gap-0.5">
                            <Palette size={10} />
                            {r.materialLabel}
                          </span>
                        )}
                        {r.locationLabel && (
                          <span className="flex items-center gap-0.5">
                            <MapPin size={10} />
                            {r.locationLabel}
                          </span>
                        )}
                        {r.collectionLabel && <span>{r.collectionLabel}</span>}
                        {item.imdb_id && (
                          <span className="text-amber-400 font-bold">IMDb</span>
                        )}
                      </div>

                      {/* 설명 */}
                      {description && (
                        <p className="text-sm text-text-secondary mt-1.5 line-clamp-2">{description}</p>
                      )}
                    </div>
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

      {/* 작품 상세 모달 */}
      <WorkDetailModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        locale={locale}
      />
    </div>
  );
}
