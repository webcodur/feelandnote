"use client";

import { useLocale } from "next-intl";
import { ArrowUpRight, BookOpen, Gamepad2 } from "lucide-react";
import { isDeveloperMode } from "@/lib/developer-mode";
import { PLATFORM_LINKS } from "@/constants/platformLinks";
import type { JourneyTarget } from "./prototype/catalog";
import { getVerifiedGameProduct } from "./targetProducts";

/** 화면이 넘긴 현재 대상만 사용한다. 관련 도서 검색을 특정 상품처럼 표시하지 않는다. */
export default function DeveloperCommerceFallback({ target, placement, context }: {
  target: JourneyTarget; placement: string; context?: string;
}) {
  const locale = useLocale();
  if (!isDeveloperMode() || locale !== "ko" || !target.title.trim() || target.type === "MUSIC") return null;
  const game = target.type === "GAME";
  const book = target.type === "BOOK";
  const gameProduct = game ? getVerifiedGameProduct(target, { includePreview: true }) : null;
  if (game && !gameProduct) return null;
  const query = [target.title, book || game ? target.creator : null].filter(Boolean).join(" ");
  const href = game ? gameProduct!.productUrl
    : PLATFORM_LINKS.BOOK.find((platform) => platform.key === "yes24")!.buildUrl({ id: "", externalId: encodeURIComponent(query), title: target.title });
  const Icon = game ? Gamepad2 : BookOpen;
  const label = game ? "쿠팡에서 보기" : book ? "판본 찾기" : "관련 도서 찾기";
  const detail = game ? `${gameProduct!.format} 상품을 확인하세요.`
    : book ? "번역자·출판사·완역 여부를 비교하세요." : "현재 주제의 도서 검색입니다. 개별 책과의 관계는 아직 확인 전입니다.";

  return <aside data-commerce-fallback={placement} data-commerce-context={target.title}
    className="my-4 border-y border-white/10 py-3 text-text-primary">
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 sm:px-4">
      <Icon size={18} className="shrink-0 text-accent" aria-hidden />
      <div className="min-w-0 flex-1 basis-40">
        <p className="break-keep text-sm font-medium">{context ?? target.title}</p>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">{detail}</p>
      </div>
      <a href={href} target="_blank" rel="noopener noreferrer nofollow"
        className="inline-flex min-h-11 items-center gap-1 rounded-md border border-white/15 px-3 text-xs font-semibold text-accent outline-none hover:border-accent hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-accent">
        {label}<ArrowUpRight size={13} aria-hidden />
      </a>
    </div>
    <p className="mt-2 px-3 text-[10px] text-text-tertiary sm:px-4">개발자 모형 · {game ? "확인한 쿠팡 상품" : "YES24 검색"}</p>
  </aside>;
}
