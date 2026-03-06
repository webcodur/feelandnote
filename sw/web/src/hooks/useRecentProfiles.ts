/*
  파일명: /hooks/useRecentProfiles.ts
  기능: 최근 방문한 프로필 localStorage 관리
  책임: 유저 프로필 페이지 진입 시 저장하고, 최근 목록을 반환한다.
*/ // ------------------------------
"use client";

import { useState, useEffect, useCallback } from "react";

const OLD_STORAGE_KEY = "recent_profiles";
const STORAGE_KEY = "recent_profiles_v2";
const MAX_ITEMS = 5;

export interface RecentProfileItem {
  id: string;
  nickname: string;
  nickname_en?: string | null;
  nickname_ko?: string | null;
  avatarUrl: string | null;
  title: string | null;
  title_en?: string | null;
  title_ko?: string | null;
  profileType: "USER" | "CELEB";
  visitedAt: number;
}

// ─── 모듈 레벨 싱글턴 ────────────────────────────
// 컴포넌트 마운트 순서에 관계없이 즉각 동기화된다.
type Listener = (items: RecentProfileItem[]) => void;
const listeners = new Set<Listener>();

function notify(items: RecentProfileItem[]) {
  listeners.forEach((fn) => fn(items));
}

function readStorage(): RecentProfileItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStorage(items: RecentProfileItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}
// ─────────────────────────────────────────────────

/** 최근 방문 프로필 목록 조회 + 현재 프로필 저장 */
export function useRecentProfiles(currentUserId?: string) {
  const [items, setItems] = useState<RecentProfileItem[]>([]);

  useEffect(() => {
    // 이전 키 정리
    try { localStorage.removeItem(OLD_STORAGE_KEY); } catch { /* ignore */ }

    // 초기 로드
    setItems(readStorage());

    // 싱글턴 리스너 등록
    listeners.add(setItems);
    return () => { listeners.delete(setItems); };
  }, []);

  const addItem = useCallback(
    (item: Omit<RecentProfileItem, "visitedAt">) => {
      const list = readStorage();
      const filtered = list.filter((i) => i.id !== item.id);
      const next = [{ ...item, visitedAt: Date.now() }, ...filtered].slice(0, MAX_ITEMS);
      writeStorage(next);
      notify(next);        // 등록된 모든 리스너(setItems)에 즉시 전달
    },
    []
  );

  const recentItems = currentUserId
    ? items.filter((i) => i.id !== currentUserId)
    : items;

  return { recentItems, addItem };
}
