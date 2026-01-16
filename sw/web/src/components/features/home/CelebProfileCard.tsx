"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { UserPlus, UserCheck, Users } from "lucide-react";
import { Avatar } from "@/components/ui";
import { toggleFollow } from "@/actions/user";
import CelebInfluenceModal from "./CelebInfluenceModal";
import type { CelebProfile } from "@/types/home";

type CardSize = "sm" | "md" | "lg";

const SIZE_STYLES: Record<CardSize, {
  container: string;
  avatarSize: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  rankSize: string;
  followIconSize: number;
}> = {
  sm: {
    container: "w-full max-w-[80px]",
    avatarSize: "lg",
    rankSize: "w-5 h-5 text-[10px]",
    followIconSize: 10,
  },
  md: {
    container: "w-full min-w-[140px] max-w-[180px]",
    avatarSize: "2xl",
    rankSize: "w-7 h-7 text-sm",
    followIconSize: 12,
  },
  lg: {
    container: "w-full min-w-[180px] max-w-[240px]",
    avatarSize: "3xl",
    rankSize: "w-9 h-9 text-base",
    followIconSize: 16,
  },
};

// 등급별 스타일 - 각 등급마다 고유한 개성
const RANK_STYLES: Record<string, {
  container: string;
  text: string;
  decoration?: "shimmer" | "none";
}> = {
  S: {
    container: "bg-gradient-to-br from-[#d4af37] via-[#f5e6a3] to-[#d4af37] border border-[#f1d279]/60 shadow-[inset_0_1px_3px_rgba(255,255,255,0.3)]",
    text: "text-[#2a1f00] font-black italic",
    decoration: "shimmer",
  },
  A: {
    container: "bg-gradient-to-br from-[#d0d0d0] via-[#f0f0f0] to-[#b0b0b0] border border-[#c0c0c0]/60 shadow-[inset_0_1px_3px_rgba(255,255,255,0.4)]",
    text: "text-[#2a2a2a] font-black",
    decoration: "none",
  },
  B: {
    container: "bg-gradient-to-br from-[#cd7f32] via-[#daa06d] to-[#8b5a2b] border border-[#d4935a]/60 shadow-[inset_0_1px_2px_rgba(255,200,150,0.3)]",
    text: "text-[#1a1000] font-bold",
    decoration: "none",
  },
  C: {
    container: "bg-gradient-to-b from-[#3a3a42] to-[#25252a] border border-white/10",
    text: "text-text-secondary font-medium",
    decoration: "none",
  },
  D: {
    container: "bg-gradient-to-b from-[#25252a] to-[#1a1a1f] border border-white/5",
    text: "text-text-tertiary font-normal",
    decoration: "none",
  },
};

interface CelebProfileCardProps {
  celeb: CelebProfile;
  size?: CardSize;
  onFollowChange?: (celebId: string, isFollowing: boolean) => void;
  priority?: boolean;
  contentUnit?: string;  // 콘텐츠 단위 (권, 편, 개 등)
}

