"use server";

import { createClient } from "@/lib/supabase/server";
import type { RecommendationWithDetails } from "@/types/recommendation";

interface GetReceivedRecommendationsResult {
  success: boolean;
  data: RecommendationWithDetails[];
  error?: string;
}

// 받은 추천 목록 조회 (pending 상태만)
export async function getReceivedRecommendations(): Promise<GetReceivedRecommendationsResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, data: [], error: "로그인이 필요합니다." };
  }

  const { data, error } = await supabase
    .from("content_recommendations")
    .select(
      `
      id,
      sender_id,
      receiver_id,
      user_content_id,
      message,
      status,
      responded_at,
      created_at,
      sender:profiles!content_recommendations_sender_id_fkey(
        id,
        nickname,
        avatar_url
      ),
      user_content:user_contents!content_recommendations_user_content_id_fkey(
        id,
        content_id,
        rating,
        review,
        content:contents(
          id,
          title,
          thumbnail_url,
          type,
          creator
        )
      )
    `
    )
    .eq("receiver_id", user.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getReceivedRecommendations] Error:", error);
    return { success: false, data: [], error: "추천 목록을 불러올 수 없습니다." };
  }

  type SenderData = { id: string; nickname: string; avatar_url: string | null };
  type ContentData = {
    id: string;
    title: string;
    thumbnail_url: string | null;
    type: string;
    creator: string | null;
  };
  type UserContentData = {
    id: string;
    content_id: string;
    rating: number | null;
    review: string | null;
    content: ContentData | ContentData[];
  };

  const result: RecommendationWithDetails[] = (data ?? []).map((item) => {
    const sender = (
      Array.isArray(item.sender) ? item.sender[0] : item.sender
    ) as SenderData;
    const userContent = (
      Array.isArray(item.user_content)
        ? item.user_content[0]
        : item.user_content
    ) as UserContentData;
    const content = (
      Array.isArray(userContent?.content)
        ? userContent.content[0]
        : userContent?.content
    ) as ContentData;

    return {
      id: item.id,
      sender_id: item.sender_id,
      receiver_id: item.receiver_id,
      user_content_id: item.user_content_id,
      message: item.message,
      status: item.status as "pending" | "accepted" | "declined",
      responded_at: item.responded_at,
      created_at: item.created_at,
      sender: {
        id: sender?.id ?? "",
        nickname: sender?.nickname ?? "User",
        avatar_url: sender?.avatar_url ?? null,
      },
      user_content: {
        id: userContent?.id ?? "",
        content_id: userContent?.content_id ?? "",
        rating: userContent?.rating ?? null,
        review: userContent?.review ?? null,
        content: {
          id: content?.id ?? "",
          title: content?.title ?? "",
          thumbnail_url: content?.thumbnail_url ?? null,
          type: content?.type ?? "",
          creator: content?.creator ?? null,
        },
      },
    };
  });

  return { success: true, data: result };
}
