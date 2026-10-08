/*
  셀럽 요약 모달
  - 인물 요약을 표시하고, 작품에서 열면 전달받은 그 작품의 감상 배경도 함께 보여준다.
    전체 인물 기록은 「프로필 보기」로 인물 페이지에서 읽는다.
*/
"use client";

import React, { useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import { Link } from "@/i18n/navigation";
import {
  ArrowUpRight,
  Briefcase,
  Calendar,
  Check,
  EyeOff,
  MapPin,
  UserPlus,
} from "lucide-react";
import { toggleFollow } from "@/actions/user";
import { getCelebProfileUrl } from "@/lib/url";
import { trackEvent } from "@/lib/analytics/track";
import { Z_INDEX } from "@/constants/zIndex";
import { calculateInfluenceRank } from "@feelandnote/influence-constants";
import { getInfluenceRankStyle } from "@/components/features/influence/rankMaterials";
import InfluenceRankGlyph from "@/components/features/influence/InfluenceRankGlyph";
import CelebFactionsModal from "../CelebFactionsModal";
import Modal from "@/components/ui/Modal";
import NationalityText from "@/components/ui/NationalityText";
import { FormattedText } from "@/components/ui";
import CelebPortrait from "@/components/shared/CelebPortrait";
import CelebQuote from "@/components/shared/CelebQuote";
import { useTranslations, useLocale } from "next-intl";
import { useCelebVoice } from "@/hooks/useCelebVoice";
import { readableFactionBorder, readableFactionColor } from "@/lib/utils/factionColor";
import { normalizeIntroBreaks } from "@/lib/utils/prose-line-breaks";
import type { Locale } from "@/types/locale";
import { AURA_GRADIENTS, type CelebDetailModalProps } from "./types";
import PortraitNavGlyph from "./PortraitNavGlyph";
import styles from "./CelebDetailModal.module.css";

const CelebInfluenceModal = dynamic(() => import("@/components/features/home/CelebInfluenceModal"), { loading: () => null });

export default function CelebDetailModal({ celeb, isOpen, onClose, hideBirthDate = false, onNavigate, hasPrev = false, hasNext = false, zIndex, escapeCapture = false, contextReview }: CelebDetailModalProps) {
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
  const [isInfluenceOpen, setIsInfluenceOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(celeb.is_following);
  const [isLoading, setIsLoading] = useState(false);
  // 스포일러 해제는 리뷰 단위로 — 다른 리뷰가 오면 다시 가려진다
  const [revealedReview, setRevealedReview] = useState<string | null>(null);

  // celeb 전환 시 내부 상태 리셋 (렌더 중 이전 값 비교 — effect 내 setState 금지 규칙 준수)
  const [renderedCelebId, setRenderedCelebId] = useState(celeb.id);
  if (renderedCelebId !== celeb.id) {
    setRenderedCelebId(celeb.id);
    setIsFollowing(celeb.is_following);
    setIsFactionsModalOpen(false);
    setIsInfluenceOpen(false);
  }

  const influenceRank = celeb.influence ? calculateInfluenceRank(celeb.influence.total_score) : null;
  const rankStyle = influenceRank ? getInfluenceRankStyle(influenceRank) : {};

  const handleFollowClick = async () => {
    if (isLoading) return;
    setIsLoading(true);
    const prevState = isFollowing;
    setIsFollowing(!isFollowing);

    const result = await toggleFollow(celeb.id, "celeb");
    if (!result.success) setIsFollowing(prevState);
    setIsLoading(false);
  };

  const greetLabel = hasGreetingAudio
    ? tCeleb("playGreetingVoice")
    : tCeleb("dialogue_greeting");

  if (!isOpen) return null;

  const navButtonClass = styles.navButton;
  const followButton = (
    <button
      type="button"
      onClick={handleFollowClick}
      disabled={isLoading}
      aria-label={isFollowing ? t("followingLabel") : t("followLabel")}
      title={`${isFollowing ? t("followingLabel") : t("followLabel")} · ${t("followerUnit", { count: celeb.follower_count || 0 })}`}
      data-celeb-modal-follow
      className={`size-9 rounded-control inline-flex items-center justify-center hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50 ${isFollowing ? "text-accent" : "text-text-secondary hover:text-text-primary"}`}
    >
      {isFollowing ? <Check size={16} strokeWidth={2} /> : <UserPlus size={16} strokeWidth={2} />}
    </button>
  );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        ariaLabel={displayNickname}
        frame="plain"
        widthClassName="max-w-[440px]"
        overlayClassName="bg-black/70 backdrop-blur-sm"
        boxClassName={`${styles.frame} ${influenceRank ? "" : `bg-gradient-to-br ${AURA_GRADIENTS[1]}`}`}
        boxStyle={{ ...rankStyle, "--card-aura": "var(--rank-accent, var(--color-accent))" } as CSSProperties}
        scrollAreaClassName={`${styles.scrollArea} ${celeb.influence ? styles.withFooter : ""}`}
        footer={celeb.influence && (
          <div className={styles.footer}>
            <span className="flex items-baseline gap-2 text-xs text-text-secondary">
              {tCeleb("influence")}
              <span className="text-sm font-bold tabular-nums text-text-primary">{celeb.influence.total_score}<span className="ms-1 text-xs font-normal text-text-tertiary">/100</span></span>
            </span>
            <button
              type="button"
              onClick={() => setIsInfluenceOpen(true)}
              aria-label={`${tCeleb("influence")} · ${influenceRank}`}
              aria-haspopup="dialog"
              title={`${tCeleb("influence")} · ${influenceRank}`}
              data-celeb-influence
              className={styles.influenceCorner}
            >{influenceRank && <InfluenceRankGlyph rank={influenceRank} className={styles.rankGlyph} />}</button>
          </div>
        )}
        closeButtonClassName="absolute -top-3 -right-3 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-line-strong bg-bg-raised text-text-secondary shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] hover:bg-bg-stone-light hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        animateHeightDuration={220}
        zIndex={zIndex}
        escapeCapture={escapeCapture}
        closeOnEscape={!isFactionsModalOpen && !isInfluenceOpen}
      >
        <div className={`${styles.surface} relative overflow-hidden animate-fade-in ${contextReview ? "pb-3" : "pb-6"}`}>
          {/* 머리 위로 옅은 금빛 — 장식 상자 없이 인물만 비춘다 */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_70%_100%_at_50%_0%,rgba(212,175,55,0.10),transparent_70%)]"
          />

          {/* 인물 요약: 이전·다음 화살표 + Avatar + 이름 + 메타 + 태그 */}
          <div className="relative flex shrink-0 flex-col items-center px-6 pt-8 pb-4">
            {/* 목록 탐색: 이전·다음 인물 버튼이 아바타 좌우를 호위한다 */}
            <div className={styles.portraitRow}>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate("prev")}
                  disabled={!hasPrev}
                  aria-label={t("prevPerson")}
                  className={`${navButtonClass} ${styles.navPrevious}`}
                  data-celeb-modal-nav="prev"
                >
                  <PortraitNavGlyph direction="prev" />
                </button>
              )}
              <div className={`relative shrink-0 ${styles.portraitSlot}`} data-celeb-modal-portrait>
                <CelebPortrait
                  key={celeb.id}
                  photoUrl={null}
                  avatarUrl={celeb.avatar_url}
                  nickname={displayNickname}
                  zIndex={zIndex}
                  zoomLabel={tCeleb("enlargePhoto")}
                  hasVoice={hasGreetingAudio}
                  isVoicePlaying={isVoiceActive}
                  onGreet={canGreet ? handleGreetingPlay : undefined}
                  greetLabel={greetLabel}
                  avatarSize="h-28 w-28"
                  initialSize="text-4xl"
                  avatarAlignment="center"
                  containerClassName={styles.portrait}
                  actionLayout="toolbar"
                  extraAction={followButton}
                />
              </div>
              {onNavigate && (
                <button
                  type="button"
                  onClick={() => onNavigate("next")}
                  disabled={!hasNext}
                  aria-label={t("nextPerson")}
                  className={`${navButtonClass} ${styles.navNext}`}
                  data-celeb-modal-nav="next"
                >
                  <PortraitNavGlyph direction="next" />
                </button>
              )}
            </div>

            {displayTitle && (
              <p className={`${styles.title} mb-1 text-xs text-accent font-bold uppercase tracking-[.25em]`}>{displayTitle}</p>
            )}

            {/* 이름과 상세 이동 링크를 나란히 묶어 중앙에 둔다. */}
            <div className={styles.nameRow}>
              <h2 data-celeb-modal-name className={`min-w-0 font-black font-serif text-text-primary leading-tight ${styles.name} text-3xl`}>
                {displayNickname}
              </h2>
              <Link
                href={getCelebProfileUrl(celeb)}
                locale={isEn ? "en" : undefined}
                onClick={() => trackEvent("celeb_person_go", { to: celeb.slug ?? celeb.id })}
                aria-label={t("viewProfile")}
                title={t("viewProfile")}
                data-celeb-modal-profile
                className="flex size-11 shrink-0 items-center justify-center rounded-control border border-line-strong bg-white/[0.03] text-accent hover:border-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:bg-accent/20"
              >
                <ArrowUpRight size={22} strokeWidth={2.5} aria-hidden />
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-sm text-text-secondary">
              {celeb.profession && (
                <span className="flex items-center gap-1">
                  <Briefcase size={14} />
                  {tProf.has(celeb.profession) ? tProf(celeb.profession) : celeb.profession}
                </span>
              )}
              {celeb.nationality && (
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  <NationalityText code={celeb.nationality} />
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
              <div className="mt-3 flex w-full max-w-full flex-wrap items-center justify-center gap-2 overflow-hidden">
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
            className={`${styles.quote} shrink-0`}
          />

          {/* 바이오 */}
          {displayBio && (
            <div className="shrink-0 px-6 pt-3">
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
                {(/^https?:\/\//.test(contextReview.sourceUrl ?? "") || celeb.content_count > 1) && (
                  <div className="mt-2 flex min-h-8 shrink-0 items-center justify-between gap-3">
                    {/^https?:\/\//.test(contextReview.sourceUrl ?? "") && (
                      <a href={contextReview.sourceUrl!} target="_blank" rel="noopener noreferrer"
                        className="inline-flex min-h-8 shrink-0 items-center rounded px-2 text-xs text-accent outline-none hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-accent">
                        {tCeleb("bookRelationSource")}
                      </a>
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
      {isInfluenceOpen && (
        <CelebInfluenceModal
          key={celeb.id}
          celebId={celeb.id}
          isOpen={isInfluenceOpen}
          onClose={() => setIsInfluenceOpen(false)}
          zIndex={(zIndex ?? Z_INDEX.modal) + 1}
          escapeCapture={escapeCapture}
        />
      )}
    </>
  );
}
