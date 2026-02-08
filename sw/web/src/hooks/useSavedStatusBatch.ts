/*
  콘텐츠 저장 상태 배치 조회 훅
  - 여러 SavedContentCard에서 동시에 요청이 들어오면 배치로 묶어 한 번에 조회
  - 캐시로 이미 조회한 결과 재사용
  - useCelebCount.ts 패턴 참고
*/
"use client";

import { useState, useEffect } from "react";
import { checkContentsSaved } from "@/actions/contents/getMyContentIds";

// 모듈 레벨 상태 (싱글톤)
let savedQueue: string[] = [];
let savedResolvers = new Map<string, ((saved: boolean) => void)[]>();
let savedTimer: ReturnType<typeof setTimeout> | null = null;
const savedCache = new Map<string, boolean>();

// 비로그인 상태 여부 (한 번 확인 후 캐시)
let isLoggedOut: boolean | null = null;

function requestSavedStatus(contentId: string): Promise<boolean> {
  // 비로그인 확인됨 → 즉시 false 반환
  if (isLoggedOut === true) {
    return Promise.resolve(false);
  }

  // 캐시에 있으면 즉시 반환
  if (savedCache.has(contentId)) {
    return Promise.resolve(savedCache.get(contentId)!);
  }

  return new Promise(resolve => {
    savedQueue.push(contentId);
    const existing = savedResolvers.get(contentId) || [];
    existing.push(resolve);
    savedResolvers.set(contentId, existing);

    if (!savedTimer) {
      savedTimer = setTimeout(async () => {
        const ids = [...new Set(savedQueue)];
        const resolvers = new Map(savedResolvers);
        savedQueue = [];
        savedResolvers = new Map();
        savedTimer = null;

        try {
          const result = await checkContentsSaved(ids);
          
          // null이면 비로그인 상태
          if (result === null) {
            isLoggedOut = true;
            for (const resolverList of resolvers.values()) {
              for (const resolver of resolverList) {
                resolver(false);
              }
            }
            return;
          }

          // 로그인 상태 확인됨
          isLoggedOut = false;

          for (const [id, resolverList] of resolvers) {
            const saved = result.has(id);
            savedCache.set(id, saved);
            for (const resolver of resolverList) {
              resolver(saved);
            }
          }
        } catch {
          for (const resolverList of resolvers.values()) {
            for (const resolver of resolverList) {
              resolver(false);
            }
          }
        }
      }, 16); // 1프레임 (60fps 기준)
    }
  });
}

// 캐시 무효화 (저장/삭제 후 호출)
export function invalidateSavedCache(contentId?: string) {
  if (contentId) {
    savedCache.delete(contentId);
  } else {
    savedCache.clear();
  }
}

// 저장 상태 업데이트 (저장/삭제 후 즉시 반영)
export function updateSavedCache(contentId: string, saved: boolean) {
  savedCache.set(contentId, saved);
}

export interface SavedStatusResult {
  saved: boolean | undefined;
  isChecking: boolean;
}

export function useSavedStatusBatch(contentId?: string, autoCheck = true): SavedStatusResult {
  const [saved, setSaved] = useState<boolean | undefined>(undefined);
  const [isChecking, setIsChecking] = useState(autoCheck);

  useEffect(() => {
    if (!contentId || !autoCheck) {
      setIsChecking(false);
      return;
    }

    requestSavedStatus(contentId).then(result => {
      setSaved(result);
      setIsChecking(false);
    });
  }, [contentId, autoCheck]);

  return {
    saved,
    isChecking,
  };
}
