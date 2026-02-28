/*
  셀럽 상세 모달
  - PC/모바일: 단일 컬럼, avatar 중심 레이아웃
  - 감상 기록 / 프로필 모드 전환
*/
"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Check, UserPlus, ExternalLink, Calendar, MapPin, Briefcase, User, Feather, ArrowLeft } from "lucide-react";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { Z_INDEX } from "@/constants/zIndex";
import { toggleFollow } from "@/actions/user";
import type { CelebProfile } from "@/types/home";
import { getCelebProfileUrl } from "@/lib/url";
import { getAuraByScore, type Aura } from "@/constants/materials";
import CelebTagsModal from "./CelebTagsModal";
import { FormattedText } from "@/components/ui";
import { getCelebReviews } from "@/actions/home/getCelebReviews";
import type { CelebReview } from "@/types/home";
import { ContentCard } from "@/components/ui/cards";
import { Avatar, TitleBadge, Modal as UiModal, ModalBody, ModalFooter } from "@/components/ui";
import { ContentTypeSummary } from "@/components/ui/ContentTypeSummary";
import Button from "@/components/ui/Button";
import { updateUserContentRating } from "@/actions/contents/updateRating";
import RatingEditModal from "@/components/ui/cards/ContentCard/modals/RatingEditModal";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useRouter } from "next/navigation";

// #region Constants (materials.ts 기반 오라별 그라데이션)
const AURA_GRADIENTS: Record<Aura, string> = {
  1: "from-[#8d6e63] via-[#5d4037] to-[#3e2723]",         // wood (필멸자)
  2: "from-[#607d8b] via-[#455a64] to-[#263238]",         // stone (순례자)
  3: "from-[#D4C1A5] via-[#8C7853] to-[#5D4037]",         // bronze (수사)
  4: "from-[#FFFFFF] via-[#C0C0C0] to-[#808080]",         // silver (전도사)
  5: "from-[#FCF6BA] via-[#D4AF37] to-[#8A6E2F]",         // gold (사제)
  6: "from-[#98FB98] via-[#50C878] to-[#2E8B57]",         // emerald (신관)
  7: "from-[#FF6B6B] via-[#DC143C] to-[#8B0000]",         // crimson (선지자)
  8: "from-[#E0FFFF] via-[#B0E0E6] to-[#87CEEB]",         // diamond (사도)
  9: "from-[#FF00FF] via-[#00FFFF] to-[#FFFF00]",         // holographic (불멸자)
};

// #endregion

// #region Inline Celeb Review Card (for modal)
function CelebReviewCard({ review, celeb, onRatingUpdate, modalZIndex }: { review: CelebReview; celeb: CelebProfile; onRatingUpdate?: (id: string, rating: number | null) => void; modalZIndex?: number }) {
  const router = useRouter();
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [currentRating, setCurrentRating] = useState<number | null>(review.rating);

  const timeAgo = formatDistanceToNow(new Date(review.updated_at), { addSuffix: true, locale: ko });

  const handleNavigateToUser = () => {
    setShowUserModal(false);
    router.push(`/${celeb.id}`);
  };

  const headerNode = (
    <div className="flex items-center gap-4 py-1">
      <button
        type="button"
        className="flex-shrink-0 cursor-pointer"
        onClick={(e) => { e.stopPropagation(); setShowUserModal(true); }}
      >
        <Avatar url={celeb.avatar_url} name={celeb.nickname} size="md" className="ring-1 ring-accent/30 rounded-full shadow-lg" />
      </button>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-sm font-bold text-text-primary tracking-tight hover:text-accent cursor-pointer"
            onClick={(e) => { e.stopPropagation(); setShowUserModal(true); }}
          >
            {celeb.nickname}
          </button>
          <TitleBadge title={null} size="sm" />
          {celeb.is_verified && (
            <span className="bg-[#d4af37] text-black text-[8px] px-1.5 py-0.5 font-black font-cinzel leading-none tracking-tight">
              OFFICIAL
            </span>
          )}
        </div>
        <p className="text-[10px] text-accent/60 font-medium font-sans uppercase tracking-wider">
          {celeb.title || "기록자"} · {timeAgo}
        </p>
      </div>
    </div>
  );

  return (
    <>
      <ContentCard
        contentId={review.content.id}
        contentType={review.content.type}
        title={review.content.title}
        creator={review.content.creator}
        thumbnail={review.content.thumbnail_url}
        celebCount={review.content.celeb_count}
        userCount={review.content.user_count}
        rating={currentRating}
        onRatingClick={(e) => { e.stopPropagation(); setShowRatingModal(true); }}
        review={review.review}
        isSpoiler={review.is_spoiler}
        sourceUrl={review.source_url}
        href=""
        ownerNickname={celeb.nickname}
        headerNode={headerNode}
        heightClass="h-[320px] md:h-[280px]"
        modalZIndex={modalZIndex}
      />

      <RatingEditModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        contentTitle={review.content.title}
        currentRating={currentRating}
        onSave={async (rating) => {
          const result = await updateUserContentRating({ userContentId: review.id, rating });
          if (result.success) {
            setCurrentRating(rating);
            onRatingUpdate?.(review.id, rating);
          }
        }}
        zIndex={modalZIndex}
      />

      <UiModal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="기록관 방문" icon={User} size="sm" closeOnOverlayClick zIndex={modalZIndex}>
        <ModalBody>
          <p className="text-text-secondary">
            <span className="text-text-primary font-semibold">{celeb.nickname}</span>
            님의 기록관으로 이동하시겠습니까?
          </p>
        </ModalBody>
        <ModalFooter className="justify-end">
          <Button variant="ghost" size="md" onClick={() => setShowUserModal(false)}>취소</Button>
          <Button variant="primary" size="md" onClick={handleNavigateToUser}>이동</Button>
        </ModalFooter>
      </UiModal>
    </>
  );
}
// #endregion

