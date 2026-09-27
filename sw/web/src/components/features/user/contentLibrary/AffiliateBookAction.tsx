"use client";

import { memo } from "react";

import type { AffiliateLink } from "@/constants/affiliatePlatforms";
import { getBookPurchaseHref } from "@/lib/books/bookPurchaseHref";
import { aladinBookLink, coupangBookLink, isAffiliatePurchaseLink, kyoboBookLink } from "@/lib/books/bookPurchaseRedirect";
import { isYes24PurchaseRequest } from "@/lib/books/yes24Purchase";
import Yes24Sales from "@/components/features/commerce/Yes24Sales";
import BookPurchaseLinks from "@/components/features/commerce/BookPurchaseLinks";
import { AccessDisclosure } from "@/components/features/commerce/AccessDialog";
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
  const yes24 = yes24Href ?? (isYes24PurchaseRequest(contentId, "ko", editionId) ? getBookPurchaseHref(contentId, editionId, "yes24") : null);
  const links: AffiliateLink[] = [
    ...(yes24 ? [{ platform: "yes24" as const, url: yes24 }] : []),
    ...(kyobo ? [kyobo] : []), ...(coupang ? [coupang] : []), ...(aladin ? [aladin] : []),
  ];

  return (
    <div className={cn("relative min-w-0 space-y-3", className)} data-testid="content-affiliate-action">
      {/* YES24 판매 정보 — 단추 위의 값표 칸. 한국어가 아니거나 팔리지 않으면 스스로 빈 칸이 된다 */}
      {!hideSales && <Yes24Sales contentId={contentId} editionId={editionId} isbn={salesIsbn} yes24Href={yes24Href} full className="mb-1.5" />}
      <BookPurchaseLinks links={links} tracking={{ contentId, editionId }} />
      <AccessDisclosure hasAffiliates={links.some(isAffiliatePurchaseLink)} />
    </div>
  );
}

export default memo(AffiliateBookAction);
