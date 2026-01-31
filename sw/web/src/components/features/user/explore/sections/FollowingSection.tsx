/*
  파일명: /components/features/user/explore/sections/FollowingSection.tsx
  기능: 팔로잉 섹션
  책임: 팔로잉 목록을 보여준다.
*/ // ------------------------------

"use client";

import { useRouter } from "next/navigation";
import { UserCheck } from "lucide-react";
import { UserCard, EmptyState, MobileUserListItem } from "../ExploreCards";

interface FollowingInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  content_count: number;
  is_friend: boolean;
}

interface Props {
  following: FollowingInfo[];
}

export default function FollowingSection({ following }: Props) {
  const router = useRouter();
  const handleSelectUser = (userId: string) => router.push(`/${userId}`);

  return (
    <div className="bg-surface rounded-2xl p-4 md:p-8 min-h-[400px] border border-accent-dim/10 shadow-inner shadow-black/20">
      {following.length > 0 ? (
        <>
          {/* PC Grid */}
          <div className="hidden sm:grid grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {following.map((user) => (
              <UserCard key={user.id} user={user} onClick={() => handleSelectUser(user.id)} />
            ))}
          </div>
          {/* Mobile Compact List */}
          <div className="sm:hidden flex flex-col gap-2">
            {following.map((user) => (
              <MobileUserListItem
                key={user.id}
                user={user}
                onClick={() => handleSelectUser(user.id)}
                subtext={`${user.content_count || 0} 기록`}
              />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          icon={<UserCheck size={32} />}
          title="팔로잉이 없어요"
          description="관심 있는 사람을 팔로우해보세요"
        />
      )}
    </div>
  );
}
