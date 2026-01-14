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
  name: string;
  avatarSize: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  rankBadge: string;
  rankText: string;
  followBtn: string;
  followIconSize: number;
}> = {
  sm: {
    container: "w-[80px]",
    name: "text-[11px]",
    avatarSize: "lg",
    rankBadge: "w-5 h-5 -bottom-1 -right-1",
    rankText: "text-[10px]",
    followBtn: "w-5 h-5 -bottom-0.5 -left-0.5",
    followIconSize: 10,
  },
  md: {
    container: "w-[110px]",
    name: "text-sm",
    avatarSize: "2xl",
    rankBadge: "w-7 h-7 -bottom-1 -right-1",
    rankText: "text-sm",
    followBtn: "w-6 h-6 -bottom-0.5 -left-0.5",
    followIconSize: 12,
  },
  lg: {
    container: "w-[110px]",
    name: "text-base",
    avatarSize: "3xl",
    rankBadge: "w-8 h-8 -bottom-1 -right-1",
    rankText: "text-base",
    followBtn: "w-7 h-7 -bottom-0.5 -left-0.5",
    followIconSize: 14,
  },
};

const RANK_STYLES: Record<string, string> = {
  S: "bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 text-white border-white",
  A: "bg-gradient-to-br from-slate-300 via-slate-400 to-slate-500 text-white border-white",
  B: "bg-gradient-to-br from-orange-300 via-orange-400 to-orange-600 text-white border-white",
  C: "bg-gradient-to-br from-emerald-400 to-emerald-600 text-white border-white",
  D: "bg-gradient-to-br from-gray-400 to-gray-600 text-white border-white",
};

interface CelebProfileCardProps {
  celeb: CelebProfile;
  size?: CardSize;
  onFollowChange?: (celebId: string, isFollowing: boolean) => void;
}

export default function CelebProfileCard({ celeb, size = "md", onFollowChange }: CelebProfileCardProps) {
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

  return (
    <>
      <Link href={`/archive/user/${celeb.id}`} className="group block">
        <div className={`relative flex flex-col items-center gap-2.5 p-1 rounded-xl transition-all duration-300 hover:bg-fill-quaternary/30 ${styles.container}`}>
          {/* Avatar Area with Influence Badge & Follow Button */}
          <div className="relative">
            <Avatar
              url={celeb.avatar_url}
              name={celeb.nickname}
              size={styles.avatarSize}
              verified={celeb.is_verified}
              className={`ring-2 ${isFollowing ? "ring-accent" : "ring-transparent group-hover:ring-accent/20"}`}
            />

            {/* Follow Button - Overlapping Avatar (좌측 하단) */}
            <button
              onClick={handleFollowClick}
              disabled={isPending}
              className={`
                absolute flex items-center justify-center rounded-full border-2 border-bg-main shadow-sm
                cursor-pointer z-10
                ${styles.followBtn}
                ${isFollowing ? "bg-fill-secondary text-text-secondary" : "bg-accent text-white"}
                ${isPending ? "opacity-70 cursor-not-allowed" : "hover:scale-110"}
              `}
              title={isFollowing ? (isFriend ? "친구" : "팔로잉") : "팔로우"}
            >
              <ButtonIcon size={styles.followIconSize} />
            </button>

            {/* Influence Badge - Overlapping Avatar (우측 하단) */}
            {celeb.influence && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowInfluenceModal(true);
                }}
                className={`
                  absolute flex items-center justify-center rounded-full border-2 shadow-sm
                  font-serif font-bold cursor-pointer hover:scale-110 z-10
                  ${styles.rankBadge}
                  ${RANK_STYLES[celeb.influence.rank] || RANK_STYLES.C}
                `}
                title={`영향력 ${celeb.influence.total_score}점 - 상세 보기`}
              >
                <span className={`${styles.rankText} drop-shadow-sm`}>{celeb.influence.rank}</span>
              </button>
            )}
          </div>

          {/* Name */}
          <span className={`font-semibold truncate text-text-primary text-center w-full ${styles.name}`}>
            {celeb.nickname}
          </span>
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
