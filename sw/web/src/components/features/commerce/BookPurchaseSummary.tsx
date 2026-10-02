"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AFFILIATE_PLATFORMS, BOOK_PURCHASE_LABEL_STYLE, BOOK_PURCHASE_OPENER_STYLE, type AffiliateLink } from "@/constants/affiliatePlatforms";
import { getEnglishBookPurchaseLinks } from "@/lib/books/amazonBookSearch";
import { getBookPurchaseHref } from "@/lib/books/bookPurchaseHref";
import { aladinBookLink, coupangBookLink, kyoboBookLink } from "@/lib/books/bookPurchaseRedirect";
import { isYes24PurchaseRequest } from "@/lib/books/yes24Purchase";
import { trackEvent } from "@/lib/analytics/track";
import { cn } from "@/lib/utils";

// 서점 선택창과 판매 정보 조회는 버튼을 누를 때만 불러온다.
const BookPurchaseModal = dynamic(() => import("./BookPurchaseModal"), { ssr: false });

interface BookPurchaseSummaryProps {
  /** 구매 대상 판본의 언어. 화면 언어가 달라도 같은 판본으로 연결한다. */
  bookLocale?: 'ko' | 'en';
  /** 우리 작품 — YES24 경유 주소와 판매 정보를 얻는다 */
  contentId?: string;
  /** 고른 판본. 없으면 한국어 기본 판본으로 잡는다 */
  editionId?: number;
  /** 외부 차트 항목처럼 우리 작품이 아닐 때 — ISBN으로 곧바로 조회한다 */
  isbn?: string;
  /** 선택창의 작품 표시와 서점 검색에 쓸 책 이름·저자 */
  title?: string | null;
  creator?: string | null;
  /** 현재 화면에서 선택한 판본의 표지 */
  thumbnail?: string | null;
  /** 보유 서점 링크 — 쿠팡·아마존·교보·알라딘 등. 언어가 다른 링크는 걸러낸다 */
  links?: readonly AffiliateLink[];
  /** 우리 작품이 아닌 외부 항목의 YES24 직통 주소(제휴 주소 우선) */
  yes24Href?: string;
  /** 켜기 조건 — 도서 판매대에서만 true로 넘긴다 */
  enabled?: boolean;
  /** 기본은 칸 전체 폭. 작은 단추가 필요한 자리만 false로 지정한다 */
  full?: boolean;
  className?: string;
  /** 단추에 덧붙일 클래스 — 자리마다 정렬·여백을 맞춘다 */
  chipClassName?: string;
}

function isPurchaseUrl(url: string) {
  // 서점 주소는 외부 http(s), 우리 구매 경유 주소(/api/books/purchase)는 슬래시 시작이다
  return url.startsWith("https://") || url.startsWith("http://") || url.startsWith("/");
}

