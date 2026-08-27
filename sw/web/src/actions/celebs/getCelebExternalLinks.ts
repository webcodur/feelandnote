import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";

import {
  buildCelebExternalLinks,
  type WikidataExternalLinkEntity,
  wikidataLink,
} from "@/lib/celeb/externalLinks";
import { spreadRevalidate, STATIC_REVALIDATE } from "@/lib/cache";
import type { CelebExternalLink } from "@/types/celebExternalLinks";

interface WikidataEntityResponse {
  entities?: {
    [qid: string]: WikidataExternalLinkEntity | undefined;
  };
}

async function fetchExternalLinks(
  qid: string,
  locale: string,
): Promise<CelebExternalLink[]> {
  const response = await fetch(
    `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`,
    {
      headers: {
        "user-agent": "FeelandnoteBot/1.0 (https://feelandnote.com)",
      },
      signal: AbortSignal.timeout(5000),
    },
  );
  if (!response.ok) {
    throw new Error(`Wikidata ${qid} 응답 ${response.status}`);
  }

  const payload = await response.json() as WikidataEntityResponse;
  const entity = payload.entities?.[qid];
  if (!entity) throw new Error(`Wikidata ${qid} 항목 없음`);
  return buildCelebExternalLinks(entity, qid, locale);
}

async function getCelebExternalLinksInner(
  qid: string | null | undefined,
  locale: string,
): Promise<CelebExternalLink[]> {
  if (!qid || !/^Q\d+$/.test(qid)) return [];
  const cacheKey = ["celeb-external-links-v1", qid, locale];
  const run = unstable_cache(
    () => fetchExternalLinks(qid, locale),
    cacheKey,
    { revalidate: spreadRevalidate(STATIC_REVALIDATE, cacheKey) },
  );

  try {
    return await run();
  } catch (error) {
    console.error(`${qid} 외부 링크 조회 실패 — 위키데이터 링크만 표시:`, error);
    const fallback = wikidataLink(qid);
    return fallback ? [fallback] : [];
  }
}

export const getCelebExternalLinks = cache(getCelebExternalLinksInner);
