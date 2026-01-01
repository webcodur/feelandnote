import { createClient } from "@/lib/supabase/server";
import { getProfile, getStats } from "@/actions/user";
import { getCelebProfiles } from "@/actions/celebs";
import ArchiveHubView from "@/components/features/archive/ArchiveHubView";

export default async function Page() {
  const supabase = await createClient();

  // 미들웨어에서 이미 인증 확인됨
  const { data: { user } } = await supabase.auth.getUser();

  // 내 프로필 및 통계 조회
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

  // 프로필이 없으면 기본값 사용
  const profile = myProfile || {
    id: user?.id || "",
    email: user?.email || null,
    nickname: "User",
    avatar_url: null,
    gemini_api_key: null,
  };

  // 친구 목록 조회 (상호 팔로우)
  // TODO: 소셜 기능 구현 후 실제 데이터로 교체
  const friends: Array<{ id: string; nickname: string; avatar_url: string | null; content_count: number }> = [];

  // 셀럽 목록 조회
  const celebResult = await getCelebProfiles({ limit: 20 });
  const celebs = celebResult.items.map(celeb => ({
    id: celeb.id,
    nickname: celeb.nickname || "셀럽",
    avatar_url: celeb.avatar_url,
    content_count: 0,
    category: celeb.category,
    bio: celeb.bio,
    is_verified: celeb.is_verified,
  }));

  return (
    <ArchiveHubView
      myProfile={profile}
      stats={{
        contentCount: stats.totalContents,
        followerCount,
        followingCount,
      }}
      friends={friends}
      celebs={celebs}
    />
  );
}