export default function BookPurchaseSummary({
  bookLocale,
  contentId,
  editionId,
  isbn,
  title,
  creator,
  thumbnail,
  links: existingLinks = [],
  yes24Href,
  enabled = true,
  full = true,
  className,
  chipClassName,
}: BookPurchaseSummaryProps) {
  const displayLocale = useLocale();
  const locale = bookLocale ?? displayLocale;
  const pathname = usePathname();
  const tAccess = useTranslations("content.access");
  const [isOpen, setIsOpen] = useState(false);

  const closeModal = useCallback(() => setIsOpen(false), []);

  /* 구매 링크 — 한국어는 YES24 경유 주소를 맨 앞에 두고 교보문고·보유 서점을 잇는다.
     영어는 아마존(상품 주소가 없으면 검색)이 기준이다 */
  const links = useMemo<AffiliateLink[]>(() => {
    if (!enabled) return [];
    const usable = existingLinks.filter(
      (link, index, all) =>
        AFFILIATE_PLATFORMS[link.platform]?.locale === locale &&
        isPurchaseUrl(link.url) &&
        // 같은 서점이 겹쳐 실리면(판본 링크+작품 링크) 앞의 것만 남긴다
        all.findIndex((other) => other.platform === link.platform) === index,
    );
    if (locale === "ko") {
      // 경유 주소는 우리 작품(UUID)만 만든다 — 차트 항목의 yes24-… 같은 외부 id는 경유가 못 푼다
      const ownId = contentId && isYes24PurchaseRequest(contentId, "ko", editionId) ? contentId : undefined;
      const yes24 = yes24Href
        ? { platform: "yes24" as const, url: yes24Href }
        : ownId
          ? { platform: "yes24" as const, url: getBookPurchaseHref(ownId, editionId, "yes24") }
          : usable.find((link) => link.platform === "yes24");
      const kyobo = usable.find((link) => link.platform === "kyobo")
        ?? (ownId
          ? { platform: "kyobo" as const, url: getBookPurchaseHref(ownId, editionId, "kyobo") }
          : kyoboBookLink({ isbn, title, creator }));
      // 쿠팡·알라딘 — 머천트 승인을 기다리는 동안은 수수료 없는 일반 링크로 먼저 선다.
      // 우리 작품은 경유가 저장 ISBN을 풀고, 차트 항목은 ISBN·제목 검색으로 잇는다
      const coupang = usable.find((link) => link.platform === "coupang")
        ?? (ownId
          ? { platform: "coupang" as const, url: getBookPurchaseHref(ownId, editionId, "coupang"), linkKind: "search" as const }
          : coupangBookLink({ isbn, title, creator }));
      const aladin = usable.find((link) => link.platform === "aladin")
        ?? (ownId
          ? { platform: "aladin" as const, url: getBookPurchaseHref(ownId, editionId, "aladin") }
          : aladinBookLink({ isbn, title, creator }));
      return [
        ...(yes24 ? [yes24] : []),
        ...(kyobo ? [kyobo] : []),
        ...(coupang ? [coupang] : []),
        ...(aladin ? [aladin] : []),
        ...usable.filter((link) => link.platform !== "yes24" && link.platform !== "kyobo" && link.platform !== "coupang" && link.platform !== "aladin"),
      ];
    }
    return getEnglishBookPurchaseLinks({ locale, title, creator, isbn, links: usable });
  }, [enabled, existingLinks, locale, yes24Href, contentId, editionId, isbn, title, creator]);

  if (!enabled || !links.length) return null;

  return (
    <div className={cn("@container/purchase min-w-0", className)}>
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsOpen(true);
            trackEvent("commerce_open", { screen: pathname, locale, store_count: links.length,
              ...(contentId !== undefined && { content_id: contentId }),
              ...(editionId !== undefined && { edition_id: editionId }) });
          }}
          className={cn(
            "group/purchase relative flex h-11 cursor-pointer items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-md border px-1 [--purchase-label-scale:1.04] focus-visible:outline-none focus-visible:ring-2 @min-[160px]/purchase:gap-3 @min-[160px]/purchase:px-3 @min-[160px]/purchase:[--purchase-label-scale:1.07]",
            BOOK_PURCHASE_OPENER_STYLE,
            full ? "w-full" : "mx-auto w-fit max-w-full", chipClassName,
          )}
        >
          <span className={cn(BOOK_PURCHASE_LABEL_STYLE, "shrink-0 text-[13px] font-semibold @min-[160px]/purchase:text-[15px]")}>
            {tAccess("open")}
          </span>
          <span className="hidden items-center gap-2 border-s border-purchase-ink/30 ps-3 text-xs font-normal text-purchase-ink @min-[360px]/purchase:flex">
            {links.map((link) => (
              <span key={link.platform} className="whitespace-nowrap">
                {AFFILIATE_PLATFORMS[link.platform].label}
              </span>
            ))}
          </span>
        </button>
      {isOpen && <BookPurchaseModal bookLocale={bookLocale} title={title} creator={creator} thumbnail={thumbnail} isbn={isbn} links={links} onClose={closeModal} tracking={{ contentId, editionId }} />}
    </div>
  );
}
