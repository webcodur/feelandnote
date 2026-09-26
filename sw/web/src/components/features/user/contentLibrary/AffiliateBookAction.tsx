"use client";

import { memo } from "react";

import { AFFILIATE_PLATFORMS, BOOK_PURCHASE_BUTTON_STYLES } from "@/constants/affiliatePlatforms";
import { getBookPurchaseHref } from "@/lib/books/bookPurchaseHref";
import { aladinBookLink, coupangBookLink, isAffiliatePurchaseLink, kyoboBookLink } from "@/lib/books/bookPurchaseRedirect";
import { isYes24PurchaseRequest } from "@/lib/books/yes24Purchase";
import Yes24Sales from "@/components/features/commerce/Yes24Sales";
import { cn } from "@/lib/utils";

interface AffiliateBookActionProps {
  className?: string;
  contentId: string;
  editionId?: number;
  coupangUrl?: string | null;
  /** 우리 작품이 아닌 외부 차트 항목처럼 구매 경로를 거칠 수 없을 때 YES24 단추가 곧바로 여는 주소(제휴 주소 우선) */
  yes24Href?: string;
  /** 우리 작품이 아닌 외부 차트 항목 — 판매 정보를 저장 판본 대신 이 ISBN으로 조회한다 */
  salesIsbn?: string;
  /** 격자 카드 아래처럼 폭이 좁은 자리에 맞춘 작은 단추 */
  compact?: boolean;
  /** 판매 정보를 이미 보여 주는 자리(연관 작품 대표 카드)에서는 단추 위 칸을 뺀다 */
  hideSales?: boolean;
}

function AffiliateBookAction({
  className,
  contentId,
  editionId,
  coupangUrl,
  yes24Href,
  salesIsbn,
  compact = false,
  hideSales = false,
}: AffiliateBookActionProps) {
  /* 교보문고 — 우리 작품은 경유 주소가 저장 ISBN을 바코드 상품으로 잇고,
     외부 차트 항목(비UUID id)은 차트가 준 ISBN으로 곧바로 잇는다. 둘 다 없으면 단추를 세우지 않는다 */
  const kyobo = isYes24PurchaseRequest(contentId, "ko", editionId)
    ? { platform: "kyobo" as const, url: getBookPurchaseHref(contentId, editionId, "kyobo") }
    : kyoboBookLink({ isbn: salesIsbn });
  /* 쿠팡·알라딘 — 머천트 승인을 기다리는 동안은 수수료 없는 일반 링크로 먼저 선다.
     우리 작품은 경유가 저장 ISBN을 풀고, 차트 항목은 차트가 준 ISBN으로 곧바로 잇는다 */
  const coupang = coupangUrl && coupangUrl.startsWith("https://")
    ? { platform: "coupang" as const, url: coupangUrl }
    : isYes24PurchaseRequest(contentId, "ko", editionId)
      ? { platform: "coupang" as const, url: getBookPurchaseHref(contentId, editionId, "coupang") }
      : coupangBookLink({ isbn: salesIsbn });
  const aladin = isYes24PurchaseRequest(contentId, "ko", editionId)
    ? { platform: "aladin" as const, url: getBookPurchaseHref(contentId, editionId, "aladin") }
    : aladinBookLink({ isbn: salesIsbn });
  const sellers = 1 + (kyobo ? 1 : 0) + (coupang ? 1 : 0) + (aladin ? 1 : 0);
  const radius = compact ? "rounded-md" : "rounded-lg";
  /* 판매처가 둘 이상이면 한 틀을 세로선으로 가르지 않고 틈을 둔 낱개 칩으로 띄운다 — 칩마다 판매처 색 테두리가 선다.
     수수료 안내(ⓘ)는 단추 안에 묻지 않고 구획 머리말에 둔다(BookPurchaseInfo) */
  const buttonClass = cn(
    "flex min-h-11 min-w-0 items-center justify-center px-2 py-2 text-center text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
    sellers > 1 && ["border", radius],
  );

  return (
    <div className={cn("relative min-w-0", className)} data-testid="content-affiliate-action">
      {/* YES24 판매 정보 — 단추 위의 값표 칸. 한국어가 아니거나 팔리지 않으면 스스로 빈 칸이 된다 */}
      {!hideSales && <Yes24Sales contentId={contentId} editionId={editionId} isbn={salesIsbn} yes24Href={yes24Href} full className="mb-1.5" />}
      <div className={cn(
        "relative grid",
        sellers > 1
          ? ["gap-1", sellers === 3 ? "grid-cols-3" : "grid-cols-2"]
          : ["grid-cols-1 overflow-hidden border border-white/15", radius],
      )}>
        <a
          href={yes24Href ?? getBookPurchaseHref(contentId, editionId, "yes24")}
          target="_blank"
          rel="noopener noreferrer nofollow sponsored"
          data-testid="content-affiliate-link"
          onClick={(event) => event.stopPropagation()}
          className={cn(buttonClass, BOOK_PURCHASE_BUTTON_STYLES.yes24)}
        >
          {AFFILIATE_PLATFORMS.yes24.label}
        </a>
        {kyobo && (
          <a
            href={kyobo.url}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            onClick={(event) => event.stopPropagation()}
            className={cn(buttonClass, BOOK_PURCHASE_BUTTON_STYLES.kyobo)}
          >
            {AFFILIATE_PLATFORMS.kyobo.label}
          </a>
        )}
        {coupang && (
          <a
            href={coupang.url}
            target="_blank"
            rel={isAffiliatePurchaseLink(coupang) ? "noopener noreferrer nofollow sponsored" : "noopener noreferrer"}
            onClick={(event) => event.stopPropagation()}
            className={cn(buttonClass, BOOK_PURCHASE_BUTTON_STYLES.coupang)}
          >
            {AFFILIATE_PLATFORMS.coupang.label}
          </a>
        )}
        {aladin && (
          <a
            href={aladin.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className={cn(buttonClass, BOOK_PURCHASE_BUTTON_STYLES.aladin)}
          >
            {AFFILIATE_PLATFORMS.aladin.label}
          </a>
        )}
      </div>
    </div>
  );
}

export default memo(AffiliateBookAction);
