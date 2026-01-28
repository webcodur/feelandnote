/*
  2안용 상세 모달
  - PC: 좌우 분할 레이아웃 (초상화 | 정보)
  - 모바일: Bottom Sheet 스타일
*/
"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Check, UserPlus, ExternalLink, Calendar, MapPin, Briefcase, User, Feather } from "lucide-react";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { toggleFollow } from "@/actions/user";
import type { CelebProfile } from "@/types/home";
import { getAuraByPercentile, getAuraByScore, type Aura } from "@/constants/materials";
import CelebInfluenceModal from "../CelebInfluenceModal";
import InfluenceBadge from "@/components/ui/InfluenceBadge";
import { FormattedText } from "@/components/ui";
import { getCelebReviews } from "@/actions/home/getCelebReviews";
import type { CelebReview } from "@/types/home";
import ReviewCard from "@/components/features/home/ReviewCard";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";

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

interface CelebDetailModalProps {
  celeb: CelebProfile;
  isOpen: boolean;
  onClose: () => void;
  hideBirthDate?: boolean;
}

export default function CelebDetailModal({ celeb, isOpen, onClose, hideBirthDate = false }: CelebDetailModalProps) {
  const [isFollowing, setIsFollowing] = useState(celeb.is_following);
  const [isLoading, setIsLoading] = useState(false);
  const [isInfluenceOpen, setIsInfluenceOpen] = useState(false);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [reviews, setReviews] = useState<CelebReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // 리뷰 모드 진입 시 데이터 로딩
  useEffect(() => {
    if (isReviewMode && reviews.length === 0) {
      setLoadingReviews(true);
      getCelebReviews(celeb.id).then((data) => {
        setReviews(data);
        setLoadingReviews(false);
      });
    }
  }, [isReviewMode, celeb.id, reviews.length]);

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
      <span className="ml-1 font-extrabold">
        {celeb.follower_count || 0}
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
      <span>기록</span>
      <span className="ml-0.5 font-extrabold opacity-90">{celeb.content_count || 0}</span>
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

  const ReviewView = () => (
    <div className="relative w-full h-full flex flex-col bg-bg-main animate-fade-in">
      {/* 헤더: 뒤로가기 및 타이틀 */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 shrink-0">
        <button 
          onClick={() => setIsReviewMode(false)}
          className="text-text-secondary hover:text-accent transition-colors"
          aria-label="돌아가기"
        >
          <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center">
             <span className="text-lg">←</span>
          </div>
        </button>
        <h2 className="text-lg font-serif font-bold text-accent">감상 기록</h2>
        <div className="w-8" />
      </div>

      {/* 리스트 영역 */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        {loadingReviews ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-text-tertiary animate-pulse">기록을 불러오는 중...</p>
          </div>
        ) : reviews.length > 0 ? (
          <div className="flex flex-col gap-6 max-w-2xl mx-auto">
            {reviews.map((review) => (
              <ReviewCard
                key={review.id}
                userId={celeb.id}
                userName={celeb.nickname}
                userAvatar={celeb.avatar_url}
                isOfficial={celeb.is_verified}
                userTitle={null}
                userSubtitle={celeb.title || undefined}
                contentType={review.content.type}
                contentId={review.content.id}
                contentTitle={review.content.title}
                contentCreator={review.content.creator}
                contentThumbnail={review.content.thumbnail_url}
                review={review.review}
                timeAgo={formatDistanceToNow(new Date(review.updated_at), { addSuffix: true, locale: ko })}
                isSpoiler={review.is_spoiler}
                sourceUrl={review.source_url}
              />
            ))}
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

  const HandleButton = ({ className = "" }: { className?: string }) => (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setIsReviewMode(true);
      }}
      className={`
        absolute flex items-center justify-center
        w-8 h-16 bg-bg-card border border-accent/20 rounded-l-md shadow-lg
        text-accent/50 hover:text-accent hover:bg-surface hover:w-10 hover:border-accent/50
        transition-all duration-300 z-50 cursor-pointer group
        ${className}
      `}
      title="감상 목록 보기"
    >
      <div className="w-1 h-8 bg-current rounded-full opacity-30 group-hover:opacity-100 transition-opacity" />
    </button>
  );
  // #endregion

  const modalContent = (
    <div
      className="fixed inset-0 z-[600] bg-black/70 backdrop-blur-sm animate-fade-in"
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
             
            {/* PC 리뷰 모드 뷰 */}
            {isReviewMode ? (
              <ReviewView />
            ) : (
               <>
                 {/* PC 핸들 버튼: 우측 끝 중앙 */}
                 <HandleButton className="right-0 top-1/2 -translate-y-1/2 rounded-r-none rounded-l-xl translate-x-1 hover:translate-x-0" />
                 
                 {/* 기존 콘텐츠 */}
                 <div className="relative w-[45%] h-full bg-black flex-shrink-0 group/portrait text-left">
              {portraitImage ? (
                <img src={portraitImage} alt={celeb.nickname} className="w-full h-full object-cover object-top animate-portrait-reveal" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                  <span className="text-6xl text-white/20 font-serif">{celeb.nickname[0]}</span>
                </div>
              )}
              
              {/* 레벨 휘장 (Top-Left): 모서리 밀착 */}
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
            </div>

            {/* 오른쪽: 정보 - 높이 제한 해제 */}
            <div className="flex-1 flex flex-col p-8 items-center text-center">
              <div className="mb-4 shrink-0 flex flex-col items-center">
                {celeb.title && (
                  <p className="text-xs text-accent font-bold uppercase tracking-widest mb-1">{celeb.title}</p>
                )}
                <h2 className="text-4xl font-black font-serif text-text-primary leading-tight break-all">{celeb.nickname}</h2>
              </div>

              <div className="mb-4 shrink-0 w-full flex justify-center"><MetaInfo /></div>

              {celeb.quotes && (
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
          
          {/* 모바일 리뷰 모드 뷰 */}
          {isReviewMode ? (
             <div className="flex-1 flex flex-col h-full bg-bg-main overflow-hidden rounded-t-[2.5rem]">
               <ReviewView />
             </div>
          ) : (
            <>
              {/* 모바일 핸들 버튼: 우측 화면 끝 중앙 (모달 내부에서 절대 위치) */}
              <HandleButton className="right-0 top-1/2 -translate-y-1/2 rounded-r-none rounded-l-xl w-6 h-12 hover:w-8 translate-x-0" />

              {/* 스크롤 영역 */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
            {/* 초상화 (9:16 비율) */}
            <div className="relative w-full aspect-[9/16] bg-black">
              {portraitImage ? (
                <img src={portraitImage} alt={celeb.nickname} className="w-full h-full object-cover object-top animate-portrait-reveal" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-900 font-serif">
                   <span className="text-6xl text-white/10">{celeb.nickname[0]}</span>
                </div>
              )}

              {/* 최상단 오버레이 액션바: 핸들 중앙화 및 휘장/버튼 좌우 배치 */}
              <div className="absolute top-0 left-0 right-0 p-5 z-20">
                {/* 1. 중앙 드래그 핸들 (위치 고정) */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full" onClick={onClose} />
                
                <div className="flex items-center justify-between mt-2">
                  {/* 2. 좌상단 영향력 휘장 (클릭 시 상세 모달) */}
                  <InfluenceBadge
                    aura={aura}
                    size="md"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsInfluenceOpen(true);
                    }}
                    className="shadow-2xl active:scale-90 transition-transform"
                  />

                  {/* 3. 우측 액션 버튼들 (닫기만 유지) */}
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
                </div>
              </div>
            </div>

            {/* 정보 영역 - 이제 Bio와 Quotes에 집중 */}
            <div className="px-5 pb-8 pt-0 flex flex-col gap-2">
              {/* 인용구 */}
              {celeb.quotes && (
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
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
