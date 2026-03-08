"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { Locale } from "@/types/locale";
import { useSearchParams } from "next/navigation";
import { useRouter, usePathname } from "@/i18n/navigation";
import type { FeaturedTag } from "@/actions/home";
import { getTagChronologicalLibrary } from "@/actions/home/getTagChronologicalLibrary";
import { getCategoryByDbType } from "@/constants/categories";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { ArrowLeft } from "lucide-react";
import FeaturedSpotlightDesktop from "./FeaturedSpotlightDesktop";
import FeaturedSpotlightMobile from "./FeaturedSpotlightMobile";
import SharedLibraryView from "./SharedLibraryView";
import SpotlightTagDrawerDesktop from "./SpotlightTagDrawerDesktop";
import SpotlightTagSheetMobile from "./SpotlightTagSheetMobile";
import { useDialogueSubtitle } from "@/components/features/game/shared/hooks/useDialogue";
import CelebContentTimeline from "@/components/features/game/shared/CelebContentTimeline";
import ContentReviewModal from "@/components/features/game/shared/ContentReviewModal";
import type { TimelineCeleb, TimelineContent } from "@/components/features/game/shared/CelebContentTimeline";
import type { DialogueSubtitleData } from "@/components/features/game/shared/hooks/useDialogue";

import SpotlightIntroView from "./SpotlightIntroView";

export type SpotlightLocation = "main" | "explore-pc" | "explore-mb";
type ViewMode = "spotlight" | "shared" | "timeline";

interface FeaturedSpotlightProps {
  tags: FeaturedTag[];
  location?: SpotlightLocation;
  initialTagId?: string;
}

export default function FeaturedSpotlight({ tags, location = "main", initialTagId }: FeaturedSpotlightProps) {
  const t = useTranslations("explore.spotlight");
  const tLanding = useTranslations("landing");
  const tNav = useTranslations("nav");
  const locale = useLocale() as Locale;

  const isExplore = location === "explore-pc" || location === "explore-mb";
  
  const initialIndex = initialTagId
    ? Math.max(0, tags.findIndex(t => t.id === initialTagId))
    : 0;

  const startIdx = isExplore && !initialTagId ? -1 : initialIndex;
  const [activeTagIndex, setActiveTagIndex] = useState(startIdx);
  const { handleSubtitle: setSubtitleData } = useDialogueSubtitle();
  const [viewMode, setViewMode] = useState<ViewMode>("spotlight");

  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const tagParam = searchParams.get('tag');

  useEffect(() => {
    if (tagParam) {
      const idx = tags.findIndex((t) => t.id === tagParam);
      if (idx !== -1) setActiveTagIndex(idx);
    } else if (isExplore) {
      setActiveTagIndex(-1);
    }
  }, [tagParam, isExplore, tags]);

  const handleTagChange = (idx: number) => {
    setActiveTagIndex(idx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const activeTag = activeTagIndex >= 0 && tags.length > 0 ? tags[activeTagIndex] : null;

  return (
    <div className="w-full relative">
      {/* Custom Back Navigation for Explore Spotlight */}
      {isExplore && (
        <div className="mb-4 relative z-50">
          {activeTagIndex === -1 ? (
            <Link
              href="/explore"
              className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-accent transition-colors"
            >
              <ArrowLeft size={14} />
              {tNav("explore")}
            </Link>
          ) : (
            <button
              onClick={() => {
                setActiveTagIndex(-1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="inline-flex items-center gap-1.5 text-sm text-text-tertiary hover:text-accent transition-colors cursor-pointer"
            >
              <ArrowLeft size={14} />
              {t("collection")}
            </button>
          )}
        </div>
      )}

      {/* ─── 태그 선택 (공통, 항상 표시) ─── */}
      {/* Mobile */}
      {activeTagIndex !== -1 && (
        <div className="block md:hidden relative z-50">
          <SpotlightTagSheetMobile
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
          <SpotlightTagDrawerDesktop
            tags={tags}
            activeIndex={activeTagIndex}
            onChange={handleTagChange}
            isExplore={isExplore}
            activeDescription={
              locale === 'en'
                ? (activeTag?.description_en ?? activeTag?.description ?? tLanding("defaultDescription"))
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
            {locale === 'en' ? (activeTag.name_en ?? activeTag.name) : activeTag.name}
          </h2>
          
          <p className="text-text-secondary text-sm md:text-[15px] max-w-xl leading-[1.8] opacity-90 text-pretty relative z-10">
            {locale === 'en' 
              ? (activeTag.description_en ?? activeTag.description ?? tLanding("defaultDescription"))
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
        <SpotlightIntroView
          tags={tags}
          onSelect={handleTagChange}
          locale={locale}
        />
      ) : (
        <>
          {viewMode === "spotlight" && (
            <>
              {/* Mobile (< 768px) */}
              <div className="block md:hidden relative z-10">
                <FeaturedSpotlightMobile
                  activeTag={activeTag}
                  onSubtitle={setSubtitleData}
                />
              </div>

              {/* Desktop (>= 768px) */}
              <div className="hidden md:block relative z-10">
                <FeaturedSpotlightDesktop
                  activeTag={activeTag}
                  location={location === "explore-mb" ? "main" : location}
                  onSubtitle={setSubtitleData}
                />
              </div>

            </>
          )}

          {viewMode === "shared" && activeTag && (
            <div className="max-w-3xl mx-auto px-4 py-6">
              <SharedLibraryView tagId={activeTag.id} />
            </div>
          )}

          {viewMode === "timeline" && activeTag && (
            <TimelineSection tagId={activeTag.id} t={t} locale={locale} />
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
  const modes: ViewMode[] = ["spotlight", "shared", "timeline"];

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
  const [celebs, setCelebs] = useState<TimelineCeleb[]>([]);
  const [contentsMap, setContentsMap] = useState<Record<string, TimelineContent[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [reviewContent, setReviewContent] = useState<{
    content: TimelineContent;
    ownerNickname: string;
  } | null>(null);

  useEffect(() => {
    setIsLoading(true);
    getTagChronologicalLibrary(tagId).then((data) => {
      setCelebs(data.celebs);
      setContentsMap(data.contentsMap);
      setIsLoading(false);
    });
  }, [tagId]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <h4 className="text-sm text-text-tertiary font-cinzel uppercase tracking-wider text-center mb-5">
        {t("timeline.title")}
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
