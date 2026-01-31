/*
  파일명: /components/shared/UserMiniProfilePopover.tsx
  기능: 유저 미니 프로필 팝오버
  책임: 아바타 클릭 시 유저 정보와 팔로우 버튼을 표시한다.
*/ // ------------------------------
"use client";

import { useState, useCallback, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
import { Popover, TitleBadge } from "@/components/ui";
import Button from "@/components/ui/Button";
import { getMiniProfile, toggleFollow, type MiniProfile } from "@/actions/user";
import { BLUR_DATA_URL } from "@/constants/image";

interface UserMiniProfilePopoverProps {
  userId: string;
  trigger: ReactNode;
}

export default function UserMiniProfilePopover({ userId, trigger }: UserMiniProfilePopoverProps) {
  const [profile, setProfile] = useState<MiniProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const loadProfile = useCallback(async () => {
    if (profile) return;
    setIsLoading(true);
    const result = await getMiniProfile(userId);
    if (result.success) {
      setProfile(result.data);
    }
    setIsLoading(false);
  }, [userId, profile]);

  const handleFollow = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!profile || profile.is_self) return;

    setIsFollowLoading(true);
    const result = await toggleFollow(userId);
    if (result.success) {
      setProfile((prev) => prev ? { ...prev, is_following: result.data.isFollowing } : null);
    }
    setIsFollowLoading(false);
  };

  return (
    <Popover
      trigger={trigger}
      position="bottom"
      align="start"
      contentClassName="w-[240px] p-0 overflow-hidden"
      onOpenChange={(open) => { if (open) loadProfile(); }}
    >
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-accent" />
        </div>
      ) : profile ? (
        <div>
          {/* 프로필 정보 */}
          <div className="p-4 flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-full overflow-hidden bg-bg-secondary flex-shrink-0">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.nickname}
                  fill
                  unoptimized
                  className="object-cover"
                  placeholder="blur"
                  blurDataURL={BLUR_DATA_URL}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">⭐</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{profile.nickname}</p>
              {profile.selected_title && (
                <TitleBadge title={{ name: profile.selected_title.name, grade: profile.selected_title.grade }} size="sm" />
              )}
            </div>
          </div>

          {/* 통계 */}
          <div className="px-4 py-3 border-t border-white/5 flex justify-around text-center">
            <div>
              <p className="text-sm font-semibold">{profile.content_count}</p>
              <p className="text-[10px] text-text-secondary">기록</p>
            </div>
            <div>
              <p className="text-sm font-semibold">{profile.follower_count}</p>
              <p className="text-[10px] text-text-secondary">팔로워</p>
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="px-4 py-3 border-t border-white/5 flex gap-2">
            {!profile.is_self && (
              <Button
                variant={profile.is_following ? "secondary" : "primary"}
                size="sm"
                onClick={handleFollow}
                disabled={isFollowLoading}
                className="flex-1 gap-1.5"
              >
                {isFollowLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : profile.is_following ? (
                  <><UserCheck size={14} /><span>팔로잉</span></>
                ) : (
                  <><UserPlus size={14} /><span>팔로우</span></>
                )}
              </Button>
            )}
            <Link
              href={`/${profile.id}/records`}
              onClick={(e) => e.stopPropagation()}
              className="flex-1"
            >
              <Button variant="secondary" size="sm" className="w-full">
                프로필 보기
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-text-secondary text-sm">
          프로필을 불러올 수 없습니다
        </div>
      )}
    </Popover>
  );
}
