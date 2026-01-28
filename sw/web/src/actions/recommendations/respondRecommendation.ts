"use server";

import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/actions/notifications";
import { revalidatePath } from "next/cache";
import type { RespondRecommendationParams } from "@/types/recommendation";
import { type ActionResult, failure, success } from "@/lib/errors";

interface RespondRecommendationData {
  accepted: boolean;
  userContentId?: string;
}

export async function respondRecommendation(
  params: RespondRecommendationParams
): Promise<ActionResult<RespondRecommendationData>> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return failure("UNAUTHORIZED");
  }

  // 1. 추천 조회 (본인이 수신자인지 확인)
  const { data: recommendation, error: fetchError } = await supabase
    .from("content_recommendations")
    .select(
      `
      id,
      sender_id,
      receiver_id,
      status,
      user_content:user_contents!content_recommendations_user_content_id_fkey(
        content_id,
        content:contents(id, type, title, creator, thumbnail_url, description, metadata)
      )
    `
    )
    .eq("id", params.recommendationId)
    .single();

  if (fetchError || !recommendation) {
    return failure("NOT_FOUND", "추천을 찾을 수 없습니다.");
  }

  if (recommendation.receiver_id !== user.id) {
    return failure("FORBIDDEN", "본인에게 온 추천만 응답할 수 있습니다.");
  }

  if (recommendation.status !== "pending") {
    return failure("CONFLICT", "이미 처리된 추천입니다.");
  }

  const newStatus = params.accept ? "accepted" : "declined";

  // 2. 추천 상태 업데이트
  const { error: updateError } = await supabase
    .from("content_recommendations")
    .update({
      status: newStatus,
      responded_at: new Date().toISOString(),
    })
    .eq("id", params.recommendationId);

  if (updateError) {
    console.error("[respondRecommendation] Update error:", updateError);
    return failure("INTERNAL_ERROR", "응답 처리에 실패했습니다.");
  }

  let newUserContentId: string | undefined;

  // 3. 수락 시: 수신자의 user_contents에 콘텐츠 추가
  if (params.accept) {
    type UserContentData = {
      content_id: string;
      content:
        | {
            id: string;
            type: string;
            title: string;
            creator: string | null;
            thumbnail_url: string | null;
            description: string | null;
            metadata: Record<string, unknown> | null;
          }
        | Array<{
            id: string;
            type: string;
            title: string;
            creator: string | null;
            thumbnail_url: string | null;
            description: string | null;
            metadata: Record<string, unknown> | null;
          }>;
    };

    const userContent = (
      Array.isArray(recommendation.user_content)
        ? recommendation.user_content[0]
        : recommendation.user_content
    ) as UserContentData;
    const content = Array.isArray(userContent?.content)
      ? userContent.content[0]
      : userContent?.content;

    if (content) {
      // 이미 추가된 콘텐츠인지 확인
      const { data: existingContent } = await supabase
        .from("user_contents")
        .select("id")
        .eq("user_id", user.id)
        .eq("content_id", content.id)
        .limit(1);

      if (!existingContent || existingContent.length === 0) {
        // 콘텐츠가 없으면 추가 (contributor_id로 추천자 기록)
        const { data: newContent, error: insertError } = await supabase
          .from("user_contents")
          .insert({
            user_id: user.id,
            content_id: content.id,
            status: "WANT",
            contributor_id: recommendation.sender_id,
          })
          .select("id")
          .single();

        if (!insertError && newContent) {
          newUserContentId = newContent.id;
        }
      }
    }
  }

  // 4. 수락 시 발신자에게 알림
  if (params.accept) {
    const { data: receiverProfile } = await supabase
      .from("profiles")
      .select("nickname")
      .eq("id", user.id)
      .single();

    const receiverName = receiverProfile?.nickname ?? "사용자";

    await createNotification({
      userId: recommendation.sender_id,
      actorId: user.id,
      type: "recommendation_accepted",
      title: "추천 수락",
      message: `${receiverName}님이 회원님의 추천을 수락했습니다.`,
      link: `/${user.id}/records`,
      metadata: {
        recommendation_id: recommendation.id,
      },
    });
  }

  revalidatePath("/notifications");
  revalidatePath(`/${user.id}/records`);

  return success({
    accepted: params.accept,
    userContentId: newUserContentId,
  });
}
