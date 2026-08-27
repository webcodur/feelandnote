/*
  파일명: /components/features/content/ContentInfoSection.tsx
  기능: 콘텐츠 정보 섹션
  책임: 좌측 포스터와 우측 메인 영역(제목, 미니멀 인라인 스펙, 군더더기 없는 클린 소개 줄거리, 액션 바)을 제공한다.
*/ // ------------------------------
"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import ContentImage from "@/components/ui/ContentImage";
import {
  Book,
  Film,
  Gamepad2,
  Music,
  User,
  Calendar,
  Bookmark,
  Check,
  Loader2,
  Trash2,
  ExternalLink,
  ShoppingCart,
  Star,
  Clock,
  ChevronDown,
  ChevronUp,
  Disc,
} from "lucide-react";
import { AFFILIATE_PLATFORMS, type AffiliatePlatformKey } from "@/constants/affiliatePlatforms";
import Button from "@/components/ui/Button";
import { FormattedText } from "@/components/ui";
import DecorativeLabel from "@/components/ui/DecorativeLabel";
import CreatorNames from "@/components/shared/content/creatorLink/CreatorNames";
import MediaEmbed from "./MediaEmbed";
import { addContent } from "@/actions/contents/addContent";
import { removeContent } from "@/actions/contents/removeContent";
import { updateUserContentRating } from "@/actions/contents/updateRating";
import StarRatingInput from "@/components/ui/StarRatingInput";
import type { ContentDetailData } from "@/actions/contents/getContentDetail";
import type { ContentType } from "@/types/database";
import type { ContentMetadata } from "@/types/content";
import { cn } from "@/lib/utils";

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
  userRecord: ContentDetailData["userRecord"];
  isLoggedIn: boolean;
  isAuthResolved: boolean;
  onRecordChange: (record: ContentDetailData["userRecord"]) => void;
}

