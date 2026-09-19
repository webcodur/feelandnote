/* ─────────────────────────────────────────────
 * [공통] YES24 판매 정보 조회 — 요청 캐시 + 훅
 * - 데이터: getYes24SalesInfo(작품·판본) / getYes24SalesInfoByIsbn(외부 ISBN)
 * - 값표(Yes24Sales)와 구매 모듈(BookPurchaseSummary)이 같은 캐시를 나눠 쓴다
 * ───────────────────────────────────────────── */
"use client";

import { useEffect, useState } from "react";
import { getYes24SalesInfo, getYes24SalesInfoByIsbn } from "@/actions/contents/getYes24PurchaseLink";
import type { Yes24SalesInfo } from "@/lib/books/yes24Purchase";

// 같은 판본을 여러 판매대가 물어도 요청 하나를 공유한다. 실패는 다시 물을 수 있게 지운다.
const requests = new Map<string, Promise<Yes24SalesInfo | null>>();

function remember(key: string, request: Promise<Yes24SalesInfo | null>) {
  requests.set(key, request);
  if (requests.size > 100) requests.delete(requests.keys().next().value!);
  return request;
}

export function requestYes24Sales(contentId: string, editionId?: number): Promise<Yes24SalesInfo | null> {
  const key = `${contentId}:${editionId ?? "default"}`;
  return requests.get(key) ?? remember(key, getYes24SalesInfo(contentId, "ko", editionId).catch(() => {
    requests.delete(key);
    return null;
  }));
}

export function requestYes24SalesByIsbn(isbn: string): Promise<Yes24SalesInfo | null> {
  const key = `isbn:${isbn}`;
  return requests.get(key) ?? remember(key, getYes24SalesInfoByIsbn(isbn).catch(() => {
    requests.delete(key);
    return null;
  }));
}

interface UseYes24SalesOptions {
  contentId?: string;
  editionId?: number;
  /** 외부 차트 항목처럼 우리 작품이 아닐 때 — ISBN으로 곧바로 조회한다 */
  isbn?: string;
  /** 조회 스위치 — 한국어 도서 판매대에서만 true로 넘긴다 */
  active: boolean;
}

/** 판매 정보를 불러온다. active가 꺼져 있으면 아무것도 묻지 않고 null을 돌려준다 */
export function useYes24Sales({ contentId, editionId, isbn, active }: UseYes24SalesOptions) {
  const key = isbn ? `isbn:${isbn}` : `${contentId}:${editionId ?? "default"}`;
  const [result, setResult] = useState<{ key: string; sales: Yes24SalesInfo | null } | null>(null);

  useEffect(() => {
    if (!active || (isbn == null && contentId == null)) return;
    let alive = true;
    const request = isbn ? requestYes24SalesByIsbn(isbn) : requestYes24Sales(contentId!, editionId);
    request.then((sales) => {
      if (alive) setResult({ key, sales });
    });
    return () => {
      alive = false;
    };
  }, [contentId, editionId, isbn, active, key]);

  return active && result?.key === key ? result.sales : null;
}
