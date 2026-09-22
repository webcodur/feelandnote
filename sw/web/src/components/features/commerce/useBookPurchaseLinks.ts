"use client";

import { useEffect, useState } from "react";
import { getYes24PurchaseLink } from "@/actions/contents/getYes24PurchaseLink";
import { AFFILIATE_PLATFORMS, type AffiliateLink } from "@/constants/affiliatePlatforms";
import { getEnglishBookPurchaseLinks } from "@/lib/books/amazonBookSearch";
import { getBookPurchaseHref } from "@/lib/books/bookPurchaseHref";
import { LINKPRICE_COUPANG_APPROVED } from "@/lib/books/bookPurchaseRedirect";
import { isYes24PurchaseRequest } from "@/lib/books/yes24Purchase";

const LINK_TTL_MS = 5 * 60 * 1000;
const EMPTY_TTL_MS = 30 * 1000;
type CachedLink = { link: AffiliateLink | null; expiresAt: number };
const cache = new Map<string, CachedLink>();
const pending = new Map<string, Promise<CachedLink>>();

function requestLink(key: string, contentId: string, locale: string, editionId?: number) {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached);
  const existing = pending.get(key);
  if (existing) return existing;

  const request = getYes24PurchaseLink(contentId, locale, editionId)
    .catch(() => null)
    .then((link) => {
      const entry = { link, expiresAt: Date.now() + (link ? LINK_TTL_MS : EMPTY_TTL_MS) };
      for (const [cacheKey, value] of cache) {
        if (value.expiresAt <= Date.now()) cache.delete(cacheKey);
      }
      if (cache.size >= 200) cache.delete(cache.keys().next().value!);
      cache.set(key, entry);
      return entry;
    })
    .finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

interface PurchaseOptions {
  contentId: string;
  locale: string;
  isBook: boolean;
  title?: string | null;
  creator?: string | null;
  editionId?: number;
  enabled?: boolean;
  existingLinks?: readonly AffiliateLink[];
}

function isPurchaseUrl(url: string) {
  try { return ["http:", "https:"].includes(new URL(url).protocol); }
  catch { return false; }
}

export function useBookPurchaseLinks({
  contentId, locale, isBook, title, creator, editionId, enabled = true, existingLinks = [],
}: PurchaseOptions): AffiliateLink[] {
  const useYes24 = isBook && locale === "ko";
  const key = enabled && useYes24 ? JSON.stringify([contentId, locale, editionId ?? null]) : "";
  const [result, setResult] = useState<(CachedLink & { key: string }) | null>(null);
  if (result && result.key !== key) setResult(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      const entry = await requestLink(key, contentId, locale, editionId);
      if (cancelled) return;
      setResult({ ...entry, key });
      if (entry.link) {
        timer = setTimeout(() => {
          setResult(null);
          void refresh();
        }, Math.max(1, entry.expiresAt - Date.now()));
      }
    };
    void refresh();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [key, contentId, locale, editionId]);

  const links = existingLinks.filter((link) =>
    AFFILIATE_PLATFORMS[link.platform]?.locale === locale && isPurchaseUrl(link.url) &&
    (!useYes24 || link.platform !== "yes24"),
  );
  // 책·판본을 바꾼 첫 렌더부터 이전 책의 구매 주소를 숨긴다.
  const yes24 = key && result?.key === key ? result.link : null;
  if (enabled && isBook && locale === "en") {
    return getEnglishBookPurchaseLinks({ locale, title, creator, links });
  }
  if (!enabled || !useYes24) return links;
  // 교보문고 — 저장 링크가 있으면 그것, 없으면 저장 ISBN을 푸는 경유 주소로 잇는다
  const kyobo = links.find((link) => link.platform === "kyobo")
    ?? (isYes24PurchaseRequest(contentId, locale, editionId)
      ? { platform: "kyobo" as const, url: getBookPurchaseHref(contentId, editionId, "kyobo") }
      : null);
  // 쿠팡 — 링크프라이스 승인 전까지 만들지 않는다
  const coupang = links.find((link) => link.platform === "coupang")
    ?? (LINKPRICE_COUPANG_APPROVED && isYes24PurchaseRequest(contentId, locale, editionId)
      ? { platform: "coupang" as const, url: getBookPurchaseHref(contentId, editionId, "coupang") }
      : null);
  return [
    ...(yes24 ? [yes24] : []),
    ...(kyobo ? [kyobo] : []),
    ...(coupang ? [coupang] : []),
    ...links.filter((link) => link.platform !== "kyobo" && link.platform !== "coupang"),
  ];
}
