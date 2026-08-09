"use server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/supabase";

type RecommendationNotificationType =
  | "recommendation"
  | "recommendation_accepted";

interface RecommendationNotificationMetadata {
  recommendation_id: string;
  [key: string]: Json | undefined;
}

interface CreateNotificationParams {
  type: RecommendationNotificationType;
  title?: string;
  message: string;
  link?: string;
  metadata: RecommendationNotificationMetadata;
}

// 추천 참여관계와 수신자·행위자는 DB가 검증하고 파생한다.
// 알림 생성 실패는 추천 본 작업을 되돌리지 않되 서버 로그에는 남긴다.
export async function createNotification(
  params: CreateNotificationParams
): Promise<void> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.rpc("create_recommendation_notification", {
      p_recommendation_id: params.metadata.recommendation_id,
      p_type: params.type,
      p_message: params.message,
      p_title: params.title ?? null,
      p_link: params.link ?? null,
      p_metadata: params.metadata,
    });

    if (error) {
      console.error("[createNotification] Failed to create recommendation notification", error);
    }
  } catch (error) {
    console.error("[createNotification] Failed to create recommendation notification", error);
  }
}
