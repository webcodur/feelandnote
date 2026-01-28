"use server";

import { createClient } from "@/lib/supabase/server";
import type { RecommendableUser } from "@/types/recommendation";

interface GetRecommendableFriendsResult {
  success: boolean;
  data: RecommendableUser[];
  error?: string;
}

// 추천 가능한 사용자 목록 조회 (팔로워/친구만, 차단 제외)
export async function getRecommendableFriends(): Promise<GetRecommendableFriendsResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, data: [], error: "로그인이 필요합니다." };
  }

  // 내가 차단한 사용자 ID 조회
  const { data: blockedUsers } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", user.id);

  const blockedIds = blockedUsers?.map((b) => b.blocked_id) ?? [];

  // 내가 팔로우하는 사용자
  const { data: followingData } = await supabase
    .from("follows")
    .select(
      `
      following_id,
      profile:profiles!follows_following_id_fkey(
        id,
        nickname,
        avatar_url
      )
    `
    )
    .eq("follower_id", user.id);

  // 나를 팔로우하는 사용자
  const { data: followerData } = await supabase
    .from("follows")
    .select(
      `
      follower_id,
      profile:profiles!follows_follower_id_fkey(
        id,
        nickname,
        avatar_url
      )
    `
    )
    .eq("following_id", user.id);

  const followingIds = new Set(followingData?.map((f) => f.following_id) ?? []);
  const followerIds = new Set(followerData?.map((f) => f.follower_id) ?? []);

  // 사용자 맵 구성
  const userMap = new Map<
    string,
    { nickname: string; avatar_url: string | null }
  >();

  type ProfileData = {
    id: string;
    nickname: string;
    avatar_url: string | null;
  };

  followingData?.forEach((f) => {
    const profile = (
      Array.isArray(f.profile) ? f.profile[0] : f.profile
    ) as ProfileData | null;
    if (profile) {
      userMap.set(f.following_id, {
        nickname: profile.nickname ?? "User",
        avatar_url: profile.avatar_url,
      });
    }
  });

  followerData?.forEach((f) => {
    const profile = (
      Array.isArray(f.profile) ? f.profile[0] : f.profile
    ) as ProfileData | null;
    if (profile && !userMap.has(f.follower_id)) {
      userMap.set(f.follower_id, {
        nickname: profile.nickname ?? "User",
        avatar_url: profile.avatar_url,
      });
    }
  });

  // 결과 생성 (팔로워/친구만, 차단 사용자 제외)
  const result: RecommendableUser[] = [];

  userMap.forEach((profile, id) => {
    if (blockedIds.includes(id)) return;

    const isFollowing = followingIds.has(id);
    const isFollower = followerIds.has(id);

    // 나를 팔로우하는 사람만 추천 가능 (팔로워 또는 친구)
    if (!isFollower) return;

    const relation: "follower" | "friend" = isFollowing && isFollower ? "friend" : "follower";

    result.push({
      id,
      nickname: profile.nickname,
      avatar_url: profile.avatar_url,
      relation,
    });
  });

  // 친구 > 팔로워 순 정렬
  const relationOrder = { friend: 0, follower: 1 };
  result.sort((a, b) => relationOrder[a.relation] - relationOrder[b.relation]);

  return { success: true, data: result };
}
