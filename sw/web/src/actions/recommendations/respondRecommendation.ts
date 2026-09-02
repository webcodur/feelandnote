"use server";

import { createClient } from "@/lib/db/server";
import { createNotification } from "@/actions/notifications";
import { revalidatePath } from "next/cache";
import type { RespondRecommendationParams } from "@/types/recommendation";
import { type ActionResult, failure, success } from "@/lib/errors";
import { getLocale, getTranslations } from "next-intl/server";

interface RespondRecommendationData {
  accepted: boolean;
  userContentId?: string;
}

export async function respondRecommendation(
  params: RespondRecommendationParams
): Promise<ActionResult<RespondRecommendationData>> {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    return failure("UNAUTHORIZED");
  }

  // 1. 추천 조회 (본인이 수신자인지 확인)
  const { data: recommendation, error: fetchError } = await db
    .from("content_recommendations")
    .select(
      `
      id,
      sender_id,
      receiver_id,
      status,
      member_content:member_contents!content_recommendations_member_content_id_fkey(
        content_id,
        content:contents(id, type, metadata)
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
  const { error: updateError } = await db
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

  // 3. 수락 시: 수신자의 회원 서재에 콘텐츠 추가
  if (params.accept) {
    type RawContent = {
      id: string;
      type: string;
      metadata: Record<string, unknown> | null;
    };
    type MemberContentData = {
      content_id: string;
      content: RawContent | RawContent[];
    };

    const memberContent = (
      Array.isArray(recommendation.member_content)
        ? recommendation.member_content[0]
        : recommendation.member_content
    ) as MemberContentData;
    const rawContent = Array.isArray(memberContent?.content)
      ? memberContent.content[0]
      : memberContent?.content;
    const content = rawContent ? { id: rawContent.id, type: rawContent.type, metadata: rawContent.metadata } : null;

    if (content) {
      // 이미 추가된 콘텐츠인지 확인
      const { data: existingContent } = await db
        .from("member_contents")
        .select("id")
        .eq("member_id", user.id)
        .eq("content_id", content.id)
        .limit(1);

      if (!existingContent || existingContent.length === 0) {
        // 콘텐츠가 없으면 회원 서재에 추가한다.
        const { data: newContent, error: insertError } = await db
          .from("member_contents")
          .insert({
            member_id: user.id,
            content_id: content.id,
            status: "WANT",
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
    const locale = await getLocale();
    const t = await getTranslations({ locale, namespace: "notificationMessages" });
    const { data: receiverProfile } = await db
      .from("member_profiles")
      .select("nickname")
      .eq("id", user.id)
      .single();

    const receiverName =
      receiverProfile?.nickname ??
      t("userFallback");

    await createNotification({
      type: "recommendation_accepted",
      title: t("acceptedTitle"),
      message: t("acceptedMessage", { name: receiverName }),
      link: `/${user.id}/reading`,
      metadata: {
        recommendation_id: recommendation.id,
      },
    });
  }

  revalidatePath("/notifications");
  revalidatePath(`/${user.id}/reading`);

  return success({
    accepted: params.accept,
    userContentId: newUserContentId,
  });
}
