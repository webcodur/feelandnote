import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile, getProfile, getStats } from "@/actions/user";
import UserProfileView from "@/components/features/user/UserProfileView";
import ArchiveHubView from "@/components/features/archive/ArchiveHubView";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function UserProfilePage({ params }: PageProps) {
  const { userId } = await params;
  const supabase = await createClient();

  // 현재 로그인한 사용자 확인
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const isOwnProfile = currentUser?.id === userId;

  // 본인 프로필인 경우 ArchiveHubView 렌더링
  if (isOwnProfile) {
    const [myProfile, stats, followerResult, followingResult] = await Promise.all([
      getProfile(),
      getStats(),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('id', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);

    const profile = myProfile || {
      id: userId,
      email: currentUser?.email || null,
      nickname: "User",
      avatar_url: null,
      gemini_api_key: null,
    };

    return (
      <ArchiveHubView
        myProfile={profile}
        stats={{
          contentCount: stats.totalContents,
          followerCount: followerResult.count || 0,
          followingCount: followingResult.count || 0,
        }}
      />
    );
  }

  // 타인 프로필 조회
  const result = await getUserProfile(userId);

  if (!result.success || !result.data) {
    notFound();
  }

  return <UserProfileView profile={result.data} />;
}
