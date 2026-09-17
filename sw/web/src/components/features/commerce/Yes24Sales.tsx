/* ─────────────────────────────────────────────
 * [공통] 도서 판매대의 YES24 판매 정보
 * - 데이터: getYes24SalesInfo(작품·판본). 한국어 화면에서만 조회한다
 * - 모양: 「평점 9.3 | 22,500원」 한 줄 값표. 팔리지 않는 판본이면 빈 칸이다
 * - 누르면 YES24 제공 안내·상세 값·YES24 구매 단추를 담은 창(Yes24SalesModal)이 뜬다
 * - 함께 보기: AffiliateBookAction.tsx, ContentInfoSection.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getYes24SalesInfo, getYes24SalesInfoByIsbn } from "@/actions/contents/getYes24PurchaseLink";
import AnimatedHeight from "@/components/ui/AnimatedHeight";
import { cn } from "@/lib/utils";
import type { Yes24SalesInfo } from "@/lib/books/yes24Purchase";

/* 값표는 목록 카드마다 붙는다. 창은 누를 때만 불러오고, 구매 단추(AffiliateBookAction)가 다시 값표를 import하는 순환도 끊는다 */
const Yes24SalesModal = dynamic(() => import("./Yes24SalesModal"), { ssr: false });

interface Yes24SalesProps {
  /** 우리 작품 — 저장 판본의 ISBN으로 조회한다. isbn을 넘기면 이 값은 쓰지 않는다 */
  contentId?: string;
  /** 고른 판본. 없으면 한국어 기본 판본으로 잡는다 */
  editionId?: number;
  /** 외부 차트 항목처럼 우리 작품이 아닐 때 — ISBN으로 곧바로 조회한다 */
  isbn?: string;
  /** 켜기 조건 — 한국어 도서 판매대에서만 true로 넘긴다 */
  enabled?: boolean;
  /** 카드 위에 붙을 때는 YES24 단추와 같은 폭으로 늘린다 */
  full?: boolean;
  /** 외부 차트 항목 — 창 안 구매 단추가 곧바로 여는 서점 주소(제휴 주소 우선) */
  yes24Href?: string;
  className?: string;
}

// 같은 판본을 여러 판매대가 물어도 요청 하나를 공유한다. 실패는 다시 물을 수 있게 지운다.
const requests = new Map<string, Promise<Yes24SalesInfo | null>>();

function requestSales(contentId: string, editionId?: number): Promise<Yes24SalesInfo | null> {
  const key = `${contentId}:${editionId ?? "default"}`;
  const existing = requests.get(key);
  if (existing) return existing;
  const request = getYes24SalesInfo(contentId, "ko", editionId).catch(() => {
    requests.delete(key);
    return null;
  });
  requests.set(key, request);
  if (requests.size > 100) requests.delete(requests.keys().next().value!);
  return request;
}

function requestSalesByIsbn(isbn: string): Promise<Yes24SalesInfo | null> {
  const key = `isbn:${isbn}`;
  const existing = requests.get(key);
  if (existing) return existing;
  const request = getYes24SalesInfoByIsbn(isbn).catch(() => {
    requests.delete(key);
    return null;
  });
  requests.set(key, request);
  if (requests.size > 100) requests.delete(requests.keys().next().value!);
  return request;
}

export default function Yes24Sales({
  contentId,
  editionId,
  isbn,
  enabled = true,
  full = false,
  yes24Href,
  className,
}: Yes24SalesProps) {
  const locale = useLocale();
  const t = useTranslations("content.purchaseSales");
  const active = enabled && locale === "ko" && (isbn != null || contentId != null);
  const key = isbn ? `isbn:${isbn}` : `${contentId}:${editionId ?? "default"}`;
  const [result, setResult] = useState<{ key: string; sales: Yes24SalesInfo | null } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    const request = isbn ? requestSalesByIsbn(isbn) : requestSales(contentId!, editionId);
    request.then((sales) => {
      if (alive) setResult({ key, sales });
    });
    return () => {
      alive = false;
    };
  }, [contentId, editionId, isbn, active, key]);

  const sales = active && result?.key === key ? result.sales : null;
  const number = new Intl.NumberFormat(locale);
  const hasRating = Boolean(sales?.starScore);
  const hasPrice = sales?.salePrice != null;

  // 팔리지 않는 판본이면 빈 칸이다. 칸은 격자 줄 수를 지키려고 늘 둔다.
  return (
    <AnimatedHeight independent duration={320} className={className}>
      {sales && (hasRating || hasPrice) && (
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          title={t("open")}
          onClick={(event) => {
            // 카드·펼침 안에 붙는 값표다 — 누름이 바깥 링크·카드 토글로 번지지 않게 막는다
            event.preventDefault();
            event.stopPropagation();
            setIsOpen(true);
          }}
          className={cn(
            "flex cursor-pointer items-center justify-center gap-2.5 rounded-md border border-accent-dim/40 bg-bg-secondary/60 px-3 py-1.5 text-sm text-text-tertiary hover:border-accent/70 hover:bg-accent/10 active:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            full ? "w-full" : "mx-auto w-fit max-w-full",
          )}
        >
          {hasRating && (
            <span className="inline-flex items-center gap-1">
              <Star size={13} className="fill-current text-accent" aria-hidden />
              <strong className="font-bold tabular-nums text-text-primary">{sales!.starScore}</strong>
            </span>
          )}
          {hasRating && hasPrice && <span className="text-white/20" aria-hidden>|</span>}
          {hasPrice && (
            <strong className="font-bold tabular-nums text-text-primary">
              {t("price", { price: number.format(sales!.salePrice!) })}
            </strong>
          )}
          <span className="sr-only">{t("open")}</span>
        </button>
      )}
      {isOpen && sales && (
        <Yes24SalesModal contentId={contentId ?? ""} editionId={editionId} yes24Href={yes24Href} sales={sales} onClose={() => setIsOpen(false)} />
      )}
    </AnimatedHeight>
  );
}
