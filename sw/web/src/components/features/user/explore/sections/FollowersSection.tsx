/*
  파일명: /components/features/user/explore/sections/FollowersSection.tsx
  기능: 팔로워 섹션
  책임: 팔로워 목록을 보여준다.
*/ // ------------------------------

"use client";

import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { UserCard, EmptyState, MobileUserListItem } from "../ExploreCards";

interface FollowerInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  bio: string | null;
  is_following: boolean;
}

interface Props {
  followers: FollowerInfo[];
}

export default function FollowersSection({ followers }: Props) {
  const router = useRouter();
  const handleSelectUser = (userId: string) => router.push(`/${userId}`);

  return (
    <div className="bg-surface rounded-2xl p-4 md:p-8 min-h-[400px] border border-accent-dim/10 shadow-inner shadow-black/20">
      {followers.length > 0 ? (
        <>
          {/* PC Grid */}
          <div className="hidden sm:grid grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {followers.map((user) => (
              <UserCard
                key={user.id}
                user={{ ...user, content_count: 0 }}
                onClick={() => handleSelectUser(user.id)}
              />
            ))}
          </div>
          {/* Mobile Compact List */}
          <div className="sm:hidden flex flex-col gap-2">
            {followers.map((user) => (
              <MobileUserListItem
                key={user.id}
                user={{ ...user, content_count: 0 }}
                onClick={() => handleSelectUser(user.id)}
                subtext={user.bio || "새로운 팔로워"}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<UserPlus size={32} />}
          title="팔로워가 없어요"
          description="활동하면 팔로워가 생길 거예요"
        />
      )}
    </div>
  );
}
