import { createClient } from "@/lib/supabase/server";
import { getProfile, getStats } from "@/actions/user";
import ArchiveHubView from "@/components/features/archive/ArchiveHubView";

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [myProfile, stats] = await Promise.all([
    getProfile(),
    getStats(),
  ]);

  // 소셜 통계 조회 (팔로워/팔로잉)
  let followerCount = 0;
  let followingCount = 0;
  if (user) {
    const [followerResult, followingResult] = await Promise.all([
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', user.id),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', user.id),
    ]);
    followerCount = followerResult.count || 0;
    followingCount = followingResult.count || 0;
  }

  const profile = myProfile || {
    id: user?.id || "",
    email: user?.email || null,
    nickname: "User",
    avatar_url: null,
    gemini_api_key: null,
  };

  return (
    <ArchiveHubView
      myProfile={profile}
      stats={{
        contentCount: stats.totalContents,
        followerCount,
        followingCount,
      }}
    />
  );
}
