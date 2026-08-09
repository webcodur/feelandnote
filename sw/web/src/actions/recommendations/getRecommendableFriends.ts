"use server";

// egress-allow: blocks(본인 RLS) 의존 + 팔로우·차단 직후 즉시 반영 필요(추천 모달) — 캐시 부적합
import { createClient } from "@/lib/supabase/server";
import type { RecommendableUser } from "@/types/recommendation";
import { type ActionResult, failure, success } from "@/lib/errors";

// 추천 가능한 사용자 목록 조회 (팔로워/친구만, 차단 제외)
export async function getRecommendableFriends(): Promise<ActionResult<RecommendableUser[]>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return failure("UNAUTHORIZED");
  }

  const [blocksResult, followingResult, followerResult] = await Promise.all([
    supabase
      .from("blocks")
      .select("blocker_id, blocked_id")
      .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`),
    supabase
      .from("member_member_follows")
      .select("followed_member_id")
      .eq("follower_member_id", user.id),
    supabase
      .from("member_member_follows")
      .select("follower_member_id")
      .eq("followed_member_id", user.id),
  ]);

  const blockedIds = new Set<string>();
  blocksResult.data?.forEach((row) => {
    blockedIds.add(row.blocker_id === user.id ? row.blocked_id : row.blocker_id);
  });
  const followingIds = new Set(followingResult.data?.map((row) => row.followed_member_id) ?? []);
  const followerIds = new Set(followerResult.data?.map((row) => row.follower_member_id) ?? []);
  const candidateIds = [...new Set([...followingIds, ...followerIds])];

  const { data: profiles } = candidateIds.length
    ? await supabase
        .from("member_profiles")
        .select("id, nickname, avatar_url")
        .in("id", candidateIds)
    : { data: [] };

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

  (profiles as ProfileData[] | null)?.forEach((profile) => {
    if (profile) {
      userMap.set(profile.id, {
        nickname: profile.nickname ?? "User",
        avatar_url: profile.avatar_url,
      });
    }
  });

  // 결과 생성 (팔로워/친구만, 차단 사용자 제외)
  const result: RecommendableUser[] = [];

  userMap.forEach((profile, id) => {
    if (blockedIds.has(id)) return;

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

  return success(result);
}
