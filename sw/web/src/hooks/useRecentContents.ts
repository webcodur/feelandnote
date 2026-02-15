/*
  파일명: /hooks/useRecentContents.ts
  기능: 최근 접근한 콘텐츠 localStorage 관리
  책임: 콘텐츠 상세 페이지 진입 시 저장하고, 최근 목록을 반환한다.
*/ // ------------------------------
"use client";

import { useState, useEffect, useCallback } from "react";
import type { ContentType } from "@/types/database";

const STORAGE_KEY = "recent_contents";
const MAX_ITEMS = 20;

export interface RecentContentItem {
  id: string;
  type: ContentType;
  title: string;
  creator: string | null;
  thumbnail: string | null;
  visitedAt: number;
}

/** 최근 접근 콘텐츠 목록 조회 + 현재 콘텐츠 저장 */
export function useRecentContents(currentContentId?: string) {
  const [items, setItems] = useState<RecentContentItem[]>([]);

  // 마운트 시 localStorage에서 로드
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // 파싱 실패 시 무시
    }
  }, []);

  /** 콘텐츠 저장 (현재 페이지) */
  const addItem = useCallback(
    (item: Omit<RecentContentItem, "visitedAt">) => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const list: RecentContentItem[] = raw ? JSON.parse(raw) : [];

        // 중복 제거
        const filtered = list.filter((i) => i.id !== item.id);

        // 앞에 추가
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

  // 현재 콘텐츠를 제외한 목록
  const recentItems = currentContentId
    ? items.filter((i) => i.id !== currentContentId)
    : items;

  return { recentItems, addItem };
}
