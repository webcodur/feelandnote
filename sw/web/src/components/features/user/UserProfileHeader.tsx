"use client";

import { useState, useTransition } from "react";
import { UserPlus, UserCheck, Users, BookOpen } from "lucide-react";
import Button from "@/components/ui/Button";
import type { PublicUserProfile } from "@/actions/user";

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

  const handleFollowClick = () => {
    startTransition(async () => {
      // TODO: 팔로우/언팔로우 API 호출
      const newState = !isFollowing;
      setIsFollowing(newState);
      onFollowChange?.(newState);
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
            {isFriend && (
              <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded-full">
                친구
              </span>
            )}
          </div>

          {profile.bio && (
            <p className="text-sm text-text-secondary mb-3 line-clamp-2">
              {profile.bio}
            </p>
          )}

          {/* 통계 */}
          <div className="flex items-center gap-4 text-sm">
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
