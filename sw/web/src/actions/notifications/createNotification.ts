"use server";

import { createClient } from "@/lib/supabase/server";

export type NotificationType =
  | "like"
  | "comment"
  | "follow"
  | "achievement"
  | "system"
  | "guestbook"
  | "recommendation"
  | "recommendation_accepted";

interface CreateNotificationParams {
  userId: string;
  actorId?: string;
  type: NotificationType;
  title?: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
}

// 알림 생성 (에러 발생해도 throw하지 않음)
export async function createNotification(
  params: CreateNotificationParams
): Promise<void> {
  try {
    const supabase = await createClient();

    await supabase.from("notifications").insert({
      user_id: params.userId,
      actor_id: params.actorId ?? null,
      type: params.type,
      title: params.title ?? null,
      message: params.message,
      link: params.link ?? null,
      metadata: params.metadata ?? null,
    });
  } catch {
    console.error("[createNotification] Failed to create notification");
  }
}
