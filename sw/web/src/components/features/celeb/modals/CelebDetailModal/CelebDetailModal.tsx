/*
  셀럽 상세 모달
  - PC/모바일: 단일 컬럼 세로 카드 (인물 요약 → 감상 기록)
*/
"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "@/i18n/navigation";
import { X, Check, UserPlus, ExternalLink, Calendar, MapPin, Briefcase, User } from "lucide-react";
import { Z_INDEX } from "@/constants/zIndex";
import { toggleFollow } from "@/actions/user";
import { getCelebProfileUrl } from "@/lib/url";
import { trackEvent } from "@/lib/analytics/track";
import { getAuraByScore, type Aura } from "@/constants/materials";
import CelebTagsModal from "../CelebTagsModal";
import { FormattedText } from "@/components/ui";
import { getCelebModalContent } from "@/actions/home/getCelebReviews";
import type { CelebReview } from "@/types/home";
import { Avatar, BlurDissolve } from "@/components/ui";
import { useTranslations, useLocale } from "next-intl";
import { AURA_GRADIENTS, type CelebDetailModalProps } from "./types";
import { CelebReviewCard } from "./sections/CelebReviewCard";

export default function CelebDetailModal({ celeb, isOpen, onClose, context, hideBirthDate = false, hideQuotes = false, onNavigate, hasPrev = false, hasNext = false, zIndex }: CelebDetailModalProps) {
  const t = useTranslations("home.ui");
  const tCeleb = useTranslations("celebPage");
  const tProf = useTranslations("profession");
  const locale = useLocale();
  const isEn = locale === "en";

  // locale별 텍스트 선택 (영문 fallback → 한국어)
  const displayTitle = (isEn && celeb.title_en) || celeb.title;
  const displayBio = (isEn && celeb.bio_en) || celeb.bio;
  const displayQuotes = (isEn && celeb.quotes_en) || celeb.quotes;
  const displayNickname = (isEn && celeb.nickname_en) || celeb.nickname;

  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(celeb.is_following);
  const [isLoading, setIsLoading] = useState(false);
  const [reviews, setReviews] = useState<CelebReview[]>([]);
  const [personGuide, setPersonGuide] = useState<string | null>(null);

  const fetchedForRef = useRef<string | null>(null);

  // celeb 전환 시 내부 상태 리셋 (렌더 중 이전 값 비교 — effect 내 setState 금지 규칙 준수)
  const [renderedCelebId, setRenderedCelebId] = useState(celeb.id);
  if (renderedCelebId !== celeb.id) {
    setRenderedCelebId(celeb.id);
    setReviews([]);
    setPersonGuide(null);
    setIsFollowing(celeb.is_following);
    setIsTagsModalOpen(false);
  }

  // 모달 열릴 때 body 스크롤 잠금
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // 대표 감상 기록과 인물 안내 로딩 (Strict Mode 중복 fetch는 ref로 방지)
  useEffect(() => {
    if (!isOpen) return;
    if (fetchedForRef.current === celeb.id) return;
    fetchedForRef.current = celeb.id;
    getCelebModalContent(celeb.id)
      .then(data => {
        if (fetchedForRef.current !== celeb.id) return;
        setReviews(data.reviews);
        setPersonGuide(data.personGuide);
      })
      .catch(err => {
        if (err?.name === 'AbortError') return;
        console.error('[CelebDetailModal] 모달 콘텐츠 로딩 실패:', err);
        if (fetchedForRef.current !== celeb.id) return;
        setReviews([]);
        setPersonGuide(null);
      });
  }, [celeb.id, isOpen]);

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

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen || typeof document === "undefined") return null;

  // #region 화면 조각 (단일 사용 JSX)
  const followButton = (
    <button
      onClick={handleFollowClick}
      disabled={isLoading}
      className={`
        flex-1 py-3 rounded-2xl md:rounded-sm
        flex items-center justify-center gap-1.5 font-bold text-xs md:text-sm transition-all active:scale-95
        ${isFollowing
          ? "bg-black/40 backdrop-blur-md text-accent border border-accent/40 shadow-inner"
          : "bg-accent text-black border border-accent shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:shadow-[0_0_20px_rgba(212,175,55,0.6)]"
        }
        ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
      `}
    >
      {isFollowing ? (
        <Check size={14} strokeWidth={3} />
      ) : (
        <UserPlus size={14} strokeWidth={3} />
      )}
      <span>{isFollowing ? t("followingLabel") : t("followLabel")}</span>
      <span className="font-extrabold">
        {t("followerUnit", { count: celeb.follower_count || 0 })}
      </span>
    </button>
  );

  const profileLink = (
    <Link
      href={getCelebProfileUrl(celeb)}
      locale={isEn ? "en" : undefined}
      onClick={() => trackEvent("celeb_person_go", { to: celeb.slug ?? celeb.id })}
      className="
        flex-1 py-3 rounded-2xl md:rounded-sm
        flex items-center justify-center gap-1.5
        border border-accent/30 hover:border-accent/60
        text-accent font-bold text-xs md:text-sm
        hover:bg-accent/5
        hover:shadow-[0_0_20px_rgba(212,175,55,0.1)]
        active:scale-[0.98]
        transition-all duration-300
        backdrop-blur-sm
      "
    >
      <ExternalLink size={14} strokeWidth={2} />
      <span>{t("viewProfile")}</span>
    </Link>
  );

  const metaInfo = (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs md:text-sm justify-center">
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
  );

  // 태그: 최대 2개까지만 표시하고 나머지는 +N 처리 (가로폭 넘침 방지)
  const maxTags = 2;
  const displayTags = (celeb.tags ?? []).slice(0, maxTags);
  const remainingTagCount = (celeb.tags?.length ?? 0) - maxTags;

  const tagBadges = displayTags.length > 0 && (
    <div className="mt-3 w-full max-w-full overflow-hidden flex justify-center">
      <div className="flex items-center justify-center gap-2 w-full max-w-full flex-wrap">
        {displayTags.map(tag => (
          <button
            key={tag.id}
            onClick={(e) => {
              e.stopPropagation();
              setIsTagsModalOpen(true);
            }}
            className="shrink-0 px-3 py-1 text-[11px] md:text-xs font-medium rounded-full border border-current/20 backdrop-blur-sm shadow-sm transition-all hover:scale-105 active:scale-95"
            style={{
              backgroundColor: `${tag.color}15`,
              color: tag.color,
              borderColor: `${tag.color}30`
            }}
          >
            {locale === 'en' ? (tag.name_en ?? tag.name) : tag.name}
          </button>
        ))}
        {remainingTagCount > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsTagsModalOpen(true);
            }}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-bg-secondary text-[10px] font-bold border border-border hover:bg-bg-tertiary hover:text-text-primary transition-colors"
          >
            +{remainingTagCount}
          </button>
        )}
      </div>
    </div>
  );

  const contextBanner = context && (
    <div
      className="mx-4 mt-4 border-l-2 bg-white/[0.035] px-3.5 py-3 text-left md:mx-6 shrink-0"
      style={{ borderColor: context.color ?? "var(--color-accent)" }}
    >
      <p
        className="text-[11px] font-bold tracking-wide"
        style={{ color: context.color ?? "var(--color-accent)" }}
      >
        {context.label}
      </p>
      {context.description && (
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          {context.description}
        </p>
      )}
    </div>
  );
  // #endregion

  const modalBody = (
    <div className="flex flex-col w-full h-full min-h-0 overflow-y-auto overscroll-contain custom-scrollbar bg-bg-main animate-fade-in">
      {contextBanner}

      {/* 인물 요약: Avatar + 이름 + 메타 + 태그 */}
      <div className="flex flex-col items-center px-6 pt-8 pb-4 shrink-0">
        <BlurDissolve>
          <Avatar
            url={celeb.avatar_url}
            name={displayNickname}
            size="2xl"
            className="ring-2 ring-accent/30 rounded-full shadow-2xl mb-4"
          />
        </BlurDissolve>

        {displayTitle && (
          <p className="text-[10px] text-accent font-bold uppercase tracking-[.25em] mb-1">{displayTitle}</p>
        )}

        <h2 className="text-2xl md:text-3xl font-black font-serif text-text-primary leading-tight text-center break-all mb-3">
          {displayNickname}
        </h2>

        {metaInfo}
        {tagBadges}
      </div>

      {/* 인용구 */}
      {!hideQuotes && displayQuotes && (
        <blockquote className="text-xs md:text-sm font-serif bg-white/[0.03] rounded-sm py-4 mx-6 mb-2 leading-relaxed text-center px-4">
          <FormattedText text={displayQuotes} />
        </blockquote>
      )}

      {/* 바이오 */}
      {displayBio && (
        <div className="px-6 md:px-8 pt-4 pb-2">
          <p className="text-xs md:text-sm text-text-secondary leading-relaxed text-left break-all">
            <User size={16} className="float-left mr-2 text-accent opacity-80 mt-0.5" strokeWidth={2.5} />
            <FormattedText text={displayBio} />
          </p>
        </div>
      )}

      {/* 가상 독백 노출은 폐기했다. celebs.virtual_monologue 값은 제작 재료로만 보존한다. */}
      {personGuide ? (
        <section className="mx-6 md:mx-8 mt-4 border-y border-accent/20 py-5">
          <h3 className="mb-2 text-center text-base font-serif font-bold text-accent">
            {tCeleb("personGuide")}
          </h3>
          <div className="space-y-3 font-serif text-sm leading-loose text-text-secondary break-keep">
            {personGuide.split(/\n\n+/).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        </section>
      ) : null}

      {/* 액션: 팔로우 + 프로필 진입 */}
      <div className="flex gap-3 px-6 md:px-8 py-5 shrink-0">
        {followButton}
        {profileLink}
      </div>

      {/* 공개 감상문이 있을 때만 대표작 2개를 미리보기로 노출 */}
      {reviews.length > 0 ? (
        <section className="border-t border-border/50 px-4 pb-8 pt-6 md:px-8">
          <h3 className="text-center text-lg font-serif font-bold text-accent">
            {t("featuredWorks", { name: displayNickname })}
          </h3>
          <div className="mx-auto mt-4 grid max-w-4xl grid-cols-1 gap-4">
            {reviews.map((reviewItem) => (
              <CelebReviewCard key={reviewItem.id} review={reviewItem} celeb={celeb} modalZIndex={zIndex ? zIndex + 1 : undefined} />
            ))}
          </div>
          <div className="mt-5 text-center">
            <p className="mb-3 text-xs text-text-secondary">
              {t("viewAllRecordsOnProfile")}
            </p>
            <Link
              href={getCelebProfileUrl(celeb)}
              locale={isEn ? "en" : undefined}
              onClick={() => trackEvent("celeb_person_go", { to: celeb.slug ?? celeb.id })}
              className="inline-flex items-center gap-1.5 border border-accent/40 px-4 py-2 text-xs font-bold text-accent hover:border-accent hover:bg-accent/5 active:scale-[0.98]"
            >
              <ExternalLink size={13} strokeWidth={2} />
              {t("viewAllRecords")}
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
      style={{ zIndex: zIndex ?? Z_INDEX.modal }}
      onClick={handleBackdropClick}
    >
      {/* PC: 중앙 모달 */}
      <div className="hidden md:flex items-center justify-center h-full p-6" onClick={handleBackdropClick}>
        <div className="relative w-full max-w-[520px] animate-modal-content shadow-[0_0_50px_-12px_rgba(212,175,55,0.25)]">
          {/* 그라데이션 테두리 */}
          <div className={`absolute -inset-[3px] bg-gradient-to-br ${borderGradient} opacity-90 rounded-sm`} />

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="absolute -top-3 -right-3 z-20 w-8 h-8 bg-bg-main rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-card"
          >
            <X size={16} />
          </button>

          <div className="relative bg-bg-main h-[720px] max-h-[80vh] overflow-hidden flex flex-col">
            {modalBody}
          </div>
        </div>
      </div>

      {/* 모바일: Bottom Sheet */}
      <div className="md:hidden flex flex-col justify-end h-full relative" onClick={handleBackdropClick}>
        <div className="shrink-0 h-[12vh] w-full z-10" onClick={onClose} />
        <div className="bg-bg-main rounded-t-[2.5rem] flex flex-col animate-bottomsheet-content shadow-[0_-20px_40px_rgba(0,0,0,0.4)] overflow-hidden h-[88vh]">
          {modalBody}
        </div>
      </div>

      {/* 태그 상세 모달 */}
      <CelebTagsModal
        isOpen={isTagsModalOpen}
        onClose={() => setIsTagsModalOpen(false)}
        tags={celeb.tags || []}
        title={t("keywords", { name: displayNickname })}
        zIndex={zIndex ? zIndex + 1 : undefined}
      />
    </div>
  );

  return createPortal(modalContent, document.body);
}
