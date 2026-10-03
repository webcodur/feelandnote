/*
  파일명: /components/layout/header/useHeaderNotifications.ts
  기능: 헤더 알림 데이터 — 목록·미읽음 수·주기적 갱신·읽음 처리
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
    let cancelled = false;
    let memberId: string | null = null;
    let refreshing = false;

    const refresh = async () => {
      if (cancelled || refreshing || !memberId || document.visibilityState === "hidden") return;
      refreshing = true;
      try {
        const { data } = await db
          .from("member_notifications")
          .select(NOTIFICATION_BRIEF_COLUMNS)
          .eq("member_id", memberId)
          .order("created_at", { ascending: false })
          .limit(20);
        if (cancelled) return;
        if (data) {
          setNotifications(data as HeaderNotification[]);
          setUnreadCount((data as HeaderNotification[]).filter((n) => !n.is_read).length);
        }
      } finally {
        refreshing = false;
        if (!cancelled) setLoading(false);
      }
    };

    const init = async () => {
      const { data: { user } } = await db.auth.getUser();
      if (cancelled) return;
      memberId = user?.id ?? null;
      if (!memberId) setLoading(false);
      else await refresh();
    };

    void init();
    // Oracle DB에는 Realtime 서버가 없다. 열린 탭에서만 REST로 갱신한다.
    const timer = window.setInterval(() => { void refresh(); }, 60_000);
    const onVisible = () => { void refresh(); };
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
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