export default function ContentInfoSection({
  content,
  userRecord,
  isLoggedIn,
  isAuthResolved,
  onRecordChange,
}: ContentInfoSectionProps) {
  const t = useTranslations("contentDetail");
  const tCore = useTranslations("shared.content");
  const tError = useTranslations("actionErrors");
  const locale = useLocale();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isStoryExpanded, setIsStoryExpanded] = useState(false);

  const Icon = TYPE_ICONS[content.type];
  const categoryLabel = t(`category.${content.category}`);

  /* 제휴 판매처 */
  const affiliateLinks = (content.affiliateLinks ?? []).filter((link) => {
    const platform = AFFILIATE_PLATFORMS[link.platform as AffiliatePlatformKey];
    return platform?.locale === locale;
  });

  // #region 핸들러
  const handleAdd = () => {
    startTransition(async () => {
      try {
        const result = await addContent({
          id: content.externalId,
          type: content.type,
          title: content.title,
          creator: content.creator,
          thumbnailUrl: content.thumbnail,
          description: content.description,
          releaseDate: content.releaseDate,
        });
        if (!result.success) {
          setError(tError(result.error));
          return;
        }
        onRecordChange({
          id: result.data.userContentId,
          status: "FINISHED",
          rating: null,
          review: null,
          isSpoiler: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        setError(null);
      } catch (err) {
        console.error("[ContentInfoSection:add]", err);
        setError(t("addFailed"));
      }
    });
  };

  const handleDelete = () => {
    if (!userRecord || !confirm(t("deleteConfirm"))) return;
    startTransition(async () => {
      try {
        await removeContent(userRecord.id);
        onRecordChange(null);
      } catch (err) {
        console.error("삭제 실패:", err);
      }
    });
  };

  const handleRatingChange = async (rating: number) => {
    if (!userRecord) return;
    try {
      const result = await updateUserContentRating({
        userContentId: userRecord.id,
        rating,
      });
      if (result.success) {
        onRecordChange({ ...userRecord, rating });
      } else {
        console.error(result.error);
      }
    } catch (e) {
      console.error("별점 수정 실패", e);
    }
  };
  // #endregion

  const metadata = content.metadata as unknown as ContentMetadata | null;

  // 메타데이터 값 추출
  const ratingValue = metadata?.voteAverage ?? metadata?.rating;
  const genres = metadata?.genres;
  const runtime = metadata?.runtime;
  const isMovieOrTv = content.type === "VIDEO";
  const subtypeLabel =
    metadata?.subtype === "movie"
      ? tCore("movie")
      : metadata?.subtype === "tv" || metadata?.subtype === "tv_series"
      ? tCore("tvProgram")
      : null;

  // 창작자 역할 라벨
  const creatorRoleLabel =
    content.type === "VIDEO"
      ? t("director")
      : content.type === "BOOK"
      ? t("author")
      : content.type === "GAME"
      ? t("developer")
      : t("artist");

  const isDescLong = (content.description?.length ?? 0) > 240;
  const isStoryLong = (metadata?.storyline?.length ?? 0) > 240;

  // #region 기록 & 별점 액션 바 컴포넌트
  const renderActionBar = () => (
    <div className="pt-2 border-t border-white/[0.06]">
      {error && <p className="text-red-400 text-xs mb-2 text-center">{error}</p>}

      {isLoggedIn && !userRecord && (
        <Button
          variant="primary"
          size="sm"
          onClick={handleAdd}
          disabled={isPending}
          className="w-full font-semibold shadow-md py-2.5 text-sm"
        >
          {isPending ? <Loader2 size={15} className="animate-spin" /> : <Bookmark size={15} />}
          <span>{t("addRecord")}</span>
        </Button>
      )}

      {userRecord && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-accent/[0.07] border border-accent/20 rounded-xl">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
              <Check size={12} strokeWidth={3} />
            </div>
            <span className="text-xs font-semibold text-text-primary">{t("recorded")}</span>
            <div className="flex items-center ml-1">
              <StarRatingInput
                value={userRecord.rating || 0}
                onChange={handleRatingChange}
                size={16}
              />
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 w-7 p-0 shrink-0"
            aria-label="Delete"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      )}

      {!isLoggedIn && isAuthResolved && (
        <p className="text-center text-xs text-text-secondary/70 py-1">
          {t("loginPrompt")}
        </p>
      )}
    </div>
  );
  // #endregion

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
          </div>

          {/* PC 전용: 포스터 아래 제휴 구매 링크 */}
          {affiliateLinks.length > 0 && (
            <div className="hidden sm:flex flex-col gap-2 w-full pt-1">
              {affiliateLinks.map((link) => {
                const platform = AFFILIATE_PLATFORMS[link.platform as AffiliatePlatformKey];
                if (!platform) return null;
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow sponsored"
                    className="flex items-center justify-center gap-1.5 w-full py-2.5 px-3 text-white text-xs font-semibold rounded-xl transition-all shadow-md hover:opacity-90 active:scale-[0.99]"
                    style={{ backgroundColor: platform.color }}
                  >
                    <ShoppingCart size={13} />
                    <span>{t("buyAt", { platform: platform.label })}</span>
                    <ExternalLink size={12} />
                  </a>
                );
              })}
              {affiliateLinks.some((l) => l.platform === "coupang") && (
                <p className="text-[10px] text-center text-text-secondary/70">
                  {AFFILIATE_PLATFORMS.coupang.notice}
                </p>
              )}
            </div>
          )}
        </div>

        {/* 우측 메인 영역: 제목, 인라인 메타, 클린 소개 줄거리, 액션 바 */}
        <div className="flex-1 min-w-0 flex flex-col gap-3.5 w-full">
          {/* 1. 뱃지 + 제목 + 태그라인 */}
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <span className="inline-flex items-center gap-1 sm:gap-1.5 py-0.5 px-2 sm:px-2.5 bg-accent/15 border border-accent/30 text-accent rounded-full text-[11px] sm:text-xs font-semibold tracking-wide">
                <Icon size={11} className="sm:w-3 sm:h-3" />
                {categoryLabel}
                {subtypeLabel && <span className="text-accent/80 font-normal">· {subtypeLabel}</span>}
              </span>

              {ratingValue !== undefined && ratingValue > 0 && (
                <span className="inline-flex items-center gap-1 py-0.5 px-2 sm:px-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-full text-[11px] sm:text-xs font-bold shadow-sm">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  {ratingValue.toFixed(1)}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-text-primary leading-tight tracking-tight mt-0.5">
              {content.title}
            </h1>

            {isMovieOrTv && metadata?.tagline && (
              <p className="text-xs sm:text-sm font-medium text-accent/90 italic tracking-wide leading-snug">
                “{metadata.tagline}”
              </p>
            )}
          </div>

          {/* 2. 클린 인라인 메타 스펙 (저자 · 출간일 · 출판사 · ISBN · 러닝타임 · 장르) */}
          <div className="flex flex-wrap items-center gap-y-1.5 gap-x-2.5 text-xs text-text-secondary/80 leading-relaxed pb-1 border-b border-white/[0.06]">
            {content.creator && (
              <div className="flex items-center gap-1 text-text-primary font-medium">
                <User size={12} className="text-accent shrink-0" />
                <span className="text-text-secondary">{creatorRoleLabel}:</span>
                <CreatorNames text={content.creator} />
              </div>
            )}

            {content.releaseDate && (
              <span className="flex items-center gap-1 text-text-secondary">
                <span className="text-white/20">·</span>
                <Calendar size={11} className="text-text-secondary/70 shrink-0" />
                {content.releaseDate}
              </span>
            )}

            {/* 도서 스펙 */}
            {content.type === "BOOK" && metadata?.publisher && (
              <span className="flex items-center gap-1">
                <span className="text-white/20">·</span>
                <span>{metadata.publisher}</span>
              </span>
            )}
            {content.type === "BOOK" && metadata?.isbn && (
              <span className="flex items-center gap-1">
                <span className="text-white/20">·</span>
                <span className="font-mono text-text-secondary/70">ISBN {metadata.isbn}</span>
              </span>
            )}

            {/* 영상 스펙 */}
            {isMovieOrTv && runtime && (
              <span className="flex items-center gap-1">
                <span className="text-white/20">·</span>
                <Clock size={11} className="text-text-secondary/70 shrink-0" />
                {t("runtimeMinutes", { minutes: runtime })}
              </span>
            )}
            {genres && genres.length > 0 && (
              <span>
                <span className="text-white/20 mr-1.5">·</span>
                {genres.join(" · ")}
              </span>
            )}

            {/* 게임 스펙 */}
            {content.type === "GAME" && metadata?.platforms && metadata.platforms.length > 0 && (
              <span className="flex items-center gap-1">
                <span className="text-white/20">·</span>
                <span>{metadata.platforms.join(", ")}</span>
              </span>
            )}

            {/* 음악 스펙 */}
            {content.type === "MUSIC" && (
              <>
                {metadata?.albumType && (
                  <span>
                    <span className="text-white/20 mr-1.5">·</span>
                    {metadata.albumType}
                  </span>
                )}
                {metadata?.totalTracks !== undefined && (
                  <span>
                    <span className="text-white/20 mr-1.5">·</span>
                    {tCore("tracks", { count: metadata.totalTracks })}
                  </span>
                )}
                {metadata?.label && (
                  <span>
                    <span className="text-white/20 mr-1.5">·</span>
                    {metadata.label}
                  </span>
                )}
              </>
            )}
          </div>

          {/* 3. 클린 소개 (줄거리 / 시놉시스) — 사각 테두리 감옥 제거, 자연스러운 에세이 스타일 */}
          {content.description && (
            <div className="relative py-0.5">
              <div
                className={cn(
                  "text-sm text-text-secondary/90 leading-relaxed whitespace-pre-wrap transition-all duration-300 font-normal",
                  !isDescExpanded && isDescLong ? "line-clamp-4 md:line-clamp-6" : ""
                )}
              >
                <FormattedText text={content.description} />
              </div>

              {isDescLong && (
                <div
                  className={cn(
                    "pt-1 flex justify-start",
                    !isDescExpanded
                      ? "relative -mt-6 pt-7 bg-gradient-to-t from-bg-card via-bg-card/90 to-transparent"
                      : "mt-1.5"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setIsDescExpanded(!isDescExpanded)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent/80 transition-colors py-0.5 px-2 rounded-md hover:bg-accent/10 cursor-pointer"
                  >
                    {isDescExpanded ? (
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

          {/* 게임 스토리라인 */}
          {content.type === "GAME" && metadata?.storyline && (
            <div className="relative py-0.5">
              <div
                className={cn(
                  "text-sm text-text-secondary/90 leading-relaxed whitespace-pre-wrap transition-all duration-300 font-normal",
                  !isStoryExpanded && isStoryLong ? "line-clamp-4 md:line-clamp-6" : ""
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
                    className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent/80 transition-colors py-0.5 px-2 rounded-md hover:bg-accent/10 cursor-pointer"
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

          {/* 4. 기록 & 별점 액션 바 */}
          {renderActionBar()}
        </div>
      </div>

      {/* 모바일 전용: 하단 제휴 구매 링크 */}
      {affiliateLinks.length > 0 && (
        <div className="sm:hidden space-y-2 pt-1">
          <div className="flex flex-col gap-2">
            {affiliateLinks.map((link) => {
              const platform = AFFILIATE_PLATFORMS[link.platform as AffiliatePlatformKey];
              if (!platform) return null;
              return (
                <a
                  key={link.platform}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow sponsored"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 text-white text-sm font-semibold rounded-xl transition-all shadow-md hover:opacity-90 active:scale-[0.99]"
                  style={{ backgroundColor: platform.color }}
                >
                  <ShoppingCart size={15} />
                  {t("buyAt", { platform: platform.label })}
                  <ExternalLink size={14} />
                </a>
              );
            })}
          </div>
          {affiliateLinks.some((l) => l.platform === "coupang") && (
            <p className="text-[10px] text-center text-text-secondary/70">
              {AFFILIATE_PLATFORMS.coupang.notice}
            </p>
          )}
        </div>
      )}

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

      {/* 8. 미디어 임베드 (예: 유튜브 트레일러 등) */}
      <MediaEmbed contentId={content.id} type={content.type} />
    </div>
  );
}
