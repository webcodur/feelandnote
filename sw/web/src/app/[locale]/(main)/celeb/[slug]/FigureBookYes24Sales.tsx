/* ─────────────────────────────────────────────
 * [celeb 상세] sourceWorks — 고른 판본의 YES24 판매 정보
 * - 목차 위치: sourceWorks
 * - 데이터: getYes24SalesInfo(작품·판본). 한국어 화면에서 고른 책 하나만 조회한다
 * - 함께 보기: FigureBookFeature.tsx, FigureBookActions.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getYes24SalesInfo } from "@/actions/contents/getYes24PurchaseLink";
import AnimatedHeight from "@/components/ui/AnimatedHeight";
import type { Yes24SalesInfo } from "@/lib/books/yes24Purchase";

interface FigureBookYes24SalesProps {
  contentId: string;
  editionId: number;
  /** 한국어 화면의 ISBN 있는 도서만 켠다. 영어 화면의 Amazon은 판매 정보를 받을 길이 아직 없다 */
  enabled: boolean;
  className: string;
}

// 작품을 오가며 다시 고른 판본은 요청 하나를 공유한다. 실패는 다시 물을 수 있게 지운다.
const requests = new Map<string, Promise<Yes24SalesInfo | null>>();

function requestSales(contentId: string, editionId: number): Promise<Yes24SalesInfo | null> {
  const key = `${contentId}:${editionId}`;
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

export default function FigureBookYes24Sales({
  contentId,
  editionId,
  enabled,
  className,
}: FigureBookYes24SalesProps) {
  const locale = useLocale();
  const t = useTranslations("celebPage");
  const key = `${contentId}:${editionId}`;
  const [result, setResult] = useState<{ key: string; sales: Yes24SalesInfo | null } | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    requestSales(contentId, editionId).then((sales) => {
      if (active) setResult({ key, sales });
    });
    return () => {
      active = false;
    };
  }, [contentId, editionId, enabled, key]);

  const sales = enabled && result?.key === key ? result.sales : null;
  const number = new Intl.NumberFormat(locale);
  const discount = sales?.salePrice != null && sales.shopPrice
    ? Math.round((1 - sales.salePrice / sales.shopPrice) * 100)
    : 0;

  // 팔리지 않는 판본이면 빈 칸이다. 칸은 격자 줄 수를 지키려고 늘 둔다.
  return (
    <AnimatedHeight independent duration={320} className={className}>
      {sales && (
        <div
          role="group"
          aria-label={t("sourceWorkSalesLabel")}
          className="mx-auto mt-3 flex w-fit max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-md border border-accent-dim/40 bg-bg-secondary/60 px-3 py-1.5 text-sm text-text-tertiary"
        >
          <span className="inline-flex items-center gap-1.5 font-bold text-blue-200">
            <span className="size-1.5 rounded-full bg-blue-400" aria-hidden />
            {t("sourceWorkSalesOnSale")}
          </span>
          {sales.salePoint ? (
            <span className="inline-flex items-baseline gap-1">
              {t("sourceWorkSalesPoint")}
              <strong className="font-black tabular-nums text-accent">{number.format(sales.salePoint)}</strong>
            </span>
          ) : null}
          {sales.starScore ? (
            <span className="inline-flex items-center gap-1">
              <Star size={13} className="fill-current text-accent" aria-hidden />
              {t("sourceWorkSalesRating")}
              <strong className="font-bold tabular-nums text-text-primary">{sales.starScore}</strong>
            </span>
          ) : null}
          {sales.salePrice != null ? (
            <span className="inline-flex items-baseline gap-1">
              <strong className="font-bold tabular-nums text-text-primary">
                {t("sourceWorkSalesPrice", { price: number.format(sales.salePrice) })}
              </strong>
              {discount > 0 && (
                <span className="font-bold tabular-nums text-accent">{t("sourceWorkSalesDiscount", { rate: discount })}</span>
              )}
            </span>
          ) : null}
        </div>
      )}
    </AnimatedHeight>
  );
}
