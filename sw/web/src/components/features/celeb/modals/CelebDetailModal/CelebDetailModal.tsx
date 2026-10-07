/*
  셀럽 요약 모달
  - 인물 요약을 표시하고, 작품에서 열면 전달받은 그 작품의 감상 배경도 함께 보여준다.
    전체 인물 기록은 「프로필 보기」로 인물 페이지에서 읽는다.
*/
"use client";

import React, { useCallback, useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  ArrowUpRight,
  Briefcase,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  MapPin,
  UserPlus,
} from "lucide-react";
import { toggleFollow } from "@/actions/user";
import { getCelebProfileUrl } from "@/lib/url";
import { trackEvent } from "@/lib/analytics/track";
import { getAuraByScore, type Aura } from "@/constants/materials";
import CelebFactionsModal from "../CelebFactionsModal";
import Modal from "@/components/ui/Modal";
import SourceLink from "@/components/ui/SourceLink";
import { parseSourceUrls } from "@feelandnote/shared/lib/source-links";
import { FormattedText } from "@/components/ui";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import CelebProfileMedia from "@/components/shared/CelebProfileMedia";
import CelebQuote from "@/components/shared/CelebQuote";
import { useTranslations, useLocale } from "next-intl";
import { useCelebVoice } from "@/hooks/useCelebVoice";
import { readableFactionBorder, readableFactionColor } from "@/lib/utils/factionColor";
import { normalizeIntroBreaks } from "@/lib/utils/prose-line-breaks";
import type { Locale } from "@/types/locale";
import { AURA_GRADIENTS, type CelebDetailModalProps } from "./types";

