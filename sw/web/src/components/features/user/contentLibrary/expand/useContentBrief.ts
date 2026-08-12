/*
  파일명: /components/features/user/contentLibrary/expand/useContentBrief.ts
  기능: 펼침 보기가 지금 띄운 작품의 소개·정보를 받아온다.
  책임: 한 번 받아온 작품은 다시 부르지 않고, 바로 앞뒤 작품을 미리 챙겨 목록·버튼 선택 시 비지 않게 한다.
*/ // ------------------------------
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";

import { getContentBrief, type ContentBrief } from "@/actions/contents/getContentBrief";

/** 지금 보는 것 기준 앞뒤로 몇 개까지 미리 챙겨둘지 */
const PREFETCH_RADIUS = 1;

export interface ContentBriefState {
  brief: ContentBrief | null;
  isLoading: boolean;
}

/**
 * 작품 소개·정보 조달.
 *
 * `contentIds`는 목록 순서대로 넣는다. `at`이 지금 선택한 자리다.
 */
export function useContentBrief(contentIds: string[], at: number): ContentBriefState {
  const locale = useLocale();
  const [briefs, setBriefs] = useState<Record<string, ContentBrief | null>>({});
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  // 같은 작품을 두 번 부르지 않는다. 결과가 null이어도 "물어봤다"는 사실은 남긴다.
  const askedRef = useRef<Set<string>>(new Set());

  const load = useCallback(
    async (contentId: string, isCurrent: boolean) => {
      const cacheKey = `${locale}:${contentId}`;
      if (!contentId || askedRef.current.has(cacheKey)) return;
      askedRef.current.add(cacheKey);
      if (isCurrent) setPendingKey(cacheKey);
      try {
        const brief = await getContentBrief(contentId, locale);
        setBriefs((prev) => ({ ...prev, [cacheKey]: brief }));
      } catch (error) {
        // 다시 시도할 수 있게 물어본 기록을 지운다
        askedRef.current.delete(cacheKey);
        console.error("[useContentBrief]", contentId, error);
      } finally {
        setPendingKey((prev) => (prev === cacheKey ? null : prev));
      }
    },
    [locale],
  );

  useEffect(() => {
    const currentId = contentIds[at];
    if (!currentId) return;

    void load(currentId, true);

    /* 앞뒤를 미리 챙긴다 — 인접한 목록 항목을 누른 순간 이미 손에 있어야 화면이 비지 않는다.
       지금 것을 먼저 부르고 한 박자 뒤에 이웃을 부른다. */
    const timer = setTimeout(() => {
      for (let offset = 1; offset <= PREFETCH_RADIUS; offset += 1) {
        const next = contentIds[at + offset];
        const prev = contentIds[at - offset];
        if (next) void load(next, false);
        if (prev) void load(prev, false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [at, contentIds, load]);

  const currentId = contentIds[at];
  const currentKey = currentId ? `${locale}:${currentId}` : null;
  return {
    brief: currentKey ? briefs[currentKey] ?? null : null,
    isLoading: currentKey != null && pendingKey === currentKey,
  };
}
