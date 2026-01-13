"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Globe, CheckCircle, UserPlus, UserCheck, Users } from "lucide-react";
import { Avatar } from "@/components/ui";
import { getCelebProfessionLabel } from "@/constants/celebProfessions";
import { toggleFollow } from "@/actions/user";
import type { CelebProfile } from "@/types/home";

type CardSize = "sm" | "md" | "lg";

const SIZE_STYLES: Record<CardSize, {
  container: string;
  name: string;
  profession: string;
  avatarSize: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  button: string;
  iconSize: number;
  badgeIconSize: number;
}> = {
  sm: { container: "w-14", name: "text-xs", profession: "text-[10px]", avatarSize: "lg", button: "text-[9px] px-1.5 py-0.5", iconSize: 8, badgeIconSize: 10 },
  md: { container: "w-[100px]", name: "text-sm", profession: "text-xs", avatarSize: "2xl", button: "text-[10px] px-2 py-1", iconSize: 10, badgeIconSize: 12 },
  lg: { container: "w-[100px]", name: "text-base", profession: "text-sm", avatarSize: "3xl", button: "text-xs px-2.5 py-1", iconSize: 12, badgeIconSize: 14 },
};

interface CelebProfileCardProps {
  celeb: CelebProfile;
  size?: CardSize;
  onFollowChange?: (celebId: string, isFollowing: boolean) => void;
}

export default function CelebProfileCard({ celeb, size = "md", onFollowChange }: CelebProfileCardProps) {
  const [isFollowing, setIsFollowing] = useState(celeb.is_following);
  const [isPending, startTransition] = useTransition();

  const professionLabel = getCelebProfessionLabel(celeb.profession);
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

  // 팔로우 버튼 텍스트와 스타일
  const getFollowButton = () => {
    if (isFollowing) {
      return {
        text: isFriend ? "친구" : "팔로잉",
        icon: isFriend ? Users : UserCheck,
        className: "bg-white/10 text-text-primary hover:bg-white/15",
      };
    }
    return {
      text: "팔로우",
      icon: UserPlus,
      className: "bg-accent text-white hover:bg-accent-hover",
    };
  };

  const buttonConfig = getFollowButton();
  const ButtonIcon = buttonConfig.icon;

  // 뱃지 아이콘: 플랫폼 관리 = Globe, 개인 계정 = CheckCircle
  const BadgeIcon = celeb.is_platform_managed ? Globe : CheckCircle;
  const badgeTitle = celeb.is_platform_managed
    ? "공개 정보를 기반으로 생성된 프로필"
    : "인증된 계정";
  const badgeColor = celeb.is_platform_managed
    ? "text-text-tertiary hover:text-accent"
    : "text-accent";

  return (
    <Link href={`/archive/user/${celeb.id}`} className="group">
      <div className={`flex flex-col items-center gap-1 text-center ${styles.container}`}>
        <Avatar
          url={celeb.avatar_url}
          name={celeb.nickname}
          size={styles.avatarSize}
          verified={celeb.is_verified}
          className="group-hover:ring-accent/50"
        />
        <div className="w-full">
          {/* 이름 + 뱃지 아이콘 */}
          <span className={`inline-flex items-center justify-center gap-0.5 font-medium ${styles.name}`}>
            <span className="truncate">{celeb.nickname}</span>
            <span title={badgeTitle} className={`shrink-0 cursor-help ${badgeColor}`}>
              <BadgeIcon size={styles.badgeIconSize} />
            </span>
          </span>
          {professionLabel && (
            <span className={`text-text-tertiary truncate block ${styles.profession}`}>
              {professionLabel}
            </span>
          )}
          {/* 팔로우 버튼 */}
          <button
            onClick={handleFollowClick}
            disabled={isPending}
            className={`
              inline-flex items-center justify-center gap-0.5 rounded-full mt-1.5 font-medium
              ${styles.button}
              ${buttonConfig.className}
              ${isPending ? "opacity-50 cursor-not-allowed" : ""}
            `}
          >
            <ButtonIcon size={styles.iconSize} />
            <span>{buttonConfig.text}</span>
          </button>
        </div>
      </div>
    </Link>
  );
}
