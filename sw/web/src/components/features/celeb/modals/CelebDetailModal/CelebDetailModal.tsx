/*
  셀럽 상세 모달
  - PC/모바일: 단일 컬럼, avatar 중심 레이아웃
  - 감상 기록 / 프로필 모드 전환
*/
"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "@/i18n/navigation";
import { X, Check, UserPlus, ExternalLink, Calendar, MapPin, Briefcase, User, Feather, ArrowLeft } from "lucide-react";
import { Z_INDEX } from "@/constants/zIndex";
import { toggleFollow } from "@/actions/user";
import { getCelebProfileUrl } from "@/lib/url";
import { trackEvent } from "@/lib/analytics/track";
import { getAuraByScore, type Aura } from "@/constants/materials";
import CelebTagsModal from "../CelebTagsModal";
import { FormattedText } from "@/components/ui";
import { getCelebReviews } from "@/actions/home/getCelebReviews";
import type { CelebReview } from "@/types/home";
import { Avatar } from "@/components/ui";
import { ContentTypeSummary } from "@/components/ui/ContentTypeSummary";
import { useTranslations, useLocale } from "next-intl";
import { AURA_GRADIENTS, type CelebDetailModalProps } from "./types";
import { CelebReviewCard } from "./sections/CelebReviewCard";