export default function CelebDetailModal({ celeb, isOpen, onClose, hideBirthDate = false, onNavigate, hasPrev = false, hasNext = false, zIndex, escapeCapture = false, contextReview }: CelebDetailModalProps) {
  const t = useTranslations("home.ui");
  const tCeleb = useTranslations("celebPage");
  const hasReviewSources = parseSourceUrls(contextReview?.sourceUrl).length > 0;
  const tProf = useTranslations("profession");
  const locale = useLocale() as Locale;
  const isEn = locale === "en";

  // locale별 텍스트 선택 (영문 fallback → 한국어)
  const displayTitle = (isEn && celeb.title_en) || celeb.title;
  const displayBio = (isEn && celeb.bio_en) || celeb.bio;
  const displayQuotes = (isEn && celeb.quotes_en) || celeb.quotes;
  const displayNickname = (isEn && celeb.nickname_en) || celeb.nickname;
  const displayGreeting = isEn ? (celeb.greeting_en ?? celeb.greeting) : celeb.greeting;
  const compactProfile = Boolean(contextReview) && !onNavigate;

  const {
    hasVoice,
    canGreet,
    hasGreetingAudio,
    isVoiceActive,
    isQuoteActive,
    handleGreetingPlay,
    handleQuotePlay,
  } = useCelebVoice({
    profile: celeb,
    greeting: displayGreeting,
    nickname: displayNickname,
    locale,
  });

  const [isFactionsModalOpen, setIsFactionsModalOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(celeb.is_following);
  const [isLoading, setIsLoading] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  // 스포일러 해제는 리뷰 단위로 — 다른 리뷰가 오면 다시 가려진다
  const [revealedReview, setRevealedReview] = useState<string | null>(null);

  // celeb 전환 시 내부 상태 리셋 (렌더 중 이전 값 비교 — effect 내 setState 금지 규칙 준수)
  const [renderedCelebId, setRenderedCelebId] = useState(celeb.id);
  if (renderedCelebId !== celeb.id) {
    setRenderedCelebId(celeb.id);
    setIsFollowing(celeb.is_following);
    setIsFactionsModalOpen(false);
    setZoomOpen(false);
  }

  // 오라 시스템: score 기반으로 오라 결정 (SSOT: materials.ts/getAuraByScore)
  const aura: Aura = celeb.influence?.total_score != null
    ? getAuraByScore(celeb.influence.total_score)
    : 1;
  const borderGradient = AURA_GRADIENTS[aura];

  const handleFollowClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    const prevState = isFollowing;
    setIsFollowing(!isFollowing);

    const result = await toggleFollow(celeb.id, "celeb");
    if (!result.success) setIsFollowing(prevState);
    setIsLoading(false);
  };

  const zoomImageUrl = celeb.avatar_url;
  const handleZoom = useCallback(() => {
    if (zoomImageUrl) setZoomOpen(true);
  }, [zoomImageUrl]);
  const greetLabel = hasGreetingAudio
    ? tCeleb("playGreetingVoice")
    : tCeleb("dialogue_greeting");

  if (!isOpen) return null;

  const navButtonClass = "z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-bg-main/90 text-text-secondary hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-30";

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        ariaLabel={displayNickname}
        frame="plain"
        widthClassName="max-w-[440px]"
        overlayClassName="bg-black/70 backdrop-blur-sm"
        boxClassName={`rounded-sm bg-gradient-to-br p-[3px] ${borderGradient} shadow-[0_0_50px_-12px_rgba(212,175,55,0.25)]`}
        closeButtonClassName="absolute -top-3 -right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-main text-text-secondary hover:bg-bg-card hover:text-text-primary"
        animateHeightDuration={220}
        zIndex={zIndex}
        escapeCapture={escapeCapture}
        closeOnEscape={!isFactionsModalOpen && !zoomOpen}
      >
        <div className={`relative overflow-hidden rounded-sm bg-bg-main animate-fade-in ${contextReview ? "pb-3" : "pb-5"}`}>
          {/* 머리 위로 옅은 금빛 — 장식 상자 없이 인물만 비춘다 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(212,175,55,0.10),transparent_70%)]"
          />

          {/* 인물 요약: 이전·다음 화살표 + Avatar + 이름 + 메타 + 태그 */}
          <div className={compactProfile ? "relative grid shrink-0 grid-cols-[80px_minmax(0,1fr)] items-center gap-x-4 gap-y-1 px-6 pt-4 pb-3" : "relative flex shrink-0 flex-col items-center px-6 pt-8 pb-4"}>
            {/* 목록 탐색: 이전·다음 인물 버튼이 아바타 좌우를 호위한다 */}
            <div className={compactProfile ? "row-span-4 flex items-center justify-center self-start pt-1" : "mb-4 flex items-center justify-center gap-4"}>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate("prev")}
                  disabled={!hasPrev}
                  aria-label={t("prevPerson")}
                  className={navButtonClass}
                >
                  <ChevronLeft size={20} />
                </button>
              )}
              <div className="relative shrink-0" data-celeb-modal-portrait>
                <CelebProfileMedia
                  photoUrl={null}
                  avatarUrl={celeb.avatar_url}
                  nickname={displayNickname}
                  onZoom={handleZoom}
                  zoomLabel={tCeleb("enlargePhoto")}
                  hasVoice={hasGreetingAudio}
                  isVoicePlaying={isVoiceActive}
                  onGreet={canGreet ? handleGreetingPlay : undefined}
                  greetLabel={greetLabel}
                  avatarSize={compactProfile ? "h-20 w-20" : "h-28 w-28"}
                  initialSize="text-4xl"
                  avatarAlignment="center"
                />
                <button
                  type="button"
                  onClick={handleFollowClick}
                  disabled={isLoading}
                  aria-label={isFollowing ? t("followingLabel") : t("followLabel")}
                  title={`${isFollowing ? t("followingLabel") : t("followLabel")} · ${t("followerUnit", { count: celeb.follower_count || 0 })}`}
                  data-celeb-modal-follow
                  className={`absolute -top-1 -end-1 z-10 flex h-8 w-8 items-center justify-center rounded-full border bg-bg-main hover:bg-bg-card active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 ${
                    isFollowing
                      ? "border-accent/60 text-accent"
                      : "border-white/15 text-text-secondary hover:border-accent hover:text-accent"
                  }`}
                >
                  {isFollowing ? <Check size={14} strokeWidth={3} /> : <UserPlus size={14} strokeWidth={2.5} />}
                </button>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate("next")}
                  disabled={!hasNext}
                  aria-label={t("nextPerson")}
                  className={navButtonClass}
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>

            {displayTitle && (
              <p className={`text-xs text-accent font-bold uppercase tracking-[.25em] ${compactProfile ? "col-start-2" : "mb-1"}`}>{displayTitle}</p>
            )}

            {/* 인물 페이지로 가는 문 — 이름 오른쪽에 붙인다 */}
            <div className={compactProfile ? "col-start-2 flex min-w-0 items-center gap-2" : "mb-3 flex items-center justify-center gap-2"}>
              <h2 className={`font-black font-serif text-text-primary leading-tight break-all ${compactProfile ? "text-2xl" : "text-3xl text-center"}`}>
                {displayNickname}
              </h2>
              <Link
                href={getCelebProfileUrl(celeb)}
                locale={isEn ? "en" : undefined}
                onClick={() => trackEvent("celeb_person_go", { to: celeb.slug ?? celeb.id })}
                aria-label={t("viewProfile")}
                title={t("viewProfile")}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent shadow-[0_0_12px_-4px_rgba(212,175,55,0.5)] hover:border-accent hover:bg-accent/25 active:scale-95"
              >
                <ArrowUpRight size={15} strokeWidth={2.5} />
              </Link>
            </div>

            <div className={`flex flex-wrap gap-x-3 gap-y-1 text-sm text-text-secondary ${compactProfile ? "col-start-2" : "justify-center"}`}>
              {celeb.profession && (
                <span className="flex items-center gap-1">
                  <Briefcase size={14} />
                  {tProf.has(celeb.profession) ? tProf(celeb.profession) : celeb.profession}
                </span>
              )}
              {celeb.nationality && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {celeb.nationality}
                </span>
              )}
              {!hideBirthDate && celeb.birth_date && (
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {celeb.birth_date}
                  {celeb.death_date && ` ~ ${celeb.death_date}`}
                </span>
              )}
            </div>

            {/* 태그: 최대 2개까지만 표시하고 나머지는 +N 처리 (가로폭 넘침 방지) */}
            {(celeb.factions?.length ?? 0) > 0 && (
              <div className={`flex w-full max-w-full flex-wrap items-center gap-2 overflow-hidden ${compactProfile ? "col-start-2 mt-1" : "mt-3 justify-center"}`}>
                {celeb.factions.slice(0, 2).map(tag => (
                  <button
                    key={tag.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFactionsModalOpen(true);
                    }}
                    className="group shrink-0 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-full border backdrop-blur-sm hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    style={{
                      backgroundColor: `${tag.color}14`,
                      color: readableFactionColor(tag.color),
                      borderColor: readableFactionBorder(tag.color)
                    }}
                  >
                    {/* 칩은 고정 — 호버·눌림에는 내용물만 커지고 줄어든다 */}
                    <span className="inline-flex items-center gap-1.5 transition-transform group-hover:scale-110 group-active:scale-95">
                      {/* 어두운 세력색도 읽히게 — 점은 원색, 글자는 밝기를 올린 같은 색 */}
                      <span aria-hidden className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                      {isEn ? (tag.name_en ?? tag.name) : tag.name}
                    </span>
                  </button>
                ))}
                {celeb.factions.length > 2 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFactionsModalOpen(true);
                    }}
                    className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-bg-secondary text-xs font-bold border border-border hover:bg-bg-stone-light hover:text-text-primary"
                  >
                    +{celeb.factions.length - 2}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 인용구 — 개행 규약을 맞춘 뒤 위아랫줄은 브라우저가 균등 분배한다 */}
          <CelebQuote
            text={displayQuotes ? normalizeIntroBreaks(displayQuotes) : displayQuotes}
            hasVoice={hasVoice}
            isQuoteActive={isQuoteActive}
            onPlay={handleQuotePlay}
            playLabel={tCeleb("playQuoteVoice")}
            variant="modal"
            className="shrink-0"
          />

          {/* 바이오 */}
          {displayBio && (
            <div className={`shrink-0 px-6 ${compactProfile ? "pt-1.5" : "pt-3"}`}>
              <p className="text-sm text-text-secondary leading-relaxed break-all">
                <FormattedText text={displayBio} />
              </p>
            </div>
          )}

          {/* 이 콘텐츠에 대한 감상평 — 인원 구성처럼 콘텐츠 문맥에서 열렸을 때만 */}
          {contextReview && (
            <div className="px-6 pt-2" data-celeb-context-review>
              <div className="rounded-xl border border-accent/20 bg-white/[0.03] px-4 py-2.5">
                <p className="mb-1 shrink-0 text-xs font-medium text-accent/80">
                  {contextReview.bookTitle ? tCeleb("bookRelationReadBackground", { name: displayNickname }) : t("contentReviewTitle")}
                </p>
                {contextReview.bookTitle && <p className="mb-1 shrink-0 text-sm font-semibold text-text-primary">{contextReview.bookTitle}</p>}
                {contextReview.isSpoiler && revealedReview !== contextReview.review ? (
                  <button
                    type="button"
                    onClick={() => setRevealedReview(contextReview.review)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/[0.06] bg-white/[0.03] py-2.5 text-xs text-text-secondary hover:bg-white/[0.06] hover:text-text-primary"
                  >
                    <EyeOff size={13} />
                    {t("contentReviewSpoiler")}
                  </button>
                ) : contextReview.review ? (
                  <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-line break-words">
                    <FormattedText text={contextReview.review} />
                  </p>
                ) : null}
                {(hasReviewSources || celeb.content_count > 1) && (
                  <div className="mt-2 flex min-h-8 shrink-0 items-center justify-between gap-3">
                    {hasReviewSources && (
                      <SourceLink sourceUrl={contextReview.sourceUrl}
                        className="inline-flex min-h-8 shrink-0 items-center rounded px-2 text-xs text-accent outline-none hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-accent">
                        {tCeleb("bookRelationSource")}
                      </SourceLink>
                    )}
                    {celeb.content_count > 1 && (
                      <Link
                        href={getCelebProfileUrl(celeb)}
                        locale={isEn ? "en" : undefined}
                        className="ml-auto flex min-w-0 items-center justify-end gap-1 text-right text-xs text-text-tertiary hover:text-accent"
                      >
                        {t("contentReviewMore")}
                        <ArrowUpRight size={12} className="shrink-0" />
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </Modal>

      {/* 태그 상세 모달 */}
      <CelebFactionsModal
        isOpen={isFactionsModalOpen}
        onClose={() => setIsFactionsModalOpen(false)}
        factions={celeb.factions || []}
        personName={displayNickname}
        zIndex={zIndex ? zIndex + 1 : undefined}
      />

      {zoomImageUrl ? (
        <ImageViewerModal
          src={zoomImageUrl}
          alt={displayNickname}
          isOpen={zoomOpen}
          onClose={() => setZoomOpen(false)}
        />
      ) : null}
    </>
  );
}
