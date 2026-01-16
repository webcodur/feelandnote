
import { Suspense } from "react";
import { getCelebs, getProfessionCounts, getNationalityCounts, getContentTypeCounts } from "@/actions/home";
import { getFriends, getMyFollowing, getProfile, getFollowers, getSimilarUsers } from "@/actions/user";
import Explore from "@/components/features/archive/explore/Explore";

// #region Components
function ExploreSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 animate-pulse">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="aspect-[3/4] bg-bg-card rounded-xl" />
      ))}
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
    getCelebs({ page: 1, limit: 100 }),
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
