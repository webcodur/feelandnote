"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { FeaturedTag } from "@/actions/home";
import { getTagChronologicalLibrary } from "@/actions/home/getTagChronologicalLibrary";
import { getCategoryByDbType } from "@/constants/categories";
import { cn } from "@/lib/utils";
import FeaturedSpotlightDesktop from "./FeaturedSpotlightDesktop";
import FeaturedSpotlightMobile from "./FeaturedSpotlightMobile";
import SharedLibraryView from "./SharedLibraryView";
import DialogueSubtitle from "@/components/features/game/shared/DialogueSubtitle";
import CelebContentTimeline from "@/components/features/game/shared/CelebContentTimeline";
import ContentReviewModal from "@/components/features/game/shared/ContentReviewModal";
import type { TimelineCeleb, TimelineContent } from "@/components/features/game/shared/CelebContentTimeline";
import type { DialogueSubtitleData } from "@/components/features/game/shared/hooks/useDialogue";

export type SpotlightLocation = "main" | "explore-pc" | "explore-mb";
type ViewMode = "spotlight" | "shared" | "timeline";

interface FeaturedSpotlightProps {
  tags: FeaturedTag[];
  location?: SpotlightLocation;
}

export default function FeaturedSpotlight({ tags, location = "main" }: FeaturedSpotlightProps) {
  const t = useTranslations("explore.spotlight");
  const tLanding = useTranslations("landing");
  const locale = useLocale() as 'ko' | 'en';
  const [activeTagIndex, setActiveTagIndex] = useState(0);
  const [subtitleData, setSubtitleData] = useState<DialogueSubtitleData | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("spotlight");

  const activeTag = tags.length > 0 ? tags[activeTagIndex] : null;
  const isExplore = location === "explore-pc" || location === "explore-mb";

  return (
    <div className="w-full relative">
      {/* ─── 태그 선택 (공통, 항상 표시) ─── */}
      {/* Mobile */}
      <div className="block md:hidden">
        <MobileTagSelector
          tags={tags}
          activeIndex={activeTagIndex}
          onChange={setActiveTagIndex}
          locale={locale}
        />
      </div>
      {/* Desktop */}
      <div className="hidden md:block">
        <DesktopTagSelector
          tags={tags}
          activeIndex={activeTagIndex}
          onChange={setActiveTagIndex}
          isExplore={isExplore}
          activeDescription={
            locale === 'en'
              ? (activeTag?.description_en ?? activeTag?.description ?? tLanding("defaultDescription"))
              : (activeTag?.description ?? tLanding("defaultDescription"))
          }
          locale={locale}
        />
      </div>

      {/* ─── 뷰 모드 탭 ─── */}
      {activeTag?.is_featured && (
        <ViewModeTabs viewMode={viewMode} onChange={setViewMode} t={t} />
      )}

      {/* ─── 콘텐츠 영역 ─── */}
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

          <DialogueSubtitle subtitle={subtitleData} />
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
    </div>
  );
}

/* ─── Mobile 태그 선택 (가로 스크롤 pill) ─── */
function MobileTagSelector({
  tags,
  activeIndex,
  onChange,
  locale,
}: {
  tags: FeaturedTag[];
  activeIndex: number;
  onChange: (idx: number) => void;
  locale: 'ko' | 'en';
}) {
  return (
    <div className="flex overflow-x-auto scrollbar-hidden px-2 mb-4 border-b border-white/5 pb-2">
      <div className="flex gap-1">
        {tags.map((tag, idx) => {
          const isActive = activeIndex === idx;
          const isUpcoming = !tag.is_featured;
          return (
            <button
              key={tag.id}
              onClick={() => !isUpcoming && onChange(idx)}
              disabled={isUpcoming}
              className={cn(
                "whitespace-nowrap px-4 py-2 text-sm font-medium rounded-full transition-all",
                isActive
                  ? "bg-accent text-bg-main font-bold shadow-lg shadow-accent/20"
                  : isUpcoming
                    ? "bg-white/5 text-text-tertiary/40 border border-white/5 opacity-50 cursor-not-allowed"
                    : "bg-white/5 text-text-tertiary border border-white/10"
              )}
            >
              {locale === 'en' ? (tag.name_en ?? tag.name) : tag.name}
              {isUpcoming && <span className="ml-1 text-[10px]">Soon</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Desktop 태그 선택 ─── */
function DesktopTagSelector({
  tags,
  activeIndex,
  onChange,
  isExplore,
  activeDescription,
  locale,
}: {
  tags: FeaturedTag[];
  activeIndex: number;
  onChange: (idx: number) => void;
  isExplore: boolean;
  activeDescription: string;
  locale: 'ko' | 'en';
}) {
  return (
    <div className={cn("max-w-5xl mx-auto", isExplore ? "px-0 pt-4" : "px-0")}>
      <div className="flex flex-wrap gap-1 pb-2 border-b border-white/5">
        {tags.map((tag, idx) => {
          const isActive = activeIndex === idx;
          return (
            <button
              key={tag.id}
              onClick={() => onChange(idx)}
              className={cn(
                "relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300",
                isActive
                  ? "text-accent font-bold"
                  : "text-text-tertiary hover:text-text-primary hover:bg-white/5"
              )}
            >
              {isActive && (
                <span className="absolute inset-0 bg-accent/5 rounded-t-lg border-b-2 border-accent" />
              )}
              <span className="relative z-10 font-sans tracking-wide">{locale === 'en' ? (tag.name_en ?? tag.name) : tag.name}</span>
            </button>
          );
        })}
      </div>
      <div className="animate-fade-in pl-1 mt-3 mb-4">
        <p className="text-sm md:text-[15px] text-text-secondary font-sans leading-relaxed break-keep opacity-90 max-w-4xl">
          {activeDescription}
        </p>
      </div>
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
    <div className="flex justify-center gap-1 py-2 mb-3 px-4">
      {modes.map((mode) => (
        <button
          key={mode}
          onClick={() => onChange(mode)}
          className={cn(
            "px-4 py-1.5 text-xs font-medium rounded-full transition-colors",
            viewMode === mode
              ? "bg-accent/20 text-accent border border-accent/30"
              : "text-text-tertiary hover:text-text-secondary hover:bg-white/5 border border-transparent"
          )}
        >
          {t(`tabs.${mode}`)}
        </button>
      ))}
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
