"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { AFFILIATE_PLATFORMS, type AffiliateLink } from "@/constants/affiliatePlatforms";
import { getBookPurchaseLinks } from "@/lib/books/bookPurchaseLinks";
import PurchaseOpener from "./PurchaseOpener";
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
  const [isOpen, setIsOpen] = useState(false);

  const closeModal = useCallback(() => setIsOpen(false), []);

  const links = useMemo(() => enabled ? getBookPurchaseLinks({
    locale, contentId, editionId, isbn, title, creator, links: existingLinks, yes24Href,
  }) : [], [enabled, existingLinks, locale, yes24Href, contentId, editionId, isbn, title, creator]);

  if (!enabled || !links.length) return null;

  return (
    <div className={cn("@container/purchase min-w-0", className)}>
      <PurchaseOpener type="BOOK" expanded={isOpen} full={full} className={chipClassName}
        stores={links.map(link => AFFILIATE_PLATFORMS[link.platform].label)}
        onOpen={() => {
          setIsOpen(true);
          trackEvent("commerce_open", { screen: pathname, locale: displayLocale, book_locale: locale, store_count: links.length,
            ...(contentId !== undefined && { content_id: contentId }),
            ...(editionId !== undefined && { edition_id: editionId }) });
        }} />
      {isOpen && <BookPurchaseModal bookLocale={bookLocale} title={title} creator={creator} thumbnail={thumbnail} isbn={isbn} links={links} onClose={closeModal} tracking={{ contentId, editionId }} />}
    </div>
  );
}
