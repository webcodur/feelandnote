/*
  2안용 상세 모달
  - PC: 좌우 분할 레이아웃 (초상화 | 정보)
  - 모바일: Bottom Sheet 스타일
*/
"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, Check, UserPlus, ExternalLink, Calendar, MapPin } from "lucide-react";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { toggleFollow } from "@/actions/user";
import type { CelebProfile } from "@/types/home";
import CelebInfluenceModal from "../CelebInfluenceModal";
import InfluenceBadge from "@/components/ui/InfluenceBadge";

// #region Constants
const RANK_GRADIENTS = {
  S: "from-amber-300 via-yellow-500 to-amber-600",
  A: "from-slate-200 via-gray-400 to-slate-500",
  B: "from-amber-600 via-orange-700 to-amber-800",
  C: "from-slate-400 via-slate-500 to-slate-600",
  D: "from-slate-500 via-slate-600 to-slate-700",
} as const;

const RANK_LABELS = {
  S: "Diamond",
  A: "Gold",
  B: "Silver",
  C: "Bronze",
  D: "Iron",
} as const;
// #endregion

interface CelebDetailModalProps {
  celeb: CelebProfile;
  isOpen: boolean;
  onClose: () => void;
}

export default function CelebDetailModal({ celeb, isOpen, onClose }: CelebDetailModalProps) {
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
        flex items-center justify-center gap-2 font-black transition-all active:scale-95
        ${isFollowing
          ? "bg-black/40 backdrop-blur-md text-accent border border-accent/40 shadow-inner"
          : "bg-accent text-black border border-accent shadow-[0_0_15px_rgba(212,175,55,0.4)] hover:shadow-[0_0_20px_rgba(212,175,55,0.6)]"
        }
        ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
    >
      {isFollowing ? (
        <><Check size={14} strokeWidth={3} /> <span className="tracking-tight">FOLLOWING</span></>
      ) : (
        <><UserPlus size={14} strokeWidth={3} /> <span className="tracking-tight">FOLLOW</span></>
      )}
    </button>
  );

  const ProfileLink = ({ className = "" }: { className?: string }) => (
    <Link
      href={`/${celeb.id}`}
      className={`flex items-center justify-center gap-2 bg-white/5 text-text-primary hover:bg-white/10 text-sm font-medium ${className}`}
    >
      <ExternalLink size={16} />
      프로필 보기
    </Link>
  );

  const MetaInfo = () => (
    <div className="flex flex-wrap gap-3 text-xs text-text-tertiary">
      {celeb.nationality && (
        <span className="flex items-center gap-1">
          <MapPin size={12} />
          {celeb.nationality}
        </span>
      )}
      {celeb.birth_date && (
        <span className="flex items-center gap-1">
          <Calendar size={12} />
          {celeb.birth_date}
          {celeb.death_date && ` ~ ${celeb.death_date}`}
        </span>
      )}
    </div>
  );

  const Stats = () => (
    <div className="w-full grid grid-cols-2 gap-4 py-2 border-y border-white/10 bg-white/[0.02] my-3">
      <div className="flex flex-col items-center">
        <span className="text-white font-black text-lg leading-none">{celeb.content_count || 0}</span>
        <span className="text-[7px] font-bold text-white/30 tracking-widest mt-1 uppercase">Items</span>
      </div>
      <div className="relative flex flex-col items-center">
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-px h-3 bg-white/10" />
        <span className="text-white font-black text-lg leading-none">{celeb.follower_count || 0}</span>
        <span className="text-[7px] font-bold text-white/30 tracking-widest mt-1 uppercase">Followers</span>
      </div>
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
        <div className="relative w-full max-w-[720px] animate-modal-content">
          {/* 그라데이션 테두리 */}
          <div className={`absolute -inset-[4px] bg-gradient-to-br ${borderGradient} opacity-90`} />

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="absolute -top-3 -right-3 z-20 w-8 h-8 bg-bg-main rounded-full border border-border flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-card"
          >
            <X size={16} />
          </button>

          {/* 내부: 좌우 분할 */}
          <div className="relative bg-bg-main flex">
            {/* 왼쪽: 초상화 */}
            <div className="relative w-[45%] min-h-[480px] bg-black flex-shrink-0 group/portrait">
              {portraitImage ? (
                <img src={portraitImage} alt={celeb.nickname} className="w-full h-full object-cover object-top animate-portrait-reveal" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                  <span className="text-6xl text-white/20 font-serif">{celeb.nickname[0]}</span>
                </div>
              )}
              
              {/* 랭크 휘장 (Top-Left): PC 레이아웃용 프리미엄 휘장 */}
              <div className="absolute top-6 left-6 z-30">
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

            {/* 오른쪽: 정보 */}
            <div className="flex-1 p-6 flex flex-col">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-text-primary mb-1">{celeb.nickname}</h2>
                {celeb.profession && (
                  <p className="text-sm text-accent">{getCelebProfessionLabel(celeb.profession)}</p>
                )}
              </div>

              <div className="mb-2"><MetaInfo /></div>
              <div className="px-1"><Stats /></div>

              {celeb.bio && (
                <p className="text-sm text-text-secondary mb-4 line-clamp-3 leading-relaxed">{celeb.bio}</p>
              )}

              {celeb.quotes && (
                <blockquote className="text-sm text-text-tertiary italic border-l-2 border-accent/50 pl-3 mb-4">
                  "{celeb.quotes}"
                </blockquote>
              )}

              <div className="mt-auto flex gap-3">
                <FollowButton className="flex-1 py-3" />
                <ProfileLink className="flex-1 py-3" />
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
                
                {/* 직군명: 이름 위에 고정된 관(Crown) 역할 */}
                <div className="mb-2 px-3 py-0.5 rounded-full border border-accent/20 bg-accent/5">
                   <p className="text-[10px] text-accent font-bold uppercase tracking-[.25em] leading-none">
                    {getCelebProfessionLabel(celeb.profession)}
                  </p>
                </div>

                {/* 이름: 정갈하고 위엄 있게 중앙 배치 */}
                <h2 className="text-3xl font-black font-serif text-white leading-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] tracking-tighter text-center break-keep">
                  {celeb.nickname}
                </h2>

                {/* 하단: 메타 & 통계 (수평적 균형) - 간격 최소화 */}
                <div className="mt-3 w-full flex flex-col items-center">
                  <div className="flex justify-center opacity-70 scale-95 mb-1"><MetaInfo /></div>
                  <Stats />
                </div>
              </div>
            </div>

            {/* 정보 영역 - 이제 Bio와 Quotes에 집중 */}
            <div className="px-5 pb-8 space-y-4 pt-0">
              {/* 인용구 */}
              {celeb.quotes && (
                <div className="relative px-8 py-2">
                  <span className="text-accent/20 text-4xl font-serif absolute left-0 top-1/2 -translate-y-1/2 leading-none">"</span>
                  <blockquote className="text-center text-sm text-accent/90 italic font-medium leading-relaxed">
                    {celeb.quotes}
                  </blockquote>
                  <span className="text-accent/20 text-4xl font-serif absolute right-0 top-1/2 -translate-y-1/2 leading-none">"</span>
                </div>
              )}

              {/* 바이오 */}
              {celeb.bio && (
                <p className="text-xs text-text-secondary leading-relaxed opacity-90 text-center break-keep border-t border-accent/10 pt-4">
                  {celeb.bio}
                </p>
              )}

              {/* 하단 액션: 팔로우와 입장을 동시에 제공 */}
              <div className="flex gap-2.5 pt-2">
                <FollowButton className="flex-1 py-4 rounded-2xl text-[11px] tracking-widest" />
                
                <Link
                  href={`/${celeb.id}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-text-primary py-4 rounded-2xl text-[11px] font-black tracking-widest uppercase transition-all active:scale-95"
                >
                  <ExternalLink size={14} className="text-accent" />
                  ENTERING
                </Link>
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
