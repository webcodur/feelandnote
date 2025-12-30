"use client";

import { BookOpen, Users, Heart, UserPlus } from "lucide-react";
import Button from "@/components/ui/Button";

interface ProfileHeaderProps {
  id: string;
  nickname: string;
  avatar_url: string | null;
  bio?: string | null;
  content_count?: number;
  follower_count?: number;
  following_count?: number;
  is_self?: boolean;
  is_following?: boolean;
  onFollow?: () => void;
  onProfileClick?: () => void;
}

export default function ProfileHeader({
  id,
  nickname,
  avatar_url,
  bio,
  content_count = 0,
  follower_count = 0,
  following_count = 0,
  is_self = false,
  is_following = false,
  onFollow,
  onProfileClick,
}: ProfileHeaderProps) {
  const avatarContent = avatar_url ? (
    <img
      src={avatar_url}
      alt={nickname}
      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover ring-4 ring-accent/20"
    />
  ) : (
    <div
      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-white ring-4 ring-accent/20"
      style={{
        background: is_self
          ? "linear-gradient(135deg, #8b5cf6, #6366f1)"
          : "linear-gradient(135deg, #8b5cf6, #ec4899)",
      }}
    >
      {nickname.charAt(0).toUpperCase()}
    </div>
  );

  return (
    <div className="bg-surface rounded-2xl p-6 mb-6">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* 큰 아바타 */}
        {is_self && onProfileClick ? (
          <button
            onClick={onProfileClick}
            className="relative shrink-0 group cursor-pointer"
          >
            {avatarContent}
            <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition-colors" />
          </button>
        ) : (
          <div className="relative shrink-0">
            {avatarContent}
          </div>
        )}

        {/* 프로필 정보 */}
        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-3">
            {is_self && onProfileClick ? (
              <button
                onClick={onProfileClick}
                className="text-xl sm:text-2xl font-bold text-text-primary hover:text-accent transition-colors"
              >
                {nickname}
              </button>
            ) : (
              <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
                {nickname}
              </h1>
            )}
            {!is_self && (
              <Button
                unstyled
                onClick={onFollow}
                className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg transition-colors mx-auto sm:mx-0 ${
                  is_following
                    ? "bg-surface-hover text-text-secondary hover:bg-border"
                    : "bg-accent text-white hover:bg-accent-hover"
                }`}
              >
                {is_following ? (
                  <>
                    <Heart size={14} className="fill-current" />
                    팔로잉
                  </>
                ) : (
                  <>
                    <UserPlus size={14} />
                    팔로우
                  </>
                )}
              </Button>
            )}
          </div>

          {/* 소개글 */}
          {bio && (
            <p className="text-sm text-text-secondary mb-4 max-w-md">
              {bio}
            </p>
          )}

          {/* 통계 */}
          <div className="flex items-center justify-center sm:justify-start gap-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-lg font-bold text-text-primary">
                <BookOpen size={16} className="text-accent" />
                {content_count}
              </div>
              <span className="text-xs text-text-tertiary">기록</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-lg font-bold text-text-primary">
                <Users size={16} className="text-green-500" />
                {follower_count}
              </div>
              <span className="text-xs text-text-tertiary">팔로워</span>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1.5 text-lg font-bold text-text-primary">
                <Heart size={16} className="text-pink-500" />
                {following_count}
              </div>
              <span className="text-xs text-text-tertiary">팔로잉</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