interface CelebDetailModalProps {
  celeb: CelebProfile;
  isOpen: boolean;
  onClose: () => void;
  hideBirthDate?: boolean;
  hideQuotes?: boolean;
  // 리스트 컨텍스트 네비게이션 (선택)
  onNavigate?: (direction: "prev" | "next") => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  /** 커스텀 z-index (게임 전체화면 등 Z_INDEX.top 위에 표시할 때) */
  zIndex?: number;
}

export default function CelebDetailModal({ celeb, isOpen, onClose, hideBirthDate = false, hideQuotes = false, onNavigate, hasPrev = false, hasNext = false, zIndex }: CelebDetailModalProps) {
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
      <span>{isFollowing ? "팔로잉" : "팔로우"}</span>
      <span className="font-extrabold">
        {celeb.follower_count || 0}명
      </span>
    </button>
  );

  const ProfileLink = ({ className = "" }: { className?: string }) => (
    <Link
      href={getCelebProfileUrl(celeb)}
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
      <span>프로필 보기</span>
    </Link>
  );

  const MetaInfo = () => (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs md:text-sm text-text-tertiary justify-center md:justify-start">
      {celeb.profession && (
        <span className="flex items-center gap-1">
          <Briefcase size={12} />
          {getCelebProfessionLabel(celeb.profession)}
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
            {tag.name}
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

  const ReviewView = () => {
    const filteredReviews = categoryFilter
      ? reviews.filter(r => r.content.type === categoryFilter)
      : reviews;

    return (
      <div className="relative w-full h-full min-h-0 flex flex-col bg-bg-main animate-fade-in">
        {/* 헤더: 타이틀 + 프로필 진입 버튼 */}
        <div className="flex items-center p-4 border-b border-border/50 shrink-0 relative">
          <h2 className="flex-1 text-center text-lg font-serif font-bold text-accent truncate px-20">
            {celeb.nickname}의 {celeb.content_count || 0}개의 감상 기록
          </h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsReviewMode(false);
            }}
            className="absolute right-4 flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary transition-colors"
          >
            <span>인물 정보</span>
            <ArrowLeft size={14} className="rotate-180" />
          </button>
        </div>

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
              <p className="text-sm text-text-tertiary animate-pulse">기록을 불러오는 중...</p>
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
                  더보기 ({filteredReviews.length - displayCount}개 남음)
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Feather size={48} className="text-text-tertiary/20 mb-4" />
              <p className="text-text-secondary font-medium mb-1">아직 공개된 감상이 없습니다</p>
              <p className="text-xs text-text-tertiary">조금 더 기다려주세요</p>
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
          <span>감상 기록</span>
        </button>
      </div>

      {/* Avatar + 이름 + 메타 */}
      <div className="flex flex-col items-center px-6 pb-4 shrink-0">
        <Avatar
          url={celeb.avatar_url}
          name={celeb.nickname}
          size="2xl"
          className="ring-2 ring-accent/30 rounded-full shadow-2xl mb-4"
        />

        {celeb.title && (
          <p className="text-[10px] text-accent font-bold uppercase tracking-[.25em] mb-1">{celeb.title}</p>
        )}

        <h2 className="text-2xl md:text-3xl font-black font-serif text-text-primary leading-tight text-center break-all mb-3">
          {celeb.nickname}
        </h2>

        <MetaInfo />

        {celeb.tags && celeb.tags.length > 0 && (
          <div className="mt-3 w-full max-w-full overflow-hidden flex justify-center">
            <TagBadges />
          </div>
        )}
      </div>

      {/* 인용구 */}
      {!hideQuotes && celeb.quotes && (
        <blockquote className="text-xs md:text-sm text-text-tertiary font-serif bg-white/[0.03] rounded-sm py-4 mx-6 mb-2 leading-relaxed text-center px-4">
          &ldquo;<FormattedText text={celeb.quotes} />&rdquo;
        </blockquote>
      )}

      {/* 바이오 */}
      {celeb.bio && (
        <div className="px-6 md:px-8 pt-4 pb-2">
          <p className="text-xs md:text-sm text-text-secondary leading-relaxed text-left break-all">
            <User size={16} className="float-left mr-2 text-accent opacity-80 mt-0.5" strokeWidth={2.5} />
            <FormattedText text={celeb.bio} />
          </p>
        </div>
      )}

      {/* 구분선 */}
      {(celeb.bio || celeb.quotes) && celeb.consumption_philosophy && (
        <div className="w-full h-px bg-accent/20 my-2 mx-auto max-w-[calc(100%-3rem)]" />
      )}

      {/* 감상 철학 */}
      {celeb.consumption_philosophy && (
        <div className="px-6 md:px-8 pt-4 pb-2">
          <p className="text-xs md:text-sm text-text-secondary leading-relaxed whitespace-pre-line break-all text-left">
            <Feather size={16} className="float-left mr-2 text-accent opacity-80 mt-0.5" strokeWidth={2.5} />
            <FormattedText text={celeb.consumption_philosophy} />
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
        title={`${celeb.nickname}의 키워드`}
        zIndex={zIndex ? zIndex + 1 : undefined}
      />
    </div>
  );

  return createPortal(modalContent, document.body);
}
