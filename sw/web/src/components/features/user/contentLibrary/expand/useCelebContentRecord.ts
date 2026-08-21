"use client";

import { useEffect, useRef, useState } from "react";

import { getPublicCelebContentRecord } from "@/actions/contents/getCelebContentExpand";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";
import { mapPublicToUserContent } from "../contentLibraryTypes";

type RecordEntry =
  | { status: "ready"; item: UserContentWithContent | null }
  | { status: "failed"; item: null };

type ActiveEntry = RecordEntry & { contentId: string };

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

  useEffect(() => {
    if (!enabled || !celebId || !contentId) return;
    let cancelled = false;
    const cached = cacheRef.current.get(contentId);
    let request = cached ? Promise.resolve(cached) : pendingRef.current.get(contentId);

    if (!request) {
      request = getPublicCelebContentRecord(celebId, contentId)
        .then((record): RecordEntry => ({
          status: "ready",
          item: record ? mapPublicToUserContent([record], celebId)[0] : null,
        }))
        .catch((error): RecordEntry => {
          console.error("[useCelebContentRecord]", contentId, error);
          return { status: "failed", item: null };
        })
        .then((entry) => {
          cacheRef.current.set(contentId, entry);
          return entry;
        })
        .finally(() => pendingRef.current.delete(contentId));
      pendingRef.current.set(contentId, request);
    }

    void request.then((entry) => {
      if (!cancelled) setActive({ ...entry, contentId });
    });
    return () => { cancelled = true; };
  }, [celebId, contentId, enabled]);

  const current = active?.contentId === contentId ? active : null;
  return {
    record: current?.status === "ready" ? current.item : null,
    isLoading: enabled && !!contentId && current === null,
  };
}
