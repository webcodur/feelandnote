/*
  파일명: /app/(main)/archive/explore/page.tsx
  기능: 탐색 페이지
  책임: 다른 유저의 기록관을 탐색하는 UI를 제공한다.
*/ // ------------------------------

import { Compass } from "lucide-react";
import { SectionHeader } from "@/components/ui";
import { getSimilarUsers, getFriends, getMyFollowing } from "@/actions/user";
import { getCelebProfiles } from "@/actions/celebs";
import Explore from "@/components/features/explore/Explore";

export default async function Page() {
  // 병렬로 데이터 조회
  const [friendsResult, followingResult, celebResult, similarUsersResult] = await Promise.all([
    getFriends(),
    getMyFollowing(),
    getCelebProfiles({ limit: 20 }),
    getSimilarUsers(10),
  ]);

  const friends = friendsResult.success ? friendsResult.data : [];
  const following = followingResult.success ? followingResult.data : [];

  const celebs = celebResult.items.map((celeb) => ({
    id: celeb.id,
    nickname: celeb.nickname || "셀럽",
    avatar_url: celeb.avatar_url,
    content_count: 0,
    category: celeb.category,
    bio: celeb.bio,
    is_verified: celeb.is_verified,
  }));

  return (
    <>
      <SectionHeader
        title="탐색"
        description="친구와 셀럽의 기록을 탐색하세요"
        icon={<Compass size={20} />}
        className="mb-4"
      />

      <Explore
        friends={friends}
        following={following}
        celebs={celebs}
        similarUsers={similarUsersResult.users}
        similarUsersAlgorithm={similarUsersResult.algorithm}
      />
    </>
  );
}
