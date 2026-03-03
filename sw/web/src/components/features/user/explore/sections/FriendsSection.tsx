/*
  파일명: /components/features/user/explore/sections/FriendsSection.tsx
  기능: 친구 섹션
  책임: 친구 목록을 명판 카드 스타일로 보여준다.
*/ // ------------------------------

"use client";

import { useRouter } from "@/i18n/navigation";
import { Users } from "lucide-react";
import PersonNameplate from "../PersonNameplate";
import { EmptyState } from "../ExploreCards";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("explore.ui");
  const handleSelectUser = (userId: string) => router.push(`/${userId}`);

  return (
    <div className="bg-surface rounded-2xl p-4 md:p-8 min-h-[400px] border border-accent-dim/10 shadow-inner shadow-black/20">
      {friends.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {friends.map((friend) => (
            <PersonNameplate
              key={friend.id}
              person={friend}
              onClick={() => handleSelectUser(friend.id)}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Users size={32} />}
          title={t("empty.noFriends")}
          description={t("empty.noFriendsDesc")}
        />
      )}
    </div>
  );
}
