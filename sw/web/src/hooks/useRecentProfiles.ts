/*
  파일명: /hooks/useRecentProfiles.ts
  기능: 최근 방문한 프로필 localStorage 관리
  책임: 유저 프로필 페이지 진입 시 저장하고, 최근 목록을 반환한다.
*/ // ------------------------------
"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "recent_profiles";
const MAX_ITEMS = 20;

export interface RecentProfileItem {
  id: string;
  nickname: string;
  avatarUrl: string | null;
  title: string | null;
  profileType: "USER" | "CELEB";
  visitedAt: number;
}

/** 최근 방문 프로필 목록 조회 + 현재 프로필 저장 */
export function useRecentProfiles(currentUserId?: string) {
  const [items, setItems] = useState<RecentProfileItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // 파싱 실패 시 무시
    }
  }, []);

  const addItem = useCallback(
    (item: Omit<RecentProfileItem, "visitedAt">) => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const list: RecentProfileItem[] = raw ? JSON.parse(raw) : [];

        const filtered = list.filter((i) => i.id !== item.id);

        const next = [
          { ...item, visitedAt: Date.now() },
          ...filtered,
        ].slice(0, MAX_ITEMS);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        setItems(next);
      } catch {
        // localStorage 접근 실패 시 무시
      }
    },
    []
  );

  const recentItems = currentUserId
    ? items.filter((i) => i.id !== currentUserId)
    : items;

  return { recentItems, addItem };
}
