/*
  파일명: /app/(main)/archive/explore/page.tsx
  기능: 탐색 페이지
  책임: 사람들을 살펴볼 수 있는 UI를 제공한다.
*/

import { Compass } from "lucide-react";
import { SectionHeader } from "@/components/ui";
import { getSimilarUsers, getFriends, getMyFollowing } from "@/actions/user";
import { getProfile, getFollowers } from "@/actions/user";
import { getCelebProfiles } from "@/actions/celebs";
import Explore from "@/components/features/archive/explore/Explore";

export default async function Page() {
  const profile = await getProfile();

  const [friendsResult, followingResult, followersResult, celebResult, similarUsersResult] = await Promise.all([
    getFriends(),
    getMyFollowing(),
    profile ? getFollowers(profile.id) : Promise.resolve({ success: true, data: [] }),
    getCelebProfiles({ limit: 20 }),
    getSimilarUsers(10),
  ]);

  const friends = friendsResult.success ? friendsResult.data : [];
  const following = followingResult.success ? followingResult.data : [];
  const followers = followersResult.success ? followersResult.data : [];

  const celebs = celebResult.items.map((celeb) => ({
    id: celeb.id,
    nickname: celeb.nickname || "셀럽",
    avatar_url: celeb.avatar_url,
    content_count: 0,
    profession: celeb.profession,
    bio: celeb.bio,
    is_verified: celeb.is_verified,
  }));

  return (
    <>
      <SectionHeader
        title="탐색"
        description="사람들을 살펴보세요"
        icon={<Compass size={20} />}
        className="mb-4"
      />

      <Explore
        friends={friends}
        following={following}
        followers={followers}
        celebs={celebs}
        similarUsers={similarUsersResult.users}
        similarUsersAlgorithm={similarUsersResult.algorithm}
      />
    </>
  );
}
