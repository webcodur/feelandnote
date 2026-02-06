/*
  인원 구성 배치 조회 훅
  - 여러 ContentCard에서 동시에 요청이 들어오면 배치로 묶어 한 번에 조회
  - 캐시로 이미 조회한 결과 재사용
*/
"use client";

import { useState, useEffect } from "react";
import { getCelebCountsForContents, type ContentCounts } from "@/actions/contents/getCelebCounts";

// 모듈 레벨 상태 (싱글톤)
let countQueue: string[] = [];
let countResolvers = new Map<string, ((counts: ContentCounts) => void)[]>();
let countTimer: ReturnType<typeof setTimeout> | null = null;
const countCache = new Map<string, ContentCounts>();

function requestContentCounts(contentId: string): Promise<ContentCounts> {
  // 캐시에 있으면 즉시 반환
  if (countCache.has(contentId)) {
    return Promise.resolve(countCache.get(contentId)!);
  }

  return new Promise(resolve => {
    countQueue.push(contentId);
    const existing = countResolvers.get(contentId) || [];
    existing.push(resolve);
    countResolvers.set(contentId, existing);

    if (!countTimer) {
      countTimer = setTimeout(async () => {
        const ids = [...new Set(countQueue)];
        const resolvers = new Map(countResolvers);
        countQueue = [];
        countResolvers = new Map();
        countTimer = null;

        try {
          const counts = await getCelebCountsForContents(ids);
          for (const [id, resolverList] of resolvers) {
            const result = counts[id] ?? { celebCount: 0, userCount: 0 };
            countCache.set(id, result);
            for (const resolver of resolverList) {
              resolver(result);
            }
          }
        } catch {
          for (const resolverList of resolvers.values()) {
            for (const resolver of resolverList) {
              resolver({ celebCount: 0, userCount: 0 });
            }
          }
        }
      }, 16); // 1프레임 (60fps 기준)
    }
  });
}

export interface ContentCountsResult {
  celebCount: number | undefined;
  userCount: number | undefined;
}

export function useContentCounts(contentId?: string): ContentCountsResult {
  const [counts, setCounts] = useState<ContentCounts | undefined>(undefined);

  useEffect(() => {
    if (!contentId) return;
    requestContentCounts(contentId).then(setCounts);
  }, [contentId]);

  return {
    celebCount: counts?.celebCount,
    userCount: counts?.userCount,
  };
}

// 하위 호환 (기존 useCelebCount 사용처)
export function useCelebCount(contentId?: string): number | undefined {
  const { celebCount } = useContentCounts(contentId);
  return celebCount;
}
