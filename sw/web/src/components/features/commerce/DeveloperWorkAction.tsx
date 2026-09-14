"use client";

import { useLocale } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { isDeveloperMode } from "@/lib/developer-mode";
import { getBookPurchaseHref } from "@/lib/books/bookPurchaseHref";
import type { JourneyTarget } from "./prototype/catalog";

/** 작품 목록에서는 설명을 반복하지 않고 현재 작품의 판매처 확인만 제공한다. */
export default function DeveloperWorkAction({ target }: { target: JourneyTarget }) {
  const locale = useLocale();
  if (!isDeveloperMode() || locale !== "ko" || !target.title.trim()) return null;
  const isBook = target.type === "BOOK";
  const isGame = target.type === "GAME";
  const isMusic = target.type === "MUSIC";
  if (!isBook && !isGame && !isMusic) return null;
  const query = encodeURIComponent([target.title, target.creator].filter(Boolean).join(" "));
  const href = isBook && target.contentId ? getBookPurchaseHref(target.contentId, undefined, "yes24")
    : isGame ? `https://www.coupang.com/np/search?q=${query}`
    : `https://www.yes24.com/Product/Search?domain=${isBook ? "BOOK" : "ALL"}&query=${query}`;
  return <div data-commerce-work={target.contentId ?? target.title} className="mt-2">
    <a href={href} target="_blank" rel="noopener noreferrer nofollow"
      className="flex min-h-11 items-center justify-center gap-1 rounded-md border border-white/15 px-2 text-xs font-semibold text-accent outline-none hover:border-accent hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-accent">
      {isBook ? "YES24에서 보기" : isMusic ? "음반 찾기" : "게임 패키지 찾기"}<ArrowUpRight size={12} aria-hidden />
    </a>
    <p className="mt-1 text-center text-[10px] text-text-tertiary">개발자 모형{!isBook && " · 판매처 검색"}</p>
  </div>;
}
