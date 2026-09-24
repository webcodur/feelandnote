/*
  셀럽 요약 모달
  - celeb props만으로 즉시 뜨는 가벼운 인물 카드다. 감상 기록·읽어보기 같은
    긴 내용은 싣지 않고 「프로필 보기」로 인물 페이지에 보낸다.
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
  MapPin,
  UserPlus,
} from "lucide-react";
import { toggleFollow } from "@/actions/user";
import { getCelebProfileUrl } from "@/lib/url";
import { trackEvent } from "@/lib/analytics/track";
import { getAuraByScore, type Aura } from "@/constants/materials";
import CelebFactionsModal from "../CelebFactionsModal";
import Modal from "@/components/ui/Modal";
import { FormattedText } from "@/components/ui";
import ImageViewerModal from "@/components/ui/ImageViewerModal";
import CelebProfileMedia from "@/components/shared/CelebProfileMedia";
import CelebQuote from "@/components/shared/CelebQuote";
import { useTranslations, useLocale } from "next-intl";
import { useCelebVoice } from "@/hooks/useCelebVoice";
import { readableFactionColor } from "@/lib/utils/factionColor";
import type { Locale } from "@/types/locale";
import { AURA_GRADIENTS, type CelebDetailModalProps } from "./types";

export default function CelebDetailModal({ celeb, isOpen, onClose, hideBirthDate = false, onNavigate, hasPrev = false, hasNext = false, zIndex }: CelebDetailModalProps) {
  const t = useTranslations("home.ui");
  const tCeleb = useTranslations("celebPage");
  const tProf = useTranslations("profession");
  const locale = useLocale() as Locale;
  const isEn = locale === "en";

  // locale별 텍스트 선택 (영문 fallback → 한국어)
  const displayTitle = (isEn && celeb.title_en) || celeb.title;
  const displayBio = (isEn && celeb.bio_en) || celeb.bio;
  const displayQuotes = (isEn && celeb.quotes_en) || celeb.quotes;
  const displayNickname = (isEn && celeb.nickname_en) || celeb.nickname;
  const displayGreeting = isEn ? (celeb.greeting_en ?? celeb.greeting) : celeb.greeting;

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

  const navButtonClass = "absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-bg-main/90 text-text-secondary hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-30";

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        frame="plain"
        widthClassName="max-w-[420px]"
        overlayClassName="bg-black/70 backdrop-blur-sm"
        boxClassName={`rounded-sm bg-gradient-to-br p-[3px] ${borderGradient} shadow-[0_0_50px_-12px_rgba(212,175,55,0.25)]`}
        closeButtonClassName="absolute -top-3 -right-3 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-bg-main text-text-secondary hover:bg-bg-card hover:text-text-primary"
        animateHeight={false}
        zIndex={zIndex}
      >
        <div className="relative overflow-hidden rounded-sm bg-bg-main animate-fade-in pb-5">
          {/* 머리 위로 옅은 금빛 — 장식 상자 없이 인물만 비춘다 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(212,175,55,0.10),transparent_70%)]"
          />

          {/* 인물 페이지로 가는 문 — 카드 오른쪽 위 구석 */}
          <Link
            href={getCelebProfileUrl(celeb)}
            locale={isEn ? "en" : undefined}
            onClick={() => trackEvent("celeb_person_go", { to: celeb.slug ?? celeb.id })}
            aria-label={t("viewProfile")}
            title={t("viewProfile")}
            className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/30 text-text-secondary hover:border-accent hover:text-accent active:scale-95"
          >
            <ArrowUpRight size={15} strokeWidth={2.5} />
          </Link>

          {/* 인물 요약: Avatar + 이름 + 메타 + 태그 */}
          <div className="relative flex flex-col items-center px-6 pt-8 pb-4">
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
              avatarSize="h-24 w-24"
              initialSize="text-3xl"
              containerClassName="mb-4"
              avatarAlignment="center"
            />

            {displayTitle && (
              <p className="text-[11px] text-accent font-bold uppercase tracking-[.25em] mb-1">{displayTitle}</p>
            )}

            <h2 className="text-2xl font-black font-serif text-text-primary leading-tight text-center break-all mb-3">
              {displayNickname}
            </h2>

            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs justify-center text-text-secondary">
              {celeb.profession && (
                <span className="flex items-center gap-1">
                  <Briefcase size={12} />
                  {tProf.has(celeb.profession) ? tProf(celeb.profession) : celeb.profession}
                </span>
              )}
              {celeb.nationality && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {celeb.nationality}
                </span>
              )}
              {!hideBirthDate && celeb.birth_date && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {celeb.birth_date}
                  {celeb.death_date && ` ~ ${celeb.death_date}`}
                </span>
              )}
            </div>

            {/* 태그: 최대 2개까지만 표시하고 나머지는 +N 처리 (가로폭 넘침 방지) */}
            {(celeb.factions?.length ?? 0) > 0 && (
              <div className="mt-3 flex w-full max-w-full flex-wrap items-center justify-center gap-2 overflow-hidden">
                {celeb.factions.slice(0, 2).map(tag => (
                  <button
                    key={tag.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFactionsModalOpen(true);
                    }}
                    className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-full border backdrop-blur-sm hover:scale-105 active:scale-95"
                    style={{
                      backgroundColor: `${tag.color}14`,
                      color: readableFactionColor(tag.color),
                      borderColor: `${tag.color}50`
                    }}
                  >
                    {/* 어두운 세력색도 읽히게 — 점은 원색, 글자는 밝기를 올린 같은 색 */}
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                    {isEn ? (tag.name_en ?? tag.name) : tag.name}
                  </button>
                ))}
                {celeb.factions.length > 2 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFactionsModalOpen(true);
                    }}
                    className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-bg-secondary text-[11px] font-bold border border-border hover:bg-bg-stone-light hover:text-text-primary"
                  >
                    +{celeb.factions.length - 2}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 인용구 */}
          <CelebQuote
            text={displayQuotes}
            hasVoice={hasVoice}
            isQuoteActive={isQuoteActive}
            onPlay={handleQuotePlay}
            playLabel={tCeleb("playQuoteVoice")}
            variant="modal"
          />

          {/* 바이오 — 앞의 아이콘이 팔로우 단추다 */}
          {displayBio && (
            <div className="px-6 pt-3">
              <p className="text-xs md:text-sm text-text-secondary leading-relaxed break-all">
                <button
                  type="button"
                  onClick={handleFollowClick}
                  disabled={isLoading}
                  aria-label={isFollowing ? t("followingLabel") : t("followLabel")}
                  title={`${isFollowing ? t("followingLabel") : t("followLabel")} · ${t("followerUnit", { count: celeb.follower_count || 0 })}`}
                  className={`float-left mr-2 mt-0.5 flex h-7 w-7 items-center justify-center rounded-full border active:scale-90 disabled:opacity-50 ${
                    isFollowing
                      ? "border-accent/60 bg-accent/15 text-accent"
                      : "border-white/15 bg-black/30 text-text-secondary hover:border-accent hover:text-accent"
                  }`}
                >
                  {isFollowing ? (
                    <Check size={13} strokeWidth={3} />
                  ) : (
                    <UserPlus size={13} strokeWidth={2.5} />
                  )}
                </button>
                <FormattedText text={displayBio} />
              </p>
            </div>
          )}

          {/* 목록 탐색: 이전·다음 인물 */}
          {onNavigate && (
            <>
              <button
                type="button"
                onClick={() => onNavigate("prev")}
                disabled={!hasPrev}
                aria-label={t("prevPerson")}
                className={`${navButtonClass} left-2`}
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={() => onNavigate("next")}
                disabled={!hasNext}
                aria-label={t("nextPerson")}
                className={`${navButtonClass} right-2`}
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>
      </Modal>

      {/* 태그 상세 모달 */}
      <CelebFactionsModal
        isOpen={isFactionsModalOpen}
        onClose={() => setIsFactionsModalOpen(false)}
        factions={celeb.factions || []}
        title={t("keywords", { name: displayNickname })}
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
