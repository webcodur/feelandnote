"use server";

import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/actions/notifications";
import type { SendRecommendationParams } from "@/types/recommendation";
import { type ActionResult, failure, success } from "@/lib/errors";

interface SendRecommendationData {
  recommendationId: string;
}

export async function sendRecommendation(
  params: SendRecommendationParams
): Promise<ActionResult<SendRecommendationData>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return failure("UNAUTHORIZED");
  }

  // 1. 차단 관계 확인
  const { data: blockData } = await supabase
    .from("blocks")
    .select("id")
    .or(
      `and(blocker_id.eq.${user.id},blocked_id.eq.${params.receiverId}),and(blocker_id.eq.${params.receiverId},blocked_id.eq.${user.id})`
    )
    .limit(1);

  if (blockData && blockData.length > 0) {
    return failure("FORBIDDEN", "추천할 수 없는 사용자입니다.");
  }

  // 2. user_content 조회 (본인 소유인지 확인)
  const { data: userContent, error: contentError } = await supabase
    .from("user_contents")
    .select(
      `
      id,
      user_id,
      status,
      content:contents(id, title, type, thumbnail_url)
    `
    )
    .eq("id", params.userContentId)
    .single();

  if (contentError || !userContent) {
    return failure("NOT_FOUND", "콘텐츠를 찾을 수 없습니다.");
  }

  if (userContent.user_id !== user.id) {
    return failure("FORBIDDEN", "본인의 콘텐츠만 추천할 수 있습니다.");
  }

  if (userContent.status !== "FINISHED") {
    return failure("FORBIDDEN", "완료한 콘텐츠만 추천할 수 있습니다.");
  }

  // 3. 중복 추천 확인
  const { data: existingRecommendation } = await supabase
    .from("content_recommendations")
    .select("id")
    .eq("sender_id", user.id)
    .eq("receiver_id", params.receiverId)
    .eq("user_content_id", params.userContentId)
    .limit(1);

  if (existingRecommendation && existingRecommendation.length > 0) {
    return failure("CONFLICT", "이미 추천한 콘텐츠입니다.");
  }

  // 4. 추천 생성
  const { data: recommendation, error: insertError } = await supabase
    .from("content_recommendations")
    .insert({
      sender_id: user.id,
      receiver_id: params.receiverId,
      user_content_id: params.userContentId,
      message: params.message?.slice(0, 200) ?? null,
    })
    .select("id")
    .single();

  if (insertError || !recommendation) {
    console.error("[sendRecommendation] Insert error:", insertError);
    return failure("INTERNAL_ERROR", "추천 전송에 실패했습니다.");
  }

  // 5. 발신자 프로필 조회
  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .single();

  const senderName = senderProfile?.nickname ?? "사용자";

  // 6. 알림 생성
  type ContentData = {
    id: string;
    title: string;
    type: string;
    thumbnail_url: string | null;
  };
  const content = (
    Array.isArray(userContent.content)
      ? userContent.content[0]
      : userContent.content
  ) as ContentData;

  await createNotification({
    userId: params.receiverId,
    actorId: user.id,
    type: "recommendation",
    title: `${senderName}님의 추천`,
    message: `${senderName}님이 '${content?.title ?? "콘텐츠"}'을(를) 추천했습니다.`,
    link: `/notifications`,
    metadata: {
      recommendation_id: recommendation.id,
      content_id: content?.id,
      content_title: content?.title,
      content_type: content?.type,
      message: params.message ?? null,
    },
  });

  return success({ recommendationId: recommendation.id });
}