export default function CelebDetailModal({ celeb, isOpen, onClose, context, hideBirthDate = false, hideQuotes = false, onNavigate, hasPrev = false, hasNext = false, zIndex }: CelebDetailModalProps) {
  const t = useTranslations("home.ui");
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
  const [isReviewMode, setIsReviewMode] = useState(true);
  const [reviews, setReviews] = useState<CelebReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [displayCount, setDisplayCount] = useState(20);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const fetchedForRef = useRef<string | null>(null);

  // 모달 열릴 때 body 스크롤 잠금
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // celeb 전환 시 내부 상태 리셋 + 감상 기록 자동 로딩 (기본 뷰)
  useEffect(() => {
    setIsReviewMode(true);
    setReviews([]);
    setDisplayCount(20);
    setCategoryFilter(null);
    setIsFollowing(celeb.is_following);
    setIsTagsModalOpen(false);
    // Strict Mode 중복 fetch 방지 (cleanup 없이 ref로 관리)
    if (fetchedForRef.current === celeb.id) return;
    fetchedForRef.current = celeb.id;
    setLoadingReviews(true);
    getCelebReviews(celeb.id)
      .then(data => setReviews(data))
      .catch(err => {
        if (err?.name === 'AbortError') return;
        console.error('[CelebDetailModal] 리뷰 로딩 실패:', err);
        setReviews([]);
      })
      .finally(() => setLoadingReviews(false));
  }, [celeb.id]);

  // 키보드 네비게이션: ← 감상 기록 / → 프로필
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (isReviewMode && e.key === "ArrowRight") setIsReviewMode(false);
      else if (!isReviewMode && e.key === "ArrowLeft") setIsReviewMode(true);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, isReviewMode]);

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

    const result = await toggleFollow(celeb.id);
    if (!result.success) setIsFollowing(prevState);
    setIsLoading(false);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen || typeof document === "undefined") return null;

  // #region Shared Components
  const FollowButton = ({ className = "" }: { className?: string }) => (
    <button
      onClick={handleFollowClick}
      disabled={isLoading}
      className={`
        flex items-center justify-center gap-1.5 font-bold text-xs md:text-sm transition-all active:scale-95
        ${isFollowing
          ? "bg-black/40 backdrop-blur-md text-accent border border-accent/40 shadow-inner"
          : "bg-accent text-black border border-accent shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:shadow-[0_0_20px_rgba(212,175,55,0.6)]"
        }
        ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
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

  const ProfileLink = ({ className = "" }: { className?: string }) => (
    <Link
      href={getCelebProfileUrl(celeb)}
      onClick={() => trackEvent("celeb_person_go", { to: celeb.slug ?? celeb.id })}
      className={`
        flex items-center justify-center gap-1.5
        border border-accent/30 hover:border-accent/60
        text-accent font-bold text-xs md:text-sm
        hover:bg-accent/5
        hover:shadow-[0_0_20px_rgba(212,175,55,0.1)]
        active:scale-[0.98]
        transition-all duration-300
        backdrop-blur-sm
        ${className}
      `}
    >
      <ExternalLink size={14} strokeWidth={2} />
      <span>{t("viewProfile")}</span>
    </Link>
  );

  const MetaInfo = () => (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs md:text-sm text-text-tertiary justify-center md:justify-start">
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

  const TagBadges = () => {
    if (!celeb.tags || celeb.tags.length === 0) return null;

    // 최대 2개까지만 표시하고 나머지는 +N 처리 (가로폭 넘침 방지)
    const maxTags = 2;
    const displayTags = celeb.tags.slice(0, maxTags);
    const remainingCount = celeb.tags.length - maxTags;

    return (
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
        {remainingCount > 0 && (
           <button
             onClick={(e) => {
               e.stopPropagation();
               setIsTagsModalOpen(true);
             }}
             className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-bg-secondary text-[10px] text-text-tertiary font-bold border border-border hover:bg-bg-tertiary hover:text-text-primary transition-colors"
           >
             +{remainingCount}
           </button>
        )}
      </div>
    );
  };

  const ContextBanner = () => {
    if (!context) return null;

    return (
      <div
        className="mx-4 mt-4 border-l-2 bg-white/[0.035] px-3.5 py-3 text-left md:mx-6"
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
  };

  const ReviewView = () => {
    const filteredReviews = categoryFilter
      ? reviews.filter(r => r.content.type === categoryFilter)
      : reviews;

    return (
      <div className="relative w-full h-full min-h-0 flex flex-col bg-bg-main animate-fade-in">
        {/* 헤더: 타이틀 + 프로필 진입 버튼 */}
        <div className="flex items-center gap-2 p-4 border-b border-border/50 shrink-0">
          <h2 className="flex-1 min-w-0 text-center text-lg font-serif font-bold text-accent truncate">
            {t("reviewCount", { name: displayNickname, count: celeb.content_count || 0 })}
          </h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsReviewMode(false);
            }}
            className="shrink-0 flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors whitespace-nowrap"
          >
            <span>{t("characterInfo")}</span>
            <ArrowLeft size={14} className="rotate-180" />
          </button>
        </div>

        <ContextBanner />

        {/* 타입별 개수 요약 (클릭 시 필터) */}
        <ContentTypeSummary
          items={reviews.map(r => r.content)}
          value={categoryFilter}
          onChange={(type) => { setCategoryFilter(type); setDisplayCount(20); }}
          className="shrink-0 px-4 pt-4 pb-2"
        />

        {/* 리스트 영역 */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 md:p-8 custom-scrollbar">
          {loadingReviews ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-text-tertiary animate-pulse">{t("loadingRecords")}</p>
            </div>
          ) : filteredReviews.length > 0 ? (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {filteredReviews.slice(0, displayCount).map((reviewItem) => (
                  <CelebReviewCard key={reviewItem.id} review={reviewItem} celeb={celeb} modalZIndex={zIndex ? zIndex + 1 : undefined} />
                ))}
              </div>
              {displayCount < filteredReviews.length && (
                <button
                  onClick={() => setDisplayCount((prev) => prev + 20)}
                  className="w-full py-3 text-sm font-medium text-accent border border-accent/30 rounded-lg hover:bg-accent/5 active:scale-[0.98]"
                >
                  {t("loadMore", { count: filteredReviews.length - displayCount })}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Feather size={48} className="text-text-tertiary/20 mb-4" />
              <p className="text-text-secondary font-medium mb-1">{t("empty.noPublicReviews")}</p>
              <p className="text-xs text-text-tertiary">{t("empty.pleaseWait")}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const ProfileView = () => (
    <div className="flex flex-col w-full h-full overflow-y-auto custom-scrollbar animate-fade-in">
      {/* 상단: 뒤로가기 + 영향력 */}
      <div className="flex items-center justify-between p-4 shrink-0">
        <button
          onClick={() => setIsReviewMode(true)}
          className="flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          <span>{t("viewingRecords")}</span>
        </button>
      </div>

      <ContextBanner />

      {/* Avatar + 이름 + 메타 */}
      <div className="flex flex-col items-center px-6 pb-4 shrink-0">
        <Avatar
          url={celeb.avatar_url}
          name={displayNickname}
          size="2xl"
          className="ring-2 ring-accent/30 rounded-full shadow-2xl mb-4"
        />

        {displayTitle && (
          <p className="text-[10px] text-accent font-bold uppercase tracking-[.25em] mb-1">{displayTitle}</p>
        )}

        <h2 className="text-2xl md:text-3xl font-black font-serif text-text-primary leading-tight text-center break-all mb-3">
          {displayNickname}
        </h2>

        <MetaInfo />

        {celeb.tags && celeb.tags.length > 0 && (
          <div className="mt-3 w-full max-w-full overflow-hidden flex justify-center">
            <TagBadges />
          </div>
        )}
      </div>

      {/* 인용구 */}
      {!hideQuotes && displayQuotes && (
        <blockquote className="text-xs md:text-sm text-text-tertiary font-serif bg-white/[0.03] rounded-sm py-4 mx-6 mb-2 leading-relaxed text-center px-4">
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

      {/* 하단 액션 */}
      <div className="flex gap-3 px-6 md:px-8 py-6 shrink-0 mt-auto">
        <FollowButton className="flex-1 py-3 rounded-2xl md:rounded-sm" />
        <ProfileLink className="flex-1 py-3 rounded-2xl md:rounded-sm" />
      </div>
    </div>
  );

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
      style={{ zIndex: zIndex ?? Z_INDEX.modal }}
      onClick={handleBackdropClick}
    >
      {/* PC: 중앙 모달 */}
      <div className="hidden md:flex items-center justify-center h-full p-6">
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
            {isReviewMode ? (
              <ReviewView />
            ) : (
              <ProfileView />
            )}
          </div>
        </div>
      </div>

      {/* 모바일: Bottom Sheet */}
      <div className="md:hidden flex flex-col justify-end h-full relative">
        <div className="shrink-0 h-[12vh] w-full z-10" onClick={onClose} />
        <div className="bg-bg-main rounded-t-[2.5rem] flex flex-col animate-bottomsheet-content shadow-[0_-20px_40px_rgba(0,0,0,0.4)] overflow-hidden h-[88vh]">
          {isReviewMode ? (
            <ReviewView />
          ) : (
            <ProfileView />
          )}
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
