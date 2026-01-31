/*
  파일명: /components/features/user/explore/sections/FriendsSection.tsx
  기능: 친구 섹션
  책임: 친구 목록을 명판 카드 스타일로 보여준다.
*/ // ------------------------------

"use client";

import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import FriendCardNameplate from "../FriendCardNameplate";
import { EmptyState } from "../ExploreCards";

interface FriendInfo {
  id: string;
  nickname: string;
  avatar_url: string | null;
  content_count: number;
}

interface Props {
  friends: FriendInfo[];
}

export default function FriendsSection({ friends }: Props) {
  const router = useRouter();
  const handleSelectUser = (userId: string) => router.push(`/${userId}`);

  return (
    <div className="bg-surface rounded-2xl p-4 md:p-8 min-h-[400px] border border-accent-dim/10 shadow-inner shadow-black/20">
      {friends.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {friends.map((friend) => (
            <FriendCardNameplate
              key={friend.id}
              friend={friend}
              onClick={() => handleSelectUser(friend.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Users size={32} />}
          title="아직 친구가 없어요"
          description="서로 팔로우하면 친구가 됩니다"
        />
      )}
    </div>
  );
}
