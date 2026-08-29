"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getPublicCelebContentRecord } from "@/actions/contents/getCelebContentExpand";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import { mapPublicToUserContent } from "../contentLibraryTypes";

type RecordEntry =
  | { status: "ready"; item: UserContentWithContent | null }
  | { status: "failed"; item: null };

type ActiveEntry = RecordEntry & { contentId: string };

const MAX_REQUEST_ATTEMPTS = 3;
const RETRY_DELAY_MS = 250;

export function useCelebContentRecord(
  celebId: string | undefined,
  contentId: string | null,
  initialRecord: UserContentWithContent | undefined,
  enabled: boolean,
) {
  const cacheRef = useRef<Map<string, RecordEntry>>(
    new Map(initialRecord ? [[initialRecord.content_id, { status: "ready", item: initialRecord }]] : []),
  );
  const pendingRef = useRef<Map<string, Promise<RecordEntry>>>(new Map());
  const [active, setActive] = useState<ActiveEntry | null>(() => (
    initialRecord
      ? { contentId: initialRecord.content_id, status: "ready", item: initialRecord }
      : null
  ));
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!enabled || !celebId || !contentId) return;
    let cancelled = false;
    const cached = cacheRef.current.get(contentId);
    let request = cached ? Promise.resolve(cached) : pendingRef.current.get(contentId);

    if (!request) {
      request = (async (): Promise<RecordEntry> => {
        for (let attempt = 1; attempt <= MAX_REQUEST_ATTEMPTS; attempt += 1) {
          try {
            const record = await getPublicCelebContentRecord(celebId, contentId);
            return {
              status: "ready",
              item: record ? mapPublicToUserContent([record], celebId)[0] : null,
            };
          } catch (error) {
            if (attempt < MAX_REQUEST_ATTEMPTS) {
              await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
              continue;
            }
            console.error("[useCelebContentRecord]", contentId, error);
            return { status: "failed", item: null };
          }
        }
        return { status: "failed", item: null };
      })()
        .then((entry) => {
          // 실패는 실제 빈 기록이 아니다. 작품을 다시 고르거나 재시도할 때 다시 요청한다.
          if (entry.status === "ready") cacheRef.current.set(contentId, entry);
          return entry;
        })
        .finally(() => pendingRef.current.delete(contentId));
      pendingRef.current.set(contentId, request);
    }

    void request.then((entry) => {
      if (!cancelled) setActive({ ...entry, contentId });
    });
    return () => { cancelled = true; };
  }, [celebId, contentId, enabled, retryToken]);

  const retry = useCallback(() => {
    if (!enabled || !contentId) return;
    cacheRef.current.delete(contentId);
    setActive((current) => current?.contentId === contentId ? null : current);
    setRetryToken((current) => current + 1);
  }, [contentId, enabled]);

  const current = active?.contentId === contentId ? active : null;
  return {
    record: current?.status === "ready" ? current.item : null,
    isLoading: enabled && !!contentId && current === null,
    hasError: enabled && current?.status === "failed",
    retry,
  };
}
