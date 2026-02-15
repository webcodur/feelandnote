/*
  2안용 상세 모달
  - PC: 좌우 분할 레이아웃 (초상화 | 정보)
  - 모바일: Bottom Sheet 스타일
*/
"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Check, UserPlus, ExternalLink, Calendar, MapPin, Briefcase, User, Feather, ArrowLeft } from "lucide-react";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { Z_INDEX } from "@/constants/zIndex";
import { toggleFollow } from "@/actions/user";
import type { CelebProfile } from "@/types/home";
import { getAuraByScore, type Aura } from "@/constants/materials";
import CelebInfluenceModal from "../CelebInfluenceModal";
import CelebTagsModal from "./CelebTagsModal";
import InfluenceBadge from "@/components/ui/InfluenceBadge";
import { FormattedText } from "@/components/ui";
import { getCelebReviews } from "@/actions/home/getCelebReviews";
import type { CelebReview } from "@/types/home";
import { ContentCard } from "@/components/ui/cards";
import { Avatar, TitleBadge, Modal as UiModal, ModalBody, ModalFooter } from "@/components/ui";
import Button from "@/components/ui/Button";
import { updateUserContentRating } from "@/actions/contents/updateRating";
import RatingEditModal from "@/components/ui/cards/ContentCard/modals/RatingEditModal";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { CategoryTabFilter } from "@/components/ui/CategoryTabFilter";
import type { ContentType } from "@/types/database";

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

type CategoryFilter = "ALL" | "BOOK" | "VIDEO" | "GAME" | "MUSIC";

const CATEGORY_TABS: { value: CategoryFilter; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "BOOK", label: "도서" },
  { value: "VIDEO", label: "영상" },
  { value: "GAME", label: "게임" },
  { value: "MUSIC", label: "음악" },
];
// #endregion

