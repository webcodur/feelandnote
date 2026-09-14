/*
  파일명: /components/layout/header/useHeaderNotifications.ts
  기능: 헤더 알림 데이터 — 목록·미읽음 수·실시간 구독·읽음 처리
  책임: 조회와 상태만 쥔다. 화면 이동은 호출자가 정한다.
*/ // ------------------------------

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/db/client";

export interface HeaderNotification {
  id: string;
  type: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string | null;
}

// 헤더에서 사용하는 필드만 — egress 절감
const NOTIFICATION_BRIEF_COLUMNS = "id, type, message, link, is_read, created_at";

export function useHeaderNotifications() {
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const db = useMemo(() => createClient(), []);

  useEffect(() => {
    let channel: ReturnType<typeof db.channel> | null = null;
    let cancelled = false;

    const init = async () => {
      const { data: { user } } = await db.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      if (cancelled) return;

      // Fetch initial data — 필요 컬럼만 select
      const { data } = await db
        .from("member_notifications")
        .select(NOTIFICATION_BRIEF_COLUMNS)
        .eq("member_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (cancelled) return;

      if (data) {
        setNotifications(data as HeaderNotification[]);
        setUnreadCount((data as HeaderNotification[]).filter((n) => !n.is_read).length);
      }
      setLoading(false);

      // Realtime subscription
      channel = db
        .channel(`header-notifications:${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "member_notifications",
            filter: `member_id=eq.${user.id}`,
          },
          (payload) => {
            const full = payload.new as HeaderNotification & { member_id: string };
            const newNotif: HeaderNotification = {
              id: full.id,
              type: full.type,
              message: full.message,
              link: full.link,
              is_read: full.is_read,
              created_at: full.created_at,
            };
            setNotifications((prev) => [newNotif, ...prev]);
            setUnreadCount((prev) => prev + 1);
          }
        )
        .subscribe();

      // await 도중 언마운트됐다면 즉시 정리
      if (cancelled) {
        db.removeChannel(channel);
        channel = null;
      }
    };

    init();

    return () => {
      cancelled = true;
      if (channel) db.removeChannel(channel);
    };
  }, [db]);

  const markRead = useCallback(async (notif: HeaderNotification) => {
    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await db.from("member_notifications").update({ is_read: true }).eq("id", notif.id);
    }
  }, [db]);

  const markAllRead = useCallback(async () => {
    const { data: { user } } = await db.auth.getUser();
    if (!user) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    await db
      .from("member_notifications")
      .update({ is_read: true })
      .eq("member_id", user.id)
      .eq("is_read", false);
  }, [db]);

  return { notifications, unreadCount, loading, markRead, markAllRead };
}
