/*
  파일명: /app/(main)/explore/people/page.tsx
  기능: 사람 탐색 통합 페이지
  책임: 친구, 팔로잉, 팔로워, 취향 유사 유저를 한 페이지에 섹션별로 보여준다.
*/ // ------------------------------

import { Users, UserCheck, UserPlus, Star } from "lucide-react";
import FriendsSection from "@/components/features/user/explore/sections/FriendsSection";
import FollowingSection from "@/components/features/user/explore/sections/FollowingSection";
import FollowersSection from "@/components/features/user/explore/sections/FollowersSection";
import SimilarSection from "@/components/features/user/explore/sections/SimilarSection";
import { getFriends, getMyFollowing, getFollowers, getSimilarUsers, getProfile } from "@/actions/user";

export const metadata = { title: "사람 | 탐색" };

function SectionHeader({ icon: Icon, title, count }: { icon: React.ComponentType<{ className?: string }>; title: string; count: number }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-4 h-4 text-accent" />
      <h2 className="text-sm font-semibold text-white/90">{title}</h2>
      <span className="text-xs text-white/40">{count}</span>
    </div>
  );
}

export default async function Page() {
  const profile = await getProfile();

  const [friendsResult, followingResult, followersResult, similarResult] = await Promise.all([
    getFriends(),
    getMyFollowing(),
    profile ? getFollowers(profile.id) : Promise.resolve({ success: true, data: [] }),
    getSimilarUsers(10),
  ]);

  const friends = friendsResult.success ? friendsResult.data : [];
  const following = followingResult.success
    ? followingResult.data.map(f => ({ ...f, is_friend: false })).filter(f => !f.is_friend)
    : [];
  const followers = followersResult.success
    ? followersResult.data.filter(f => !f.is_following)
    : [];
  const { users: similarUsers, algorithm } = similarResult;

  return (
    <div className="space-y-8">
      <section>
        <SectionHeader icon={Users} title="친구" count={friends.length} />
        <FriendsSection friends={friends} />
      </section>

      <section>
        <SectionHeader icon={UserCheck} title="팔로잉" count={following.length} />
        <FollowingSection following={following} />
      </section>

      <section>
        <SectionHeader icon={UserPlus} title="팔로워" count={followers.length} />
        <FollowersSection followers={followers} />
      </section>

      <section>
        <SectionHeader icon={Star} title="취향 유사" count={similarUsers.length} />
        <SimilarSection similarUsers={similarUsers} algorithm={algorithm} />
      </section>
    </div>
  );
}
