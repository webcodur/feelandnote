
import { Suspense } from "react";
import { getCelebs, getProfessionCounts, getNationalityCounts, getContentTypeCounts } from "@/actions/home";
import { getFriends, getMyFollowing, getProfile, getFollowers, getSimilarUsers } from "@/actions/user";
import Explore from "@/components/features/archive/explore/Explore";

// #region Components
function ExploreSkeleton() {
  return (
    <div className="animate-pulse">
      {/* SectionHeader 스켈레톤 */}
      <div className="flex items-end justify-between mb-8 md:mb-12 px-2 md:px-4 border-b border-accent-dim/10 pb-4">
        <div className="flex flex-col gap-2">
          <div className="h-3 w-24 bg-bg-card rounded" />
          <div className="h-8 w-48 bg-bg-card rounded" />
          <div className="h-4 w-32 bg-bg-card rounded" />
        </div>
      </div>
      {/* 탭 스켈레톤 */}
      <div className="flex gap-2 mb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-20 bg-bg-card rounded-lg" />
        ))}
      </div>
      {/* 카드 그리드 스켈레톤 */}
      <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-7 gap-3">
        {Array.from({ length: 14 }).map((_, i) => (
          <div key={i} className="aspect-[2/3] bg-bg-card rounded-xl" />
        ))}
      </div>
    </div>
  );
}

async function ExploreContentServer() {
  const profile = await getProfile();

  const [
    celebsResult, 
    professionCounts, 
    nationalityCounts, 
    contentTypeCounts,
    friendsResult, 
    followingResult, 
    followersResult, 
    similarUsersResult
  ] = await Promise.all([
    getCelebs({ page: 1, limit: 24 }),
    getProfessionCounts(),
    getNationalityCounts(),
    getContentTypeCounts(),
    getFriends(),
    getMyFollowing(),
    profile ? getFollowers(profile.id) : Promise.resolve({ success: true, data: [] }),
    getSimilarUsers(10),
  ]);

  const friends = friendsResult.success ? friendsResult.data : [];
  const following = followingResult.success ? followingResult.data.map(f => ({ ...f, is_friend: false })) : []; // Adjust type if needed
  const followers = followersResult.success ? followersResult.data : [];

  return (
    <Explore
      friends={friends}
      following={following}
      followers={followers}
      similarUsers={similarUsersResult.users}
      similarUsersAlgorithm={similarUsersResult.algorithm}
      initialCelebs={celebsResult.celebs}
      initialTotal={celebsResult.total}
      initialTotalPages={celebsResult.totalPages}
      professionCounts={professionCounts}
      nationalityCounts={nationalityCounts}
      contentTypeCounts={contentTypeCounts}
    />
  );
}
// #endregion

export default function ExplorePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<ExploreSkeleton />}>
        <ExploreContentServer />
      </Suspense>
    </div>
  );
}
