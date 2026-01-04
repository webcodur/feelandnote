"use server";

import { createClient } from "@/lib/supabase/server";

// region 타입
export interface SimilarUser {
  id: string;
  nickname: string;
  avatar_url: string | null;
  content_count: number;
  overlap_count: number;
  similarity: number;
}

interface GetSimilarUsersResult {
  users: SimilarUser[];
  algorithm: "content_overlap" | "recent_activity";
}
// endregion

// region 알고리즘 설명
/**
 * 취향 유사 유저 추천 알고리즘
 *
 * [콘텐츠 겹침 기반 유사도 (Cosine Similarity 변형)]
 *
 * 공식: similarity = overlap_count / sqrt(my_count × other_count)
 *
 * - overlap_count: 나와 상대방이 공통으로 기록한 콘텐츠 수
 * - my_count: 내가 기록한 총 콘텐츠 수
 * - other_count: 상대방이 기록한 총 콘텐츠 수
 *
 * 이 방식의 장점:
 * 1. 단순히 겹침 수만 보면 콘텐츠가 많은 유저가 항상 상위에 오는 문제 해결
 * 2. 분모에 sqrt를 사용해 양쪽 콘텐츠 수를 정규화
 * 3. 결과값은 0~1 사이 (1에 가까울수록 취향 유사)
 *
 * 폴백 전략:
 * - 콘텐츠 겹침이 없는 경우 → 최근 활동 유저 반환
 */
// endregion

export async function getSimilarUsers(limit = 10): Promise<GetSimilarUsersResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { users: [], algorithm: "content_overlap" };

  // 1차: 콘텐츠 겹침 기반 유사 유저 조회
  const { data: similarUsers } = await supabase.rpc("get_similar_users", {
    target_user_id: user.id,
    result_limit: limit,
  });

  if (similarUsers && similarUsers.length > 0) {
    return {
      users: similarUsers.map((u: {
        user_id: string;
        nickname: string;
        avatar_url: string | null;
        content_count: number;
        overlap_count: number;
        similarity: number;
      }) => ({
        id: u.user_id,
        nickname: u.nickname || "User",
        avatar_url: u.avatar_url,
        content_count: u.content_count,
        overlap_count: u.overlap_count,
        similarity: u.similarity,
      })),
      algorithm: "content_overlap",
    };
  }

  // 폴백: 최근 활동 유저 (내가 팔로우하지 않고, 차단하지 않은 유저)
  const { data: recentUsers } = await supabase
    .from("user_contents")
    .select(`
      user_id,
      profiles!inner(id, nickname, avatar_url)
    `)
    .neq("user_id", user.id)
    .not("user_id", "in", `(SELECT following_id FROM follows WHERE follower_id = '${user.id}')`)
    .not("user_id", "in", `(SELECT blocked_id FROM blocks WHERE blocker_id = '${user.id}')`)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (!recentUsers) return { users: [], algorithm: "recent_activity" };

  // 유저별로 그룹화하여 콘텐츠 수 계산
  type ProfileData = { id: string; nickname: string | null; avatar_url: string | null };
  const userMap = new Map<string, { nickname: string; avatar_url: string | null; count: number }>();

  for (const record of recentUsers) {
    const profileData = record.profiles as ProfileData | ProfileData[];
    const profile = Array.isArray(profileData) ? profileData[0] : profileData;
    if (!profile) continue;

    const existing = userMap.get(record.user_id);
    if (existing) {
      existing.count++;
    } else {
      userMap.set(record.user_id, {
        nickname: profile.nickname || "User",
        avatar_url: profile.avatar_url,
        count: 1,
      });
    }
  }

  const fallbackUsers = Array.from(userMap.entries())
    .slice(0, limit)
    .map(([id, data]) => ({
      id,
      nickname: data.nickname,
      avatar_url: data.avatar_url,
      content_count: data.count,
      overlap_count: 0,
      similarity: 0,
    }));

  return { users: fallbackUsers, algorithm: "recent_activity" };
}
