/*
  펼침 보기의 작품 소개·메타데이터를 현재 선택한 작품에 한해 가져온다.
  새 상세 카드는 요청 결과(null 포함)가 준비된 뒤에만 완성 카드 단위로 내보낸다.
*/
"use client";

import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";

import { getContentBrief, type ContentBrief } from "@/actions/contents/getContentBrief";

const MAX_REQUEST_ATTEMPTS = 2;
const RETRY_DELAY_MS = 200;

type SettledBriefEntry =
  | { status: "ready"; brief: ContentBrief | null }
  | { status: "failed"; brief: null };

type BriefEntry = { status: "loading" } | SettledBriefEntry;

type CommittedBrief = SettledBriefEntry & {
  cacheKey: string;
  contentId: string;
  locale: string;
};

export interface ContentBriefState {
  /** 마지막으로 완전히 준비된 현재 작품. 최초 요청 전에는 null이다. */
  contentId: string | null;
  brief: ContentBrief | null;
  /** 요청 대상과 마지막 완성 카드가 다를 때 true다. */
  isLoading: boolean;
}

/**
 * `at` 작품을 요청한다. 인접 작품 배경 요청은 상호작용 중 메인 스레드를 깨울 수 있어 하지 않는다.
 * 빠른 연속 선택에서는 마지막 요청 키와 일치하는 응답만 완성 카드로 승격한다.
 */
export function useContentBrief(
  contentIds: string[],
  at: number,
  activeContentId: string | null,
  isActiveContent: (contentId: string) => boolean,
  enabled = true,
  initialBrief?: ContentBrief | null,
): ContentBriefState {
  const locale = useLocale();
  const initialContentId = initialBrief?.contentId ?? null;
  const initialCacheKey = initialContentId ? `${locale}:${initialContentId}` : null;
  const canCommitInitial = initialBrief != null
    && initialContentId === activeContentId
    && contentIds[at] === activeContentId;
  const entriesRef = useRef<Map<string, BriefEntry>>(
    new Map(
      initialCacheKey && initialBrief != null
        ? [[initialCacheKey, { status: "ready", brief: initialBrief } as SettledBriefEntry]]
        : [],
    ),
  );
  const pendingRef = useRef<Map<string, Promise<SettledBriefEntry>>>(new Map());
  const activeKeyRef = useRef<string | null>(
    canCommitInitial && initialCacheKey ? initialCacheKey : null,
  );
  const [committed, setCommitted] = useState<CommittedBrief | null>(() => (
    canCommitInitial && initialContentId && initialCacheKey && initialBrief != null
      ? {
          status: "ready",
          brief: initialBrief,
          cacheKey: initialCacheKey,
          contentId: initialContentId,
          locale,
        }
      : null
  ));

  const load = useCallback(
    (contentId: string, retryFailed: boolean): Promise<SettledBriefEntry> => {
      const cacheKey = `${locale}:${contentId}`;
      const pending = pendingRef.current.get(cacheKey);
      if (pending) return pending;

      const current = entriesRef.current.get(cacheKey);
      if (current?.status === "ready") return Promise.resolve(current);
      if (current?.status === "failed" && !retryFailed) return Promise.resolve(current);

      entriesRef.current.set(cacheKey, { status: "loading" });
      const request = (async (): Promise<SettledBriefEntry> => {
        for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt += 1) {
          try {
            const brief = await getContentBrief(contentId, locale);
            const entry: SettledBriefEntry = { status: "ready", brief };
            entriesRef.current.set(cacheKey, entry);
            return entry;
          } catch (error) {
            if (attempt < MAX_REQUEST_ATTEMPTS) {
              await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
              continue;
            }

            // 실패도 완료 상태로 승격해 본문이 영구 aria-busy에 갇히지 않게 한다.
            // 이 항목을 떠났다가 다시 선택하면 retryFailed 경로에서 다시 요청한다.
            const entry: SettledBriefEntry = { status: "failed", brief: null };
            entriesRef.current.set(cacheKey, entry);
            console.error("[useContentBrief]", contentId, error);
            return entry;
          }
        }

        // 반복문은 항상 return하지만 타입 수준에서도 완료 상태를 보장한다.
        return { status: "failed", brief: null };
      })().finally(() => {
        pendingRef.current.delete(cacheKey);
      });
      pendingRef.current.set(cacheKey, request);
      return request;
    },
    [locale],
  );

  useEffect(() => {
    const currentId = contentIds[at];
    // useDeferredValue가 아직 이전 선택을 가리키는 동안에는 중간 요청을 승격하지 않는다.
    // 선택이 다시 바뀌면 cleanup이 이전 응답의 카드 커밋도 취소한다.
    if (!enabled || !currentId || currentId !== activeContentId) return;

    const currentKey = `${locale}:${currentId}`;
    let cancelled = false;
    activeKeyRef.current = currentKey;
    void load(currentId, true).then((entry) => {
      if (
        cancelled
        || activeKeyRef.current !== currentKey
        || !isActiveContent(currentId)
      ) return;
      startTransition(() => {
        setCommitted((current) => (
          isActiveContent(currentId)
            ? {
                ...entry,
                cacheKey: currentKey,
                contentId: currentId,
                locale,
              }
            : current
        ));
      });
    });

    return () => {
      cancelled = true;
    };
  }, [activeContentId, at, contentIds, enabled, isActiveContent, load, locale]);

  const activeKey = activeContentId ? `${locale}:${activeContentId}` : null;
  const localeCommitted = committed?.locale === locale ? committed : null;
  return {
    contentId: localeCommitted?.contentId ?? null,
    brief: localeCommitted?.brief ?? null,
    isLoading: enabled && activeKey != null && localeCommitted?.cacheKey !== activeKey,
  };
}
