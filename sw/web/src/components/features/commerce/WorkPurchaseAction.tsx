/*
  파일명: /components/features/commerce/WorkPurchaseAction.tsx
  기능: 작품 카드의 판매처 연결 단추
  책임: 도서는 같은 ISBN 상품으로 중계되는 /api/books/purchase 주소로,
        게임은 확인된 쿠팡 상품만 직접 연결한다.
        영문 판매 운영 전이라 한국어 화면에서만 표시한다.
*/ // ------------------------------

"use client";

import { useLocale } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { getBookPurchaseHref } from "@/lib/books/bookPurchaseHref";
import { getVerifiedGameProduct } from "./targetProducts";

export interface WorkPurchaseTarget {
  title: string;
  creator?: string | null;
  type: string;
  contentId?: string;
}

/** 작품 목록에서는 설명을 반복하지 않고 현재 작품의 판매처 확인만 제공한다. */
export default function WorkPurchaseAction({ target }: { target: WorkPurchaseTarget }) {
  const locale = useLocale();
  if (locale !== "ko" || !target.title.trim()) return null;
  const isBook = target.type === "BOOK";
  const isGame = target.type === "GAME";
  const isMusic = target.type === "MUSIC";
  if (!isBook && !isGame && !isMusic) return null;
  const gameProduct = isGame ? getVerifiedGameProduct(target) : null;
  if (isGame && !gameProduct) return null;
  const query = encodeURIComponent([target.title, target.creator].filter(Boolean).join(" "));
  const direct = isBook && !!target.contentId;
  const href = direct ? getBookPurchaseHref(target.contentId!, undefined, "yes24")
    : isGame ? gameProduct!.productUrl
    : `https://www.yes24.com/Product/Search?domain=${isBook ? "BOOK" : "ALL"}&query=${query}`;
  const label = isBook ? "YES24에서 보기" : isMusic ? "YES24에서 음반 찾기" : "쿠팡에서 보기";
  return <div className="mt-2">
    <a href={href} target="_blank" rel={`noopener noreferrer nofollow${direct ? " sponsored" : ""}`}
      className="flex min-h-11 items-center justify-center gap-1 whitespace-nowrap rounded-md border border-white/15 px-2 text-xs font-semibold text-accent outline-none hover:border-accent hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-accent">
      {label}<ArrowUpRight size={12} aria-hidden />
    </a>
  </div>;
}
