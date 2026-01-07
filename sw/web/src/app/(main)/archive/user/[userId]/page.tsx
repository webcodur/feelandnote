/*
  파일명: /app/(main)/archive/user/[userId]/page.tsx
  기능: 사용자 기록관 페이지
  책임: 사용자의 콘텐츠 기록을 표시한다.
*/ // ------------------------------

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile, getProfile, getStats } from "@/actions/user";
import { getGuestbookEntries } from "@/actions/guestbook";
import UserProfile from "@/components/features/user/UserProfile";
import Archive from "@/components/features/archive/Archive";

interface PageProps {
  params: Promise<{ userId: string }>;
}

export default async function UserProfilePage({ params }: PageProps) {
  const { userId } = await params;
  const supabase = await createClient();

  // 현재 로그인한 사용자 확인
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const isOwnProfile = currentUser?.id === userId;

  // 본인 프로필인 경우 Archive 렌더링
  if (isOwnProfile) {
    const [myProfile, stats, followerResult, followingResult] = await Promise.all([
      getProfile(),
      getStats(),
      supabase.from('follows').select('follower_id', { count: 'exact' }).eq('following_id', userId),
      supabase.from('follows').select('following_id', { count: 'exact' }).eq('follower_id', userId),
    ]);

    // 친구 수 직접 계산 (맞팔)
    let friendCount = 0;
    if (followingResult.data && followingResult.data.length > 0) {
      const myFollowingIds = followingResult.data.map(f => f.following_id);
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId)
        .in('follower_id', myFollowingIds);
      friendCount = count || 0;
    }

    const profile = myProfile || {
      id: userId,
      email: currentUser?.email || null,
      nickname: "User",
      avatar_url: null,
      gemini_api_key: null,
    };

    return (
      <Archive
        myProfile={profile}
        stats={{
          contentCount: stats.totalContents,
          followerCount: followerResult.count || 0,
          followingCount: followingResult.count || 0,
          friendCount,
        }}
      />
    );
  }

  // 타인 프로필 조회
  const [result, myProfile, guestbookResult] = await Promise.all([
    getUserProfile(userId),
    getProfile(),
    getGuestbookEntries({ profileId: userId, limit: 20 }),
  ]);

  if (!result.success || !result.data) {
    notFound();
  }

  return (
    <UserProfile
      profile={result.data}
      currentUser={myProfile}
      guestbook={{
        entries: guestbookResult.entries,
        total: guestbookResult.total,
      }}
    />
  );
}
