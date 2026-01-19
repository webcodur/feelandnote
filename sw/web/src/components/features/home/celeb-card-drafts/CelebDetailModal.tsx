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
  const RankBadge = () => (
    <span className="px-3 py-1 text-xs font-bold tracking-wider bg-black/60 backdrop-blur-sm text-white border border-white/20">
      RANK {rank} · {RANK_LABELS[rank]}
    </span>
  );

  const FollowButton = ({ className = "" }: { className?: string }) => (
    <button
      onClick={handleFollowClick}
      disabled={isLoading}
      className={`
        flex items-center justify-center gap-2 text-sm font-medium
        ${isFollowing
          ? "bg-accent/20 text-accent border border-accent/30"
          : "bg-accent text-white hover:bg-accent-hover"
        }
        ${isLoading ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
    >
      {isFollowing ? <><Check size={16} />팔로잉</> : <><UserPlus size={16} />팔로우</>}
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
    <div className="grid grid-cols-2 gap-4 py-4 border-y border-border/50">
      <div className="text-center">
        <p className="text-2xl font-bold text-text-primary">{celeb.content_count || 0}</p>
        <p className="text-xs text-text-tertiary">ITEMS</p>
      </div>
      <div className="text-center">
        <p className="text-2xl font-bold text-text-primary">{celeb.follower_count || 0}</p>
        <p className="text-xs text-text-tertiary">FOLLOWERS</p>
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
            <div className="relative w-[45%] min-h-[480px] bg-black flex-shrink-0">
              {portraitImage ? (
                <img src={portraitImage} alt={celeb.nickname} className="w-full h-full object-cover object-top" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                  <span className="text-6xl text-white/20 font-serif">{celeb.nickname[0]}</span>
                </div>
              )}
              <div className="absolute top-4 left-4"><RankBadge /></div>
            </div>

            {/* 오른쪽: 정보 */}
            <div className="flex-1 p-6 flex flex-col">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-text-primary mb-1">{celeb.nickname}</h2>
                {celeb.profession && (
                  <p className="text-sm text-accent">{getCelebProfessionLabel(celeb.profession)}</p>
                )}
              </div>

              <div className="mb-4"><MetaInfo /></div>
              <div className="mb-5"><Stats /></div>

              {celeb.bio && (
                <p className="text-sm text-text-secondary mb-4 line-clamp-3">{celeb.bio}</p>
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
      <div className="md:hidden flex flex-col justify-end h-full">
        <div className="bg-bg-main rounded-t-2xl max-h-[85vh] flex flex-col animate-bottomsheet-content">
          {/* 헤더: 고정 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              {/* 작은 썸네일 */}
              <div className="w-10 h-10 rounded-full overflow-hidden bg-black flex-shrink-0">
                {portraitImage ? (
                  <img src={portraitImage} alt={celeb.nickname} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                    <span className="text-lg text-white/20 font-serif">{celeb.nickname[0]}</span>
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-base font-bold text-text-primary">{celeb.nickname}</h2>
                {celeb.profession && (
                  <p className="text-xs text-accent">{getCelebProfessionLabel(celeb.profession)}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <FollowButton className="px-3 py-1.5 text-xs" />
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* 스크롤 영역 */}
          <div className="flex-1 overflow-y-auto">
            {/* 초상화 (축소) */}
            <div className="relative w-full aspect-[4/3] bg-black">
              {portraitImage ? (
                <img src={portraitImage} alt={celeb.nickname} className="w-full h-full object-cover object-top" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                  <span className="text-5xl text-white/20 font-serif">{celeb.nickname[0]}</span>
                </div>
              )}
              <div className="absolute top-3 left-3"><RankBadge /></div>
              <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-bg-main to-transparent" />
            </div>

            {/* 정보 영역 */}
            <div className="px-4 pb-6 -mt-4 relative">
              <div className="mb-3"><MetaInfo /></div>
              <div className="mb-4"><Stats /></div>

              {celeb.bio && (
                <p className="text-sm text-text-secondary mb-4">{celeb.bio}</p>
              )}

              {celeb.quotes && (
                <blockquote className="text-sm text-text-tertiary italic border-l-2 border-accent/50 pl-3 mb-4">
                  "{celeb.quotes}"
                </blockquote>
              )}

              <ProfileLink className="w-full py-3 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
