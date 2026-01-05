import { Compass } from "lucide-react";
import { SectionHeader } from "@/components/ui";
import { getSimilarUsers } from "@/actions/user";
import { getCelebProfiles } from "@/actions/celebs";
import ExploreView from "@/components/features/explore/ExploreView";

export default async function Page() {
  // 친구 목록 조회 (상호 팔로우)
  // TODO: 소셜 기능 구현 후 실제 데이터로 교체
  const friends: Array<{ id: string; nickname: string; avatar_url: string | null; content_count: number }> = [];

  // 셀럽 목록 조회
  const celebResult = await getCelebProfiles({ limit: 20 });
  const celebs = celebResult.items.map((celeb) => ({
    id: celeb.id,
    nickname: celeb.nickname || "셀럽",
    avatar_url: celeb.avatar_url,
    content_count: 0,
    category: celeb.category,
    bio: celeb.bio,
    is_verified: celeb.is_verified,
  }));

  // 취향 유사 유저 조회
  const similarUsersResult = await getSimilarUsers(10);

  return (
    <>
      <SectionHeader
        title="탐색"
        description="친구와 셀럽의 기록을 탐색하세요"
        icon={<Compass size={20} />}
        className="mb-4"
      />

      <ExploreView
        friends={friends}
        celebs={celebs}
        similarUsers={similarUsersResult.users}
        similarUsersAlgorithm={similarUsersResult.algorithm}
      />
    </>
  );
}
