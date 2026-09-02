"use server";

import { createClient } from "@/lib/db/server";
import { createNotification } from "@/actions/notifications";
import type { SendRecommendationParams } from "@/types/recommendation";
import { type ActionResult, failure, success } from "@/lib/errors";
import { getLocale, getTranslations } from "next-intl/server";
import { CL_SELECT_LIST, flattenLocales, type ContentLocaleRow } from "@/lib/utils/content-locale";

interface SendRecommendationData {
  recommendationId: string;
}

export async function sendRecommendation(
  params: SendRecommendationParams
): Promise<ActionResult<SendRecommendationData>> {
  const db = await createClient();

  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) {
    return failure("UNAUTHORIZED");
  }

  // 1. 차단 관계 확인
  const { data: blockData } = await db
    .from("blocks")
    .select("id")
    .or(
      `and(blocker_id.eq.${user.id},blocked_id.eq.${params.receiverId}),and(blocker_id.eq.${params.receiverId},blocked_id.eq.${user.id})`
    )
    .limit(1);

  if (blockData && blockData.length > 0) {
    return failure("FORBIDDEN", "추천할 수 없는 사용자입니다.");
  }

  // 2. 회원 감상 기록 조회 (본인 소유인지 확인)
  const { data: userContent, error: contentError } = await db
    .from("member_contents")
    .select(
      `
      id,
      member_id,
      status,
      content:contents(id, type, content_locales(${CL_SELECT_LIST}))
    `
    )
    .eq("id", params.userContentId)
    .single();

  if (contentError || !userContent) {
    return failure("NOT_FOUND", "콘텐츠를 찾을 수 없습니다.");
  }

  if (userContent.member_id !== user.id) {
    return failure("FORBIDDEN", "본인의 콘텐츠만 추천할 수 있습니다.");
  }

  if (userContent.status !== "FINISHED") {
    return failure("FORBIDDEN", "완료한 콘텐츠만 추천할 수 있습니다.");
  }

  // 3. 중복 추천 확인
  const { data: existingRecommendation } = await db
    .from("content_recommendations")
    .select("id")
    .eq("sender_id", user.id)
    .eq("receiver_id", params.receiverId)
    .eq("member_content_id", params.userContentId)
    .limit(1);

  if (existingRecommendation && existingRecommendation.length > 0) {
    return failure("CONFLICT", "이미 추천한 콘텐츠입니다.");
  }

  // 4. 추천 생성
  const { data: recommendation, error: insertError } = await db
    .from("content_recommendations")
    .insert({
      sender_id: user.id,
      receiver_id: params.receiverId,
      member_content_id: params.userContentId,
      message: params.message?.slice(0, 200) ?? null,
    })
    .select("id")
    .single();

  if (insertError || !recommendation) {
    console.error("[sendRecommendation] Insert error:", insertError);
    return failure("INTERNAL_ERROR", "추천 전송에 실패했습니다.");
  }

  // 5. 발신자 프로필 조회
  const { data: senderProfile } = await db
    .from("member_profiles")
    .select("nickname")
    .eq("id", user.id)
    .single();

  // 6. 알림 생성
  const rawContent = (
    Array.isArray(userContent.content)
      ? userContent.content[0]
      : userContent.content
  ) as { id: string; type: string; content_locales: ContentLocaleRow[] | null } | null;
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "notificationMessages" });
  const senderName =
    senderProfile?.nickname ??
    t("userFallback");
  const flat = flattenLocales(rawContent?.content_locales, locale);
  const content = rawContent ? { id: rawContent.id, type: rawContent.type, title: flat.title, thumbnail_url: flat.thumbnail_url } : null;

  await createNotification({
    type: "recommendation",
    title: t("recommendationTitle", { name: senderName }),
    message: t("recommendationMessage", {
      name: senderName,
      content: content?.title ?? t("contentFallback"),
    }),
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