// #region Inline Celeb Review Card (for modal)
function CelebReviewCard({ review, celeb, onRatingUpdate }: { review: CelebReview; celeb: CelebProfile; onRatingUpdate?: (id: string, rating: number | null) => void }) {
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
      />

      <UiModal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title="기록관 방문" icon={User} size="sm" closeOnOverlayClick>
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
  hideInfluence?: boolean;
  hideQuotes?: boolean;
  // 리스트 컨텍스트 네비게이션 (선택)
  onNavigate?: (direction: "prev" | "next") => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export default function CelebDetailModal({ celeb, isOpen, onClose, hideBirthDate = false, hideInfluence = false, hideQuotes = false, onNavigate, hasPrev = false, hasNext = false }: CelebDetailModalProps) {
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(celeb.is_following);
  const [isLoading, setIsLoading] = useState(false);
  const [isInfluenceOpen, setIsInfluenceOpen] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(true);
  const [reviews, setReviews] = useState<CelebReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [displayCount, setDisplayCount] = useState(20);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");

  // 리뷰 모드 전환 드래그 상태
  const [navDragOffset, setNavDragOffset] = useState(0);
  const [isNavDragging, setIsNavDragging] = useState(false);
  const navDragStartX = useRef(0);
  const navDragStartY = useRef(0);
  const navHasMoved = useRef(false);
  const NAV_SWIPE_THRESHOLD = 80;
  const fetchedForRef = useRef<string | null>(null);

  // celeb 전환 시 내부 상태 리셋 + 감상 기록 자동 로딩 (기본 뷰)
  useEffect(() => {
    setIsReviewMode(true);
    setReviews([]);
    setDisplayCount(20);
    setCategoryFilter("ALL");
    setIsFollowing(celeb.is_following);
    setIsInfluenceOpen(false);
    setIsTagsModalOpen(false);
    setNavDragOffset(0);
    setIsNavDragging(false);
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

  // 감상 기록 모드 복귀 (데이터는 이미 자동 로딩됨)
  const handleEnterReviewMode = () => {
    setIsReviewMode(true);
  };

  // 오라 시스템: score 기반으로 오라 결정 (SSOT: materials.ts/getAuraByScore)
  const aura: Aura = celeb.influence?.total_score != null
    ? getAuraByScore(celeb.influence.total_score)
    : 1;
  const borderGradient = AURA_GRADIENTS[aura];
  const portraitImage = celeb.portrait_url || celeb.avatar_url;

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
      href={`/${celeb.id}`}
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
    const filteredReviews = categoryFilter === "ALL"
      ? reviews
      : reviews.filter(r => r.content.type === categoryFilter);

    return (
      <div className="relative w-full h-full flex flex-col bg-bg-main animate-fade-in">
        {/* 헤더: 타이틀 + 프로필 진입 버튼 */}
        <div className="flex items-center p-4 border-b border-border/50 shrink-0 relative">
          <h2 className="flex-1 text-center text-lg font-serif font-bold text-accent">
            {celeb.content_count || 0}개의 감상 기록
          </h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsReviewMode(false);
            }}
            className="absolute right-4 flex items-center gap-1 px-3 py-1.5 rounded-full hover:bg-white/5 text-text-secondary hover:text-text-primary text-xs font-medium transition-colors"
          >
            <User size={14} />
            <span>프로필</span>
          </button>
        </div>

        {/* 카테고리 필터 */}
        <div className="shrink-0 px-4 pt-4 pb-2">
          <CategoryTabFilter
            options={CATEGORY_TABS}
            value={categoryFilter}
            onChange={setCategoryFilter}
            className="mb-0"
          />
        </div>

        {/* 리스트 영역 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {loadingReviews ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-text-tertiary animate-pulse">기록을 불러오는 중...</p>
            </div>
          ) : filteredReviews.length > 0 ? (
            <div className="max-w-4xl mx-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {filteredReviews.slice(0, displayCount).map((reviewItem) => (
                  <CelebReviewCard key={reviewItem.id} review={reviewItem} celeb={celeb} />
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
              <p className="text-text-secondary font-medium mb-1">
                {categoryFilter === "ALL"
                  ? "아직 공개된 감상이 없습니다"
                  : `${CATEGORY_TABS.find(t => t.value === categoryFilter)?.label} 감상이 없습니다`}
              </p>
              <p className="text-xs text-text-tertiary">조금 더 기다려주세요</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // #region 리뷰 모드 진입 드래그 핸들러 (인물 정보 → 리뷰 모드만)
  const handleNavDragStart = (clientX: number, clientY: number) => {
    if (isReviewMode) return; // 리뷰 모드에서는 드래그 비활성화
    setIsNavDragging(true);
    navHasMoved.current = false;
    navDragStartX.current = clientX;
    navDragStartY.current = clientY;
    setNavDragOffset(0);
  };

  const handleNavDragMove = (clientX: number, clientY: number) => {
    if (!isNavDragging || isReviewMode) return;
    const diffX = clientX - navDragStartX.current;
    const diffY = clientY - navDragStartY.current;
    // 세로 스크롤 우선: Y 이동이 X보다 크면 무시
    if (!navHasMoved.current && Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 10) {
      setIsNavDragging(false);
      setNavDragOffset(0);
      return;
    }
    if (Math.abs(diffX) > 8) navHasMoved.current = true;
    // 우 스와이프만 허용 (좌 스와이프는 저항)
    const resistance = diffX < 0 ? 0.3 : 1;
    setNavDragOffset(diffX * resistance);
  };

  const handleNavDragEnd = () => {
    if (!isNavDragging || isReviewMode) return;
    // 우 스와이프 → 감상 기록으로 복귀
    if (navDragOffset > NAV_SWIPE_THRESHOLD) {
      handleEnterReviewMode();
    }
    setNavDragOffset(0);
    setIsNavDragging(false);
  };

  // 모바일 전용 터치 핸들러 (PC 마우스 드래그 제외)
  const navDragHandlers = {
    onTouchStart: (e: React.TouchEvent) => handleNavDragStart(e.touches[0].clientX, e.touches[0].clientY),
    onTouchMove: (e: React.TouchEvent) => handleNavDragMove(e.touches[0].clientX, e.touches[0].clientY),
    onTouchEnd: handleNavDragEnd,
  };

  const navDragStyle = isNavDragging ? {
    transform: `translateX(${navDragOffset * 0.3}px)`,
    opacity: 1 - Math.abs(navDragOffset) * 0.002,
  } : undefined;
  // #endregion

  const HandleButton = ({ className = "" }: { className?: string }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setIsReviewMode(false);
      }}
      className={`
        absolute flex items-center justify-center
        w-5 h-10 bg-accent/20 border border-accent/40 rounded-l-md
        shadow-[0_0_12px_rgba(212,175,55,0.4)] hover:shadow-[0_0_20px_rgba(212,175,55,0.6)]
        text-accent hover:bg-accent/30 hover:w-6 hover:border-accent/60
        transition-all duration-300 z-50 cursor-pointer group
        animate-pulse
        ${className}
      `}
      title="프로필 보기"
    >
      <div className="w-0.5 h-5 bg-accent rounded-full opacity-60 group-hover:opacity-100 transition-opacity" />
    </button>
  );
  // #endregion

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
      style={{ zIndex: Z_INDEX.modal }}
      onClick={handleBackdropClick}
    >
      {/* PC 레이아웃: 중앙 모달, 좌우 분할 */}
      <div className="hidden md:flex items-center justify-center h-full p-6">
        <div className="relative w-full max-w-[840px] animate-modal-content shadow-[0_0_50px_-12px_rgba(212,175,55,0.25)]">
          {/* 그라데이션 테두리 */}
          <div className={`absolute -inset-[3px] bg-gradient-to-br ${borderGradient} opacity-90 rounded-sm`} />

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="absolute -top-3 -right-3 z-20 w-8 h-8 bg-bg-main rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-card"
          >
            <X size={16} />
          </button>

          {/* 내부: 좌우 분할 - 고정 높이 복구, Bio는 다 보여주고 철학은 스크롤 */}
          <div className="relative bg-bg-main flex h-[720px] overflow-hidden">
             
            {/* PC 리뷰 모드 뷰 (기본) */}
            {isReviewMode ? (
              <>
                {/* PC 핸들 버튼: 우측 끝 중앙 → 프로필 진입 */}
                <HandleButton className="right-0 top-1/2 -translate-y-1/2 rounded-r-none rounded-l-lg translate-x-0.5 hover:translate-x-0" />
                <ReviewView />
              </>
            ) : (
               <>
                 {/* PC 초상화 영역 */}
                 <div className="relative w-[45%] h-full bg-black flex-shrink-0 group/portrait text-left">
              <div key={celeb.id} className="w-full h-full">
              {portraitImage ? (
                <img src={portraitImage} alt={celeb.nickname} className="w-full h-full object-cover object-top animate-portrait-reveal" draggable="false" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                  <span className="text-6xl text-white/20 font-serif">{celeb.nickname[0]}</span>
                </div>
              )}
              </div>

              {/* 레벨 휘장 (Top-Left): 모서리 밀착 */}
              {!hideInfluence && (
                <div className="absolute top-4 left-4 z-30">
                  <InfluenceBadge
                    aura={aura}
                    size="lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsInfluenceOpen(true);
                    }}
                    className="shadow-2xl"
                  />
                </div>
              )}

            </div>

            {/* 오른쪽: 정보 */}
            <div className="flex-1 flex flex-col p-8 items-center text-center">
              {/* 감상 기록으로 돌아가기 */}
              <button
                onClick={() => setIsReviewMode(true)}
                className="self-start flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-primary mb-3 -mt-2 transition-colors"
              >
                <ArrowLeft size={14} />
                <span>감상 기록</span>
              </button>
              <div className="mb-4 shrink-0 flex flex-col items-center">
                {celeb.title && (
                  <p className="text-xs text-accent font-bold uppercase tracking-widest mb-1">{celeb.title}</p>
                )}
                <h2 className="text-4xl font-black font-serif text-text-primary leading-tight break-all">{celeb.nickname}</h2>
              </div>

              <div className="mb-4 shrink-0 w-full flex justify-center"><MetaInfo /></div>

              {/* 태그 뱃지 */}
              {celeb.tags && celeb.tags.length > 0 && (
                <div className="mb-4 shrink-0 w-full max-w-full overflow-hidden flex justify-center">
                  <TagBadges />
                </div>
              )}

              {!hideQuotes && celeb.quotes && (
                <blockquote className="text-sm text-text-tertiary font-serif bg-white/[0.03] rounded-sm py-4 mb-6 leading-relaxed shrink-0 w-full text-center px-4">
                  "<FormattedText text={celeb.quotes} />"
                </blockquote>
              )}

              {celeb.bio && (
                <p className="text-sm text-text-secondary mb-4 leading-relaxed shrink-0 w-full text-left px-1 break-all">
                  <User size={18} className="float-left mr-2 text-accent opacity-80 mt-0.5" strokeWidth={2.5} />
                  <FormattedText text={celeb.bio} />
                </p>
              )}

              {/* 인물 정보와 감상 철학 사이 유일한 수평선 */}
              {(celeb.bio || celeb.quotes) && celeb.consumption_philosophy && (
                <div className="w-full h-px bg-accent/20 my-2 shrink-0" />
              )}

              {celeb.consumption_philosophy && (
                <div className="flex-1 min-h-0 flex flex-col px-1 pt-4 w-full text-left relative group">
                  {/* 스크롤 영역 */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar text-left pr-2 relative">
                    <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line pb-8 break-all">
                      <Feather size={18} className="float-left mr-2 text-accent opacity-80 mt-0.5" strokeWidth={2.5} />
                      <FormattedText text={celeb.consumption_philosophy} />
                    </p>
                  </div>
                  
                  {/* 하단 페이드 아웃 효과 */}
                  <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-bg-main to-transparent pointer-events-none rounded-b-sm" />
                </div>
              )}

              <div className="mt-4 flex gap-3 shrink-0 w-full">
                <FollowButton className="flex-1 py-3 md:py-3.5 rounded-sm" />
                <ProfileLink className="flex-1 py-3 md:py-3.5 rounded-sm" />
              </div>
            </div>
               </>
            )}
          </div>
        </div>
      </div>

      {/* 모바일 레이아웃: Bottom Sheet */}
      <div className="md:hidden flex flex-col justify-end h-full relative">
        {/* 상단 닫기용 고정 안전 영역: 12vh 확보 */}
        <div 
          className="shrink-0 h-[12vh] w-full z-10" 
          onClick={onClose} 
        />
        
        <div className="bg-bg-main rounded-t-[2.5rem] flex flex-col animate-bottomsheet-content shadow-[0_-20px_40px_rgba(0,0,0,0.4)] overflow-hidden max-h-[88vh]">
          
          {/* 모바일: 감상 기록(기본) / 프로필 전환 */}
          {isReviewMode ? (
             <>
               {/* 모바일 핸들 버튼: 우측 화면 끝 중앙 → 프로필 진입 */}
               <HandleButton className="right-0 top-1/2 -translate-y-1/2 rounded-r-none rounded-l-lg w-4 h-8 hover:w-5 translate-x-0" />
               <div className="flex-1 flex flex-col h-full bg-bg-main overflow-hidden rounded-t-[2.5rem]">
                 <ReviewView />
               </div>
             </>
          ) : (
            <>

              {/* 스크롤 영역 */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {/* 초상화 (9:16 비율) */}
            <div
              className="relative w-full aspect-[9/16] bg-black select-none"
              {...navDragHandlers}
            >
              <div key={celeb.id} className="w-full h-full" style={navDragStyle}>
              {portraitImage ? (
                <img src={portraitImage} alt={celeb.nickname} className="w-full h-full object-cover object-top animate-portrait-reveal" draggable="false" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-900 font-serif">
                   <span className="text-6xl text-white/10">{celeb.nickname[0]}</span>
                </div>
              )}
              </div>

              {/* 최상단 오버레이 액션바: 핸들 중앙화 및 휘장/버튼 좌우 배치 */}
              <div className="absolute top-0 left-0 right-0 p-5 z-20">
                {/* 1. 중앙 드래그 핸들 (위치 고정) */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full" onClick={onClose} />

                <div className="flex items-center justify-between mt-2">
                  {/* 좌측: 감상 기록 복귀 + 영향력 휘장 */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsReviewMode(true)}
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white shadow-xl active:scale-95"
                    >
                      <ArrowLeft size={20} />
                    </button>
                    {!hideInfluence && (
                      <InfluenceBadge
                        aura={aura}
                        size="md"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsInfluenceOpen(true);
                        }}
                        className="shadow-2xl active:scale-90 transition-transform"
                      />
                    )}
                  </div>

                  {/* 우측: 닫기 */}
                  <div className="flex items-center gap-2">
                    <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white shadow-xl active:scale-95">
                      <X size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {/* 이미지 위 하단 오버레이 정보 - 시네마틱 센터 정렬 개편 */}
              <div className="absolute bottom-0 left-0 right-0 px-6 pb-0 pt-32 bg-gradient-to-t from-bg-main via-bg-main/90 to-transparent flex flex-col items-center">

                {/* 수식어: 이름 위에 고정된 관(Crown) 역할 */}
                {celeb.title && (
                  <div className="mb-2 px-3 py-0.5 rounded-full border border-accent/20 bg-accent/5">
                    <p className="text-[10px] text-accent font-bold uppercase tracking-[.25em] leading-none">
                      {celeb.title}
                    </p>
                  </div>
                )}

                {/* 이름: 정갈하고 위엄 있게 중앙 배치 */}
                <h2 className="text-3xl font-black font-serif text-white leading-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] tracking-tighter text-center break-all">
                  {celeb.nickname}
                </h2>

                {/* 하단: 메타 (Stats 제거) */}
                <div className="mt-4 w-full flex flex-col items-center">
                  <div className="flex justify-center opacity-70 scale-95 mb-1"><MetaInfo /></div>
                  {/* 태그 뱃지 */}
                  {celeb.tags && celeb.tags.length > 0 && (
                    <div className="mt-2 w-full max-w-full overflow-hidden flex justify-center">
                      <TagBadges />
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* 정보 영역 - 이제 Bio와 Quotes에 집중 */}
            <div className="px-5 pb-8 pt-0 flex flex-col gap-2">
              {/* 인용구 */}
              {!hideQuotes && celeb.quotes && (
                <blockquote className="text-xs text-text-tertiary font-serif bg-white/[0.03] rounded-sm py-4 mt-4 mb-2 leading-relaxed shrink-0 w-full text-center px-4">
                  "<FormattedText text={celeb.quotes} />"
                </blockquote>
              )}

              {/* 바이오 */}
              {celeb.bio && (
                <div className="flex flex-col pt-4 pb-2 px-2">
                  <p className="text-xs text-text-secondary leading-relaxed opacity-90 text-left break-all shrink-0">
                    <User size={14} className="float-left mr-2 text-accent opacity-80 mt-0.5" strokeWidth={2.5} />
                    <FormattedText text={celeb.bio} />
                  </p>
                </div>
              )}

              {/* 인물 정보와 감상 철학 사이 유일한 수평선 */}
              {(celeb.bio || celeb.quotes) && celeb.consumption_philosophy && (
                <div className="w-full h-px bg-accent/20 my-2 shrink-0" />
              )}

              {/* 감상 철학 */}
              {celeb.consumption_philosophy && (
                <div className="flex flex-col pt-4 px-2">
                  <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-line break-all text-left">
                    <Feather size={14} className="float-left mr-2 text-accent opacity-80 mt-0.5" strokeWidth={2.5} />
                    <FormattedText text={celeb.consumption_philosophy} />
                  </p>
                </div>
              )}

              {/* 하단 액션: 팔로우와 입장을 동시에 제공 */}
              <div className="flex gap-2.5 pt-2 shrink-0 mt-auto">
                <FollowButton className="flex-1 py-3 rounded-2xl" />
                <ProfileLink className="flex-1 py-3 rounded-2xl" />
              </div>
            </div>
          </div>
              </>
            )}

          {/* 영향력 상세 모달 연동 */}
          <CelebInfluenceModal 
            celebId={celeb.id} 
            isOpen={isInfluenceOpen} 
            onClose={() => setIsInfluenceOpen(false)} 
          />

          {/* 태그 상세 모달 연동 */}
          <CelebTagsModal 
            isOpen={isTagsModalOpen}
            onClose={() => setIsTagsModalOpen(false)}
            tags={celeb.tags || []}
            title={`${celeb.nickname}의 키워드`}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
