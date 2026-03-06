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
import SpotlightTagDrawerDesktop from "./SpotlightTagDrawerDesktop";
import SpotlightTagSheetMobile from "./SpotlightTagSheetMobile";
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
      <div className="block md:hidden relative z-50">
        <SpotlightTagSheetMobile
          tags={tags}
          activeIndex={activeTagIndex}
          onChange={setActiveTagIndex}
          locale={locale}
        />
      </div>
      {/* Desktop */}
      <div className="hidden md:block relative z-40 mb-2">
        <SpotlightTagDrawerDesktop
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

      {/* ─── 태그 정보 (선택된 테마 제목 및 설명) ─── */}
      {activeTag?.is_featured && (
        <div className="max-w-3xl mx-auto flex flex-col items-center justify-center text-center px-6 pt-2 pb-4">
          <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-2">
            {locale === 'en' ? (activeTag.name_en ?? activeTag.name) : activeTag.name}
          </h2>
          <p className="text-text-secondary text-sm md:text-base max-w-xl leading-relaxed">
            {locale === 'en' 
              ? (activeTag.description_en ?? activeTag.description ?? tLanding("defaultDescription"))
              : (activeTag.description ?? tLanding("defaultDescription"))}
          </p>
        </div>
      )}

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