export default function CelebProfileCard({ celeb, size = "md", onFollowChange, priority = false, contentUnit = "개" }: CelebProfileCardProps) {
  const [isFollowing, setIsFollowing] = useState(celeb.is_following);
  const [isPending, startTransition] = useTransition();
  const [showInfluenceModal, setShowInfluenceModal] = useState(false);

  const styles = SIZE_STYLES[size];
  const isFriend = isFollowing && celeb.is_follower;

  const handleFollowClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    startTransition(async () => {
      const result = await toggleFollow(celeb.id);
      if (result.success) {
        setIsFollowing(result.data.isFollowing);
        onFollowChange?.(celeb.id, result.data.isFollowing);
      }
    });
  };

  // 팔로우 버튼 아이콘 선택
  const getFollowIcon = () => {
    if (isFollowing) return isFriend ? Users : UserCheck;
    return UserPlus;
  };

  const ButtonIcon = getFollowIcon();

  const rankStyle = celeb.influence ? RANK_STYLES[celeb.influence.rank] || RANK_STYLES.C : null;

  return (
    <>
      <Link href={`/${celeb.id}`} className="group block">
        <div className={`relative flex flex-col items-center gap-4 p-4 rounded-none border border-accent-dim/30 hover:border-accent/60 ${styles.container}`}>
          {/* 대리석 석판 배경 */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1f] via-[#12121a] to-[#0a0a0f]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08)_0%,transparent_60%)]" />
          <div className="absolute inset-0 opacity-[0.03] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj48ZmlsdGVyIGlkPSJub2lzZSI+PGZlVHVyYnVsZW5jZSB0eXBlPSJmcmFjdGFsTm9pc2UiIGJhc2VGcmVxdWVuY3k9IjAuOCIgbnVtT2N0YXZlcz0iNCIgc3RpdGNoVGlsZXM9InN0aXRjaCIvPjwvZmlsdGVyPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbHRlcj0idXJsKCNub2lzZSkiIG9wYWNpdHk9IjEiLz48L3N2Zz4=')]" />
          <div className="absolute inset-0 shadow-[inset_0_2px_20px_rgba(0,0,0,0.8),inset_0_-2px_20px_rgba(0,0,0,0.5)]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent" />
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />

          {/* 아바타 영역 */}
          <div className="relative group/avatar">
            <div className="absolute -inset-3 border border-accent/10 group-hover/avatar:border-accent/40" />
            <div className="absolute -inset-1.5 border border-double border-accent-dim/30 group-hover/avatar:border-accent/60" />

            <div className="relative bg-[#050505] shadow-[0_10px_30px_rgba(0,0,0,0.8)] border border-accent-dim/20 group-hover/avatar:border-accent/60 overflow-hidden">
              <Avatar
                url={celeb.avatar_url}
                name={celeb.nickname}
                size={styles.avatarSize}
                verified={celeb.is_verified}
                className="ring-0 rounded-none group-hover:brightness-110 group-hover:contrast-105"
                priority={priority}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
              <div className="absolute -bottom-1 left-0 w-full h-1 bg-accent/40 group-hover:bg-accent/70" />
            </div>
          </div>

          {/* 이름 & 콘텐츠 수 */}
          <div className="flex flex-col items-center gap-2 w-full text-center relative z-10">
            <h3 className="font-serif font-bold text-sm md:text-base text-text-primary group-hover:text-accent leading-tight truncate w-full">
              {celeb.nickname}
            </h3>
            <span className="text-accent/70 text-xs group-hover:text-accent">
              {celeb.content_count} {contentUnit}
            </span>
          </div>

          {/* 하단 액션 영역: 등급 뱃지 + 팔로우 버튼 */}
          <div className="flex items-center justify-center gap-2 w-full relative z-10 pt-2 border-t border-white/5">
            {/* 등급 뱃지 */}
            {celeb.influence && rankStyle && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowInfluenceModal(true);
                }}
                className={`
                  relative flex items-center justify-center rounded-sm overflow-hidden cursor-pointer
                  ${styles.rankSize} ${rankStyle.container}
                  hover:brightness-110
                `}
                title={`영향력 등급: ${celeb.influence.rank}`}
              >
                <span className={`font-cinzel relative z-10 ${rankStyle.text}`}>
                  {celeb.influence.rank}
                </span>
                {rankStyle.decoration === "shimmer" && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 animate-shimmer" />
                )}
              </button>
            )}

            {/* 팔로우 버튼 - 석판 스타일 */}
            <button
              onClick={handleFollowClick}
              disabled={isPending}
              className={`
                relative flex items-center justify-center rounded-sm overflow-hidden
                ${styles.rankSize}
                ${isFriend
                  ? "bg-gradient-to-br from-[#d4af37] via-[#f5e6a3] to-[#d4af37] border border-[#f1d279]/60 shadow-[inset_0_1px_3px_rgba(255,255,255,0.3)]"
                  : isFollowing
                    ? "bg-gradient-to-br from-[#3a5a3a] via-[#4a7a4a] to-[#2a4a2a] border border-[#5a8a5a]/40 shadow-[inset_0_1px_2px_rgba(255,255,255,0.1)]"
                    : "bg-gradient-to-b from-[#2a2a2f] to-[#1a1a1f] border border-white/10 hover:border-accent/30"
                }
                ${isPending ? "opacity-50 cursor-not-allowed" : "hover:brightness-110"}
              `}
              title={isFollowing ? (isFriend ? "맞팔로우" : "팔로잉 중") : "팔로우"}
            >
              <ButtonIcon
                size={styles.followIconSize}
                className={`stroke-[2.5] relative z-10 ${
                  isFriend
                    ? "text-[#2a1f00]"
                    : isFollowing
                      ? "text-[#a0d0a0]"
                      : "text-text-tertiary group-hover:text-accent"
                }`}
              />
            </button>
          </div>
        </div>
      </Link>

      <CelebInfluenceModal
        celebId={celeb.id}
        isOpen={showInfluenceModal}
        onClose={() => setShowInfluenceModal(false)}
      />
    </>
  );
}
