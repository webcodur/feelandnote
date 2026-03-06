/*
  영문 표지 배치 조회 훅
  - contentId로 thumbnail_en을 조회 (thumbnailEn prop이 없을 때만)
  - useCelebCount와 동일한 배치 + 캐시 패턴
*/
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

// 모듈 레벨 상태 (싱글톤)
let thumbQueue: string[] = [];
let thumbResolvers = new Map<string, ((url: string | null) => void)[]>();
let thumbTimer: ReturnType<typeof setTimeout> | null = null;
const thumbCache = new Map<string, string | null>();

function requestThumbnailEn(contentId: string): Promise<string | null> {
  if (thumbCache.has(contentId)) {
    return Promise.resolve(thumbCache.get(contentId)!);
  }

  return new Promise((resolve) => {
    thumbQueue.push(contentId);
    const existing = thumbResolvers.get(contentId) || [];
    existing.push(resolve);
    thumbResolvers.set(contentId, existing);

    if (!thumbTimer) {
      thumbTimer = setTimeout(async () => {
        const ids = [...new Set(thumbQueue)];
        const resolvers = new Map(thumbResolvers);
        thumbQueue = [];
        thumbResolvers = new Map();
        thumbTimer = null;

        try {
          const supabase = createClient();
          const { data } = await (supabase as any)
            .from("content_locales")
            .select("content_id, thumbnail_url")
            .in("content_id", ids)
            .eq("locale", "en") as { data: { content_id: string; thumbnail_url: string | null }[] | null };

          const map = new Map<string, string | null>();
          for (const row of data ?? []) {
            map.set(row.content_id, row.thumbnail_url ?? null);
          }

          for (const [id, resolverList] of resolvers) {
            const url = map.get(id) ?? null;
            thumbCache.set(id, url);
            for (const resolver of resolverList) {
              resolver(url);
            }
          }
        } catch {
          for (const resolverList of resolvers.values()) {
            for (const resolver of resolverList) {
              resolver(null);
            }
          }
        }
      }, 16);
    }
  });
}

/**
 * BOOK 타입 contentId로 thumbnail_en을 조회한다.
 * propValue가 이미 있으면 DB 조회를 스킵하고 propValue를 반환한다.
 */
export function useEditionThumbnail(
  contentId: string | undefined,
  contentType: string,
  propValue?: string | null
): string | null {
  const [thumbnailEn, setThumbnailEn] = useState<string | null>(propValue ?? null);

  const shouldFetch = contentType === "BOOK" && !!contentId && propValue === undefined;

  useEffect(() => {
    if (!shouldFetch) return;
    requestThumbnailEn(contentId!).then(setThumbnailEn);
  }, [shouldFetch, contentId]);

  // prop이 전달되면 prop 우선
  if (propValue !== undefined) return propValue ?? null;
  return thumbnailEn;
}
