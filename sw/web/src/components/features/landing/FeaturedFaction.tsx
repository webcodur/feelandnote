"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/types/locale";
import { useSearchParams } from "next/navigation";
import type { FeaturedTag } from "@/actions/home";
import { getTagChronologicalLibrary } from "@/actions/home/getTagChronologicalLibrary";
import { getCategoryByDbType } from "@/constants/categories";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import FactionShowcase from "./FactionShowcase";
import SharedLibraryView from "./SharedLibraryView";
import FactionTagDrawerDesktop from "./FactionTagDrawerDesktop";
import FactionTagSheetMobile from "./FactionTagSheetMobile";
import CelebContentTimeline from "@/components/features/game/shared/CelebContentTimeline";
import ContentReviewModal from "@/components/features/game/shared/ContentReviewModal";
import type { TimelineCeleb, TimelineContent } from "@/components/features/game/shared/CelebContentTimeline";

import FactionIntroView from "./FactionIntroView";

export type FactionLocation = "main" | "explore-pc" | "explore-mb";
type ViewMode = "faction" | "library";

interface FeaturedFactionProps {
  tags: FeaturedTag[];
  location?: FactionLocation;
  initialTagId?: string;
}

export default function FeaturedFaction({ tags, location = "main", initialTagId }: FeaturedFactionProps) {
  const t = useTranslations("explore.faction");
  const tLanding = useTranslations("landing");
  const locale = useLocale() as Locale;

  const isExplore = location === "explore-pc" || location === "explore-mb";
  
  const initialFound = initialTagId ? tags.findIndex(t => t.id === initialTagId) : -1;
  // 그룹 헤더 태그로 진입한 경우(예: /faction/ai)는 개별 테마가 아니므로 컬렉션 화면으로 연다.
  const initialIsGroup = initialFound >= 0 && !!tags[initialFound]?.isGroup;
  const initialIndex = initialFound >= 0 && !initialIsGroup ? initialFound : 0;

  const startIdx = (isExplore && !initialTagId) || initialIsGroup ? -1 : initialIndex;
  const [activeTagIndex, setActiveTagIndex] = useState(startIdx);
  const [viewMode, setViewMode] = useState<ViewMode>("faction");

  const searchParams = useSearchParams();
  const tagParam = searchParams.get('tag');

  // 주소의 ?tag= 가 바뀌면 그 테마로 맞춘다 — 효과 대신 렌더 중 조정(마운트 시점은 startIdx가 처리)
  const [prevTagParam, setPrevTagParam] = useState(tagParam);
  if (prevTagParam !== tagParam) {
    setPrevTagParam(tagParam);
    if (tagParam) {
      const idx = tags.findIndex((tag) => tag.id === tagParam);
      if (idx !== -1) setActiveTagIndex(tags[idx]?.isGroup ? -1 : idx);
    } else if (isExplore && !initialTagId) {
      // slug로 들어온 경우(initialTagId 존재)는 해당 테마를 유지. 쿼리·slug 없을 때만 컬렉션 화면으로.
      setActiveTagIndex(-1);
    }
  }

  const handleTagChange = (idx: number) => {
    setActiveTagIndex(idx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeTag = activeTagIndex >= 0 && tags.length > 0 ? tags[activeTagIndex] : null;

  // 선택된 테마를 주소창에 반영(공유 가능한 고유 주소). 페이지 이동 없이 주소만 갱신한다.
  useEffect(() => {
    if (!isExplore || typeof window === "undefined") return;
    const m = window.location.pathname.match(/^(.*\/explore\/faction)(?:\/[^/?#]+)?$/);
    if (!m) return;
    const base = m[1];
    const target = activeTag?.slug ? `${base}/${activeTag.slug}` : base;
    if (window.location.pathname !== target) {
      window.history.replaceState(window.history.state, "", target);
    }
    // 상단 배너 breadcrumb가 테마 변경을 따라오도록 알린다(replaceState는 라우터 갱신을 일으키지 않음).
    window.dispatchEvent(new CustomEvent("faction:theme", { detail: activeTag?.slug ?? null }));
  }, [activeTag?.slug, isExplore]);

  return (
    <div className="w-full relative">
      {/* 컬렉션으로 돌아가기 — 컬렉션 화면 자체에서는 상단 이동 경로(탐색 > 세력도감)가 있으므로 겹치는 「탐색」 링크를 두지 않는다 */}
      {isExplore && activeTagIndex !== -1 && (
        <div className="mb-4 relative z-50">
          <button
            onClick={() => {
              setActiveTagIndex(-1);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-1.5 text-sm hover:text-accent transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            {t("collection")}
          </button>
        </div>
      )}

      {/* ─── 태그 선택 (공통, 항상 표시) ─── */}
      {/* Mobile */}
      {activeTagIndex !== -1 && (
        <div className="block md:hidden relative z-50">
          <FactionTagSheetMobile
            tags={tags}
            activeIndex={activeTagIndex}
            onChange={handleTagChange}
            locale={locale}
          />
        </div>
      )}
      {/* Desktop */}
      {activeTagIndex !== -1 && (
        <div className="hidden md:block relative z-40 mb-2">
          <FactionTagDrawerDesktop
            tags={tags}
            activeIndex={activeTagIndex}
            onChange={handleTagChange}
            isExplore={isExplore}
            activeDescription={
              locale === 'en'
                ? (activeTag?.description_en ?? tLanding("defaultDescription"))
                : (activeTag?.description ?? tLanding("defaultDescription"))
            }
            locale={locale}
          />
        </div>
      )}

      {/* ─── 태그 정보 (선택된 테마 제목 및 설명) ─── */}
      {activeTag?.is_featured && (
        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center text-center px-4 md:px-6 pt-12 pb-10 relative">
          {/* Subtle background glow effect behind the title */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[100px] bg-accent/10 rounded-[100%] blur-[60px] pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-4 opacity-80">
            <span className="w-6 md:w-10 h-[1px] bg-gradient-to-r from-transparent to-accent/50" />
            <span className="text-[11px] md:text-xs font-cinzel text-accent tracking-[0.2em] uppercase font-bold">Theme</span>
            <span className="w-6 md:w-10 h-[1px] bg-gradient-to-l from-transparent to-accent/50" />
          </div>

          <h2 className="text-3xl md:text-4xl font-serif font-bold text-white mb-4 tracking-wide relative z-10 drop-shadow-md">
            {locale === 'en' ? (activeTag.name_en?.trim() || tLanding("unnamedFaction")) : activeTag.name}
          </h2>
          
          <p className="text-text-secondary text-sm md:text-[15px] max-w-xl leading-[1.8] opacity-90 text-pretty relative z-10">
            {locale === 'en' 
              ? (activeTag.description_en ?? tLanding("defaultDescription"))
              : (activeTag.description ?? tLanding("defaultDescription"))}
          </p>
        </div>
      )}

      {/* ─── 뷰 모드 탭 ─── */}
      {activeTag?.is_featured && activeTagIndex >= 0 && (
        <ViewModeTabs viewMode={viewMode} onChange={setViewMode} t={t} />
      )}

      {/* ─── 콘텐츠 영역 ─── */}
      {activeTagIndex === -1 ? (
        <FactionIntroView
          tags={tags}
          locale={locale}
        />
      ) : (
        <>
          {viewMode === "faction" && activeTag && (
            <div className="relative z-10">
              <FactionShowcase
                key={activeTag.id}
                activeTag={activeTag}
                locale={locale}
              />
            </div>
          )}

          {viewMode === "library" && activeTag && (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-10">
              {/* 함께 본 서재 (겹치는 콘텐츠, 있을 때만) */}
              <SharedLibraryView tagId={activeTag.id} embedded heading={t("library.sharedTitle")} />
              {/* 인물별 서재 (항상) */}
              <TimelineSection tagId={activeTag.id} t={t} locale={locale} />
            </div>
          )}
        </>
      )}
    </div>
  );
}


/* ─── 뷰 모드 탭 ─── */
function ViewModeTabs({
  viewMode,
  onChange,
  t,
}: {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
  t: ReturnType<typeof useTranslations>;
}) {
  const modes: ViewMode[] = ["faction", "library"];

  return (
    <div className="flex justify-center mb-8 px-4 relative z-10 w-full">
      <div className="inline-flex p-1 bg-white/5 border border-white/10 rounded-full backdrop-blur-md shadow-lg w-full max-w-fit overflow-x-auto hide-scrollbar">
        {modes.map((mode) => (
          <button
            key={mode}
            onClick={() => onChange(mode)}
            className={cn(
              "whitespace-nowrap px-5 md:px-7 py-2 text-[13px] md:text-[14px] font-semibold rounded-full transition-all duration-300",
              viewMode === mode
                ? "bg-accent/20 text-accent shadow-[0_0_15px_rgba(255,184,0,0.15)] ring-1 ring-accent/30"
                : "text-white/60 hover:text-white/90 hover:bg-white/10"
            )}
          >
            {t(`tabs.${mode}`)}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Timeline Section ─── */
function TimelineSection({
  tagId,
  t,
  locale,
}: {
  tagId: string;
  t: ReturnType<typeof useTranslations>;
  locale: string;
}) {
  /* 어느 테마의 결과인지 키로 함께 쥔다 — 로딩 여부는 "지금 테마의 결과가 왔는가"로 파생된다 */
  const [loaded, setLoaded] = useState<{
    tagId: string;
    celebs: TimelineCeleb[];
    contentsMap: Record<string, TimelineContent[]>;
  } | null>(null);
  const [reviewContent, setReviewContent] = useState<{
    content: TimelineContent;
    ownerNickname: string;
  } | null>(null);

  useEffect(() => {
    let active = true;
    getTagChronologicalLibrary(tagId).then((data) => {
      if (!active) return;
      setLoaded({ tagId, celebs: data.celebs, contentsMap: data.contentsMap });
    });
    return () => {
      active = false;
    };
  }, [tagId]);

  const isLoading = loaded?.tagId !== tagId;
  const celebs = isLoading ? [] : loaded!.celebs;
  const contentsMap = isLoading ? {} : loaded!.contentsMap;

  return (
    <div>
      <h4 className="text-sm font-cinzel uppercase tracking-wider text-center mb-5">
        {t("library.peopleTitle")}
      </h4>

      <CelebContentTimeline
        celebs={celebs}
        contentsMap={contentsMap}
        isLoading={isLoading}
        onReviewClick={(c, ownerNickname) =>
          setReviewContent({ content: c, ownerNickname })
        }
        emptyLabel={t("timeline.empty")}
        locale={locale}
      />

      <ContentReviewModal
        isOpen={!!reviewContent}
        onClose={() => setReviewContent(null)}
        title={
          locale === 'en'
            ? (reviewContent?.content.title_en ?? reviewContent?.content.title ?? "")
            : (reviewContent?.content.title ?? "")
        }
        creator={
          locale === 'en'
            ? (reviewContent?.content.creator_en ?? reviewContent?.content.creator)
            : reviewContent?.content.creator
        }
        review={
          locale === 'en'
            ? (reviewContent?.content.review_en ?? reviewContent?.content.review)
            : reviewContent?.content.review
        }
        sourceUrl={reviewContent?.content.sourceUrl}
        ownerNickname={reviewContent?.ownerNickname}
        contentDetailUrl={
          reviewContent
            ? `/content/${reviewContent.content.contentId}?category=${getCategoryByDbType(reviewContent.content.type)?.id || "book"}`
            : undefined
        }
      />
    </div>
  );
}
