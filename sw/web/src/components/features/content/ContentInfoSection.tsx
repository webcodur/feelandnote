/*
  파일명: /components/features/content/ContentInfoSection.tsx
  기능: 콘텐츠 정보 섹션
  책임: 좌측 포스터와 우측 메인 영역(제목, 미니멀 인라인 스펙, 군더더기 없는 클린 소개 줄거리)을 제공한다.
*/ // ------------------------------
"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import ContentImage from "@/components/ui/ContentImage";
import BookPurchaseLinks from "@/components/features/commerce/BookPurchaseLinks";
import Yes24Sales from "@/components/features/commerce/Yes24Sales";
import BookPurchaseInfo from "@/components/shared/BookPurchaseInfo";
import BookIntroductionPanel from "@/components/shared/BookIntroductionPanel";
import DeveloperCollectionJourney from "@/components/features/commerce/DeveloperCollectionJourney";
import { useBookPurchaseLinks } from "@/components/features/commerce/useBookPurchaseLinks";
import {
  Book,
  Film,
  Gamepad2,
  Music,
  User,
  Calendar,
  Star,
  Clock,
  ChevronDown,
  ChevronUp,
  Disc,
} from "lucide-react";
import { FormattedText } from "@/components/ui";
import DecorativeLabel from "@/components/ui/DecorativeLabel";
import NoEditionBadge from "@/components/ui/NoEditionBadge";
import CreatorNames from "@/components/shared/content/creatorLink/CreatorNames";
import MediaEmbed from "./MediaEmbed";
import type { ContentDetailData } from "@/actions/contents/getContentDetail";
import type { ContentType } from "@/types/database";
import type { ContentMetadata } from "@/types/content";
import { cn } from "@/lib/utils";
import { useBookIntroduction } from "@/hooks/useBookIntroduction";
import { useClippedText } from "@/hooks/useClippedText";
import PendingBlock from "@/components/ui/pending/PendingBlock";
import RetryBlock from "@/components/ui/pending/RetryBlock";

// #region 상수
const TYPE_ICONS: Record<ContentType, typeof Book> = {
  BOOK: Book,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
};
// #endregion

interface ContentInfoSectionProps {
  content: ContentDetailData["content"];
}

