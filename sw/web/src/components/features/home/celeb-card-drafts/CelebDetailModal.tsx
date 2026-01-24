/*
  2안용 상세 모달
  - PC: 좌우 분할 레이아웃 (초상화 | 정보)
  - 모바일: Bottom Sheet 스타일
*/
"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Check, UserPlus, ExternalLink, Calendar, MapPin, Briefcase, User, Feather } from "lucide-react";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { toggleFollow } from "@/actions/user";
import type { CelebProfile } from "@/types/home";
import CelebInfluenceModal from "../CelebInfluenceModal";
import InfluenceBadge from "@/components/ui/InfluenceBadge";
import { FormattedText } from "@/components/ui";

// #region Constants
const RANK_GRADIENTS = {
  S: "from-amber-300 via-yellow-500 to-amber-600",
  A: "from-slate-200 via-gray-400 to-slate-500",
  B: "from-amber-600 via-orange-700 to-amber-800",
  C: "from-slate-400 via-slate-500 to-slate-600",
  D: "from-slate-500 via-slate-600 to-slate-700",
} as const;
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

  const rank = celeb.influence?.rank || "D";
  const borderGradient = RANK_GRADIENTS[rank];
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
          <div className={`absolute -inset-[1px] bg-gradient-to-br ${borderGradient} opacity-90 rounded-sm`} />

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="absolute -top-3 -right-3 z-20 w-8 h-8 bg-bg-main rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-card"
          >
            <X size={16} />
          </button>

          {/* 내부: 좌우 분할 - 고정 높이 복구, Bio는 다 보여주고 철학은 스크롤 */}
          <div className="relative bg-bg-main flex h-[720px]">
            {/* 왼쪽: 초상화 */}
            <div className="relative w-[45%] h-full bg-black flex-shrink-0 group/portrait text-left">
              {portraitImage ? (
                <img src={portraitImage} alt={celeb.nickname} className="w-full h-full object-cover object-top animate-portrait-reveal" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                  <span className="text-6xl text-white/20 font-serif">{celeb.nickname[0]}</span>
                </div>
              )}
              
              {/* 랭크 휘장 (Top-Left): 모서리 밀착 */}
              <div className="absolute top-4 left-4 z-30">
                <InfluenceBadge 
                  rank={rank}
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
                    rank={rank}
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
