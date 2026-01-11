/*
  파일명: /components/features/user/UserProfileHeader.tsx
  기능: 공개 프로필 헤더 컴포넌트
  책임: 타 유저 프로필 페이지 상단의 아바타, 정보, 팔로우 버튼 렌더링
*/ // ------------------------------
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { UserPlus, UserCheck, Users, BookOpen, CheckCircle, Sparkles, MessageSquare } from "lucide-react";
import Button from "@/components/ui/Button";
import { toggleFollow, type PublicUserProfile } from "@/actions/user";

interface UserProfileHeaderProps {
  profile: PublicUserProfile;
  isOwnProfile?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function UserProfileHeader({
  profile,
  isOwnProfile = false,
  onFollowChange,
}: UserProfileHeaderProps) {
  const [isFollowing, setIsFollowing] = useState(profile.is_following);
  const [isPending, startTransition] = useTransition();

  const isFriend = isFollowing && profile.is_follower;
  const isCeleb = profile.profile_type === 'CELEB';

  const handleFollowClick = () => {
    startTransition(async () => {
      const result = await toggleFollow(profile.id);
      if (result.success) {
        setIsFollowing(result.data.isFollowing);
        onFollowChange?.(result.data.isFollowing);
      }
    });
  };

  return (
    <div className="bg-surface rounded-xl p-6 mb-6">
      <div className="flex items-start gap-4">
        {/* 아바타 */}
        <div className="flex-shrink-0">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.nickname}
              className="w-20 h-20 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #ec4899)" }}
            >
              {profile.nickname.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* 프로필 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-text-primary truncate">
              {profile.nickname}
            </h1>
            {profile.is_verified && (
              <CheckCircle size={18} className="text-accent flex-shrink-0" />
            )}
            {isCeleb && (
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-500 text-xs rounded-full flex items-center gap-1">
                <Sparkles size={10} />
                셀럽
              </span>
            )}
            {isFriend && !isCeleb && (
              <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full">
                친구
              </span>
            )}
          </div>
          {isCeleb && profile.category && (
            <p className="text-xs text-text-tertiary mb-1">{profile.category}</p>
          )}

          {profile.bio && (
            <p className="text-sm text-text-secondary mb-3 line-clamp-2">
              {profile.bio}
            </p>
          )}

          {/* 통계 */}
          <div className="flex items-center gap-4 text-sm flex-wrap">
            <div className="flex items-center gap-1.5 text-text-secondary">
              <BookOpen size={14} />
              <span className="font-medium text-text-primary">{profile.stats.content_count}</span>
              <span>기록</span>
            </div>
            <div className="flex items-center gap-1.5 text-text-secondary">
              <Users size={14} />
              <span className="font-medium text-text-primary">{profile.stats.follower_count}</span>
              <span>팔로워</span>
            </div>
            <div className="flex items-center gap-1.5 text-text-secondary">
              <span className="font-medium text-text-primary">{profile.stats.following_count}</span>
              <span>팔로잉</span>
            </div>
            <div className="flex items-center gap-1.5 text-text-secondary">
              <span className="font-medium text-text-primary">{profile.stats.friend_count}</span>
              <span>친구</span>
            </div>
            <Link
              href="#guestbook"
              className="flex items-center gap-1.5 text-text-secondary hover:text-accent"
            >
              <MessageSquare size={14} />
              <span className="font-medium text-text-primary">{profile.stats.guestbook_count}</span>
              <span>방명록</span>
            </Link>
          </div>
        </div>

        {/* 팔로우 버튼 */}
        {!isOwnProfile && (
          <div className="flex-shrink-0">
            <Button
              variant={isFollowing ? "secondary" : "primary"}
              size="sm"
              onClick={handleFollowClick}
              disabled={isPending}
              className="min-w-[90px]"
            >
              {isFollowing ? (
                <>
                  <UserCheck size={14} />
                  {isFriend ? "친구" : "팔로잉"}
                </>
              ) : (
                <>
                  <UserPlus size={14} />
                  팔로우
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