export default function ContentInfoSection({ content }: ContentInfoSectionProps) {
  const t = useTranslations("contentDetail");
  const tCore = useTranslations("shared.content");
  const tCeleb = useTranslations("celebPage");
  const locale = useLocale();
  const bookIntroduction = useBookIntroduction(
    content.type === 'BOOK' ? content.bookIntroduction : null,
    locale,
    content.type === 'BOOK' ? content.description : null,
  );
  const description = content.type === 'BOOK' ? bookIntroduction.description : content.description;
  const [isStoryExpanded, setIsStoryExpanded] = useState(false);
  const { ref: storylineRef, isClipped: isStoryLong } = useClippedText(
    content.metadata?.storyline as string | undefined,
    !isStoryExpanded,
  );

  const Icon = TYPE_ICONS[content.type];

  /* 도서 구매·검색 링크 */
  const affiliateLinks = useBookPurchaseLinks({
    contentId: content.id,
    locale,
    isBook: content.type === "BOOK",
    title: content.title,
    creator: content.creator,
    editionId: content.purchaseEditionId,
    existingLinks: content.affiliateLinks,
  });
  /* 수수료 안내 — 판매 단추 안에 묻지 않고 표지 우상단에 띄운다 */
  const showPurchaseInfo = affiliateLinks.some(
    (link) => link.linkKind !== "search" && (link.platform === "yes24" || link.platform === "coupang"),
  );

  const metadata = content.metadata as unknown as ContentMetadata | null;

  // 메타데이터 값 추출
  const ratingValue = metadata?.voteAverage ?? metadata?.rating;
  const hasRating = ratingValue !== undefined && ratingValue > 0;
  const genres = metadata?.genres;
  const runtime = metadata?.runtime;
  const isMovieOrTv = content.type === "VIDEO";

  // 창작자 역할 라벨
  const creatorRoleLabel =
    content.type === "VIDEO"
      ? t("director")
      : content.type === "BOOK"
      ? t("author")
      : content.type === "GAME"
      ? t("developer")
      : t("artist");

  return (
    <div className="pt-2 space-y-6">
      {/* 메인 상단 2열 인포: 좌측 포스터 + 우측 메인 영역 */}
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 md:gap-7 items-start">
        {/* 좌측: 포스터 & 제휴 구매 링크 */}
        <div className="flex flex-col gap-3 shrink-0 self-center sm:self-start w-32 sm:w-40 md:w-48">
          {/* 포스터 + 글로우 */}
          <div className="relative group w-full">
            {content.thumbnail && (
              <div
                className="absolute -inset-1.5 md:-inset-2 rounded-2xl bg-accent/20 blur-lg md:blur-xl opacity-60 group-hover:opacity-90 transition-opacity pointer-events-none"
                aria-hidden="true"
              />
            )}
            <div className="relative w-full aspect-[2/3] rounded-xl md:rounded-2xl shadow-2xl overflow-hidden border border-white/15 bg-black/40">
              {content.thumbnail ? (
                <ContentImage
                  src={content.thumbnail}
                  alt={content.title}
                  sizes="(max-width: 640px) 128px, (max-width: 768px) 160px, 192px"
                  className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-950 flex items-center justify-center">
                  <Icon size={36} className="text-text-secondary md:w-10 md:h-10" />
                </div>
              )}
            </div>

            {/* 구매 안내 — 표지 우상단에 띄운다 */}
            {showPurchaseInfo && (
              <BookPurchaseInfo className="absolute end-1.5 top-1.5 z-10 inline-flex size-7 items-center justify-center rounded-full border border-white/15 bg-black/60 backdrop-blur-sm" />
            )}
          </div>

          {/* PC 전용: 포스터 아래 제휴 구매 링크 */}
          <BookPurchaseLinks links={affiliateLinks} className="hidden sm:block w-full pt-1" />
        </div>

        {/* 우측 메인 영역: 제목, 인라인 메타, 클린 소개 줄거리. 나란히 서는 폭부터 좌측 열 높이를 받아 소개 칸이 남는 높이를 채운다 */}
        <div className="flex-1 min-w-0 flex flex-col gap-3.5 w-full sm:self-stretch">
          {/* 1. 평점 + 제목 + 태그라인 — 가운데 축에 맞춘다 */}
          <div className="flex flex-col gap-1.5">
            {hasRating && (
              <span className="self-center inline-flex items-center gap-1 py-0.5 px-2 sm:px-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-full text-[11px] sm:text-xs font-bold shadow-sm">
                <Star size={11} className="fill-amber-400 text-amber-400" />
                {ratingValue.toFixed(1)}
              </span>
            )}

            <h1 className="text-center text-xl sm:text-2xl md:text-3xl font-extrabold text-text-primary leading-tight tracking-tight mt-0.5">
              <NoEditionBadge badge={content.titleBadge} className="me-1.5 align-middle" />
              {content.title}
            </h1>

            {isMovieOrTv && metadata?.tagline && (
              <p className="text-center text-xs sm:text-sm font-medium text-accent/90 italic tracking-wide leading-snug">
                “{metadata.tagline}”
              </p>
            )}
          </div>

          {/* YES24 판매 정보 — 제목 바로 아래 책정보 흐름에 둔다(셀럽 상세 원전과 같은 자리). 팔리지 않는 판본이면 빈 칸 */}
          <Yes24Sales contentId={content.id} editionId={content.purchaseEditionId} enabled={content.type === "BOOK"} />

          {/* 2. 클린 인라인 메타 스펙 (저자 · 출간일 · 출판사 · ISBN · 러닝타임 · 장르) */}
          <div className="flex flex-wrap items-center justify-center text-center gap-y-1.5 gap-x-3 text-[13px] text-text-secondary leading-relaxed pb-1 border-b border-white/[0.06]">
            {content.creator && (
              <div className="flex items-center gap-1 text-text-primary font-medium">
                <User size={13} className="text-accent shrink-0" />
                <span className="text-text-secondary">{creatorRoleLabel}:</span>
                <CreatorNames text={content.creator} />
              </div>
            )}

            {content.releaseDate && (
              <span className="flex items-center gap-1 text-text-secondary">
                <span className="text-white/30">·</span>
                <Calendar size={12} className="text-text-secondary shrink-0" />
                {content.releaseDate}
              </span>
            )}

            {/* 도서 스펙 */}
            {content.type === "BOOK" && metadata?.publisher && (
              <span className="flex items-center gap-1">
                <span className="text-white/30">·</span>
                <span>{metadata.publisher}</span>
              </span>
            )}
            {content.type === "BOOK" && metadata?.isbn && (
              <span className="flex items-center gap-1">
                <span className="text-white/30">·</span>
                <span className="font-mono text-text-secondary">ISBN {metadata.isbn}</span>
              </span>
            )}

            {/* 영상 스펙 */}
            {isMovieOrTv && runtime && (
              <span className="flex items-center gap-1">
                <span className="text-white/30">·</span>
                <Clock size={12} className="text-text-secondary shrink-0" />
                {t("runtimeMinutes", { minutes: runtime })}
              </span>
            )}
            {genres && genres.length > 0 && (
              <span>
                <span className="text-white/30 mr-1.5">·</span>
                {genres.join(" · ")}
              </span>
            )}

            {/* 게임 스펙 */}
            {content.type === "GAME" && metadata?.platforms && metadata.platforms.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-white/30">·</span>
                <span>{metadata.platforms.join(", ")}</span>
              </span>
            )}

            {/* 음악 스펙 */}
            {content.type === "MUSIC" && (
              <>
                {metadata?.albumType && (
                  <span>
                    <span className="text-white/30 mr-1.5">·</span>
                    {metadata.albumType}
                  </span>
                )}
                {metadata?.totalTracks !== undefined && (
                  <span>
                    <span className="text-white/30 mr-1.5">·</span>
                    {tCore("tracks", { count: metadata.totalTracks })}
                  </span>
                )}
                {metadata?.label && (
                  <span>
                    <span className="text-white/30 mr-1.5">·</span>
                    {metadata.label}
                  </span>
                )}
              </>
            )}
          </div>

          {/* 3. 소개 — 셀럽 상세의 원전 소개와 같은 모듈(BookIntroductionPanel).
              잘린 글은 끝을 흐리고(clip-fade-end) 본문을 눌러 전체 소개 모달로 본다.
              출처는 헤딩 「다음 작품 소개」 자체가 원문 링크로 겸한다.
              나란히 서는 폭(sm)부터는 좌측 열(표지·구매 링크)이 남긴 높이만큼 늘어난다 */}
          {bookIntroduction.loading && <PendingBlock variant="panel" minHeight="min-h-28" />}
          {bookIntroduction.failed && <RetryBlock onRetry={bookIntroduction.retry} />}
          {description && (
            <div className="relative py-0.5 sm:flex sm:min-h-0 sm:flex-1 sm:flex-col">
              <BookIntroductionPanel
                description={description}
                label={tCeleb("sourceWorkIntroduction")}
                attribution={content.type === "BOOK" ? content.introductionAttribution : undefined}
                showSource={content.type === "BOOK"}
                sourceTitle={content.title}
                sourceTitleBadge={content.titleBadge}
                className="mt-0"
                fillFrom="sm"
              />
            </div>
          )}

          {/* 게임 스토리라인 */}
          {content.type === "GAME" && metadata?.storyline && (
            <div className="relative py-0.5">
              <div
                ref={storylineRef}
                className={cn(
                  "text-sm text-text-secondary/90 leading-relaxed whitespace-pre-wrap font-normal",
                  !isStoryExpanded ? "max-h-[5.75rem] overflow-hidden md:max-h-[8.625rem]" : ""
                )}
              >
                <FormattedText text={metadata.storyline} />
              </div>

              {isStoryLong && (
                <div
                  className={cn(
                    "pt-1 flex justify-start",
                    !isStoryExpanded
                      ? "relative -mt-6 pt-7 bg-gradient-to-t from-bg-card via-bg-card/90 to-transparent"
                      : "mt-1.5"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setIsStoryExpanded(!isStoryExpanded)}
                    aria-expanded={isStoryExpanded}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold text-accent hover:bg-accent/10 hover:text-accent/80 active:bg-accent/15 cursor-pointer"
                  >
                    {isStoryExpanded ? (
                      <>
                        <span>{t("showLess")}</span>
                        <ChevronUp size={12} />
                      </>
                    ) : (
                      <>
                        <span>{t("showMore")}</span>
                        <ChevronDown size={12} />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* 모바일 전용: 하단 제휴 구매 링크 */}
      <BookPurchaseLinks links={affiliateLinks} className="sm:hidden pt-1" />
      <MediaEmbed contentId={content.id} type={content.type} />
      {/* 연결된 책 구매처가 없으면 개발자용 도서·상품 시안을 보여준다. */}
      {(content.type !== "BOOK" || affiliateLinks.length === 0) && <DeveloperCollectionJourney
        target={{ title: content.title, creator: content.creator, type: content.type, contentId: content.id }}
        placement="content-detail"
      />}

      {/* 5. 영상 전용: 출연진 (Cast) 캡슐 칩 리스트 */}
      {isMovieOrTv && metadata?.cast && metadata.cast.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
          <DecorativeLabel label={t("cast")} />
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {metadata.cast.map((actor, idx) => {
              const displayName = actor.character
                ? `${actor.name} (${actor.character})`
                : actor.name;
              return (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg bg-white/[0.035] border border-white/[0.08] hover:bg-white/[0.07] hover:border-white/20 transition-colors text-xs text-text-primary"
                >
                  <CreatorNames text={displayName} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. 음악 전용: 트랙 목록 */}
      {content.type === "MUSIC" && metadata?.tracks && metadata.tracks.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
          <DecorativeLabel label={t("trackList")} />
          <div className="space-y-1 max-h-[320px] overflow-y-auto custom-scrollbar border border-white/10 rounded-xl bg-black/20 p-1">
            {metadata.tracks.map((track, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] transition-colors"
              >
                <span className="text-text-primary flex items-center gap-2.5 truncate">
                  <Disc size={12} className="text-accent/70 shrink-0" />
                  <span className="text-text-secondary w-5 text-right font-mono text-[11px] shrink-0">
                    {track.trackNumber}.
                  </span>
                  <span className="truncate font-medium">{track.name}</span>
                </span>
                <span className="font-mono text-text-secondary text-[11px] ml-2 shrink-0">
                  {Math.floor(track.durationMs / 60000)}:
                  {String(Math.floor((track.durationMs % 60000) / 1000)).padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7. 게임 전용: 스크린샷 갤러리 */}
      {content.type === "GAME" && metadata?.screenshots && metadata.screenshots.length > 0 && (
        <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
          <DecorativeLabel label={t("screenshots")} />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {metadata.screenshots.map((url, i) => (
              <div
                key={i}
                className="relative aspect-video rounded-xl overflow-hidden border border-white/10 group shadow-md"
              >
                <ContentImage
                  src={url}
                  alt={`Screenshot ${i + 1}`}
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
