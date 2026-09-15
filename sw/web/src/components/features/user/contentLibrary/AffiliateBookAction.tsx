"use client";

import BookPurchaseInfo from "@/components/shared/BookPurchaseInfo";
import { memo } from "react";

import { AFFILIATE_PLATFORMS, BOOK_PURCHASE_BUTTON_STYLES } from "@/constants/affiliatePlatforms";
import { getBookPurchaseHref } from "@/lib/books/bookPurchaseHref";
import { cn } from "@/lib/utils";

interface AffiliateBookActionProps {
  className?: string;
  showNotice?: boolean;
  contentId: string;
  editionId?: number;
  coupangUrl?: string | null;
  /** 우리 작품이 아닌 외부 차트 항목처럼 구매 경로를 거칠 수 없을 때 YES24 단추가 곧바로 여는 주소(제휴 주소 우선) */
  yes24Href?: string;
  /** 격자 카드 아래처럼 폭이 좁은 자리에 맞춘 작은 단추 */
  compact?: boolean;
}

function AffiliateBookAction({
  className,
  showNotice = false,
  contentId,
  editionId,
  coupangUrl,
  yes24Href,
  compact = false,
}: AffiliateBookActionProps) {
  const hasCoupang = !!coupangUrl && coupangUrl.startsWith("https://");
  const radius = compact ? "rounded-md" : "rounded-lg";
  /* 판매처가 둘이면 한 틀을 세로선으로 가르지 않고 틈을 둔 낱개 칩으로 띄운다 — 칩마다 판매처 색 테두리가 선다.
     하나면 한 틀 안에 단추 하나를 두고 안내는 끝에 얹는다 */
  const buttonClass = cn(
    "flex min-h-11 min-w-0 items-center justify-center px-2 py-2 text-center text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset",
    hasCoupang && ["border", radius],
  );

  return (
    <div className={cn("relative min-w-0", className)} data-testid="content-affiliate-action">
      <div className={cn(
        "relative grid",
        hasCoupang
          ? ["gap-1", showNotice ? "grid-cols-[minmax(0,3fr)_minmax(0,3fr)_minmax(0,1fr)]" : "grid-cols-2"]
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
        {hasCoupang && (
          <a
            href={coupangUrl}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            onClick={(event) => event.stopPropagation()}
            className={cn(buttonClass, BOOK_PURCHASE_BUTTON_STYLES.coupang)}
          >
            {AFFILIATE_PLATFORMS.coupang.label}
          </a>
        )}
        {/* 구매 안내 — 두 판매처와 함께면 셋째 칩(1)으로 자리를 받고, 판매처가 하나면 가운데 정렬을 깨지 않게 끝에 얹는다 */}
        {showNotice && (
          <BookPurchaseInfo
            className={hasCoupang
              ? cn("flex min-h-11 min-w-0 items-center justify-center border border-white/10 bg-white/[0.03] hover:border-white/25", radius)
              : "absolute inset-y-0 end-0 z-10 flex w-9 items-center justify-center"}
          />
        )}
      </div>
    </div>
  );
}

export default memo(AffiliateBookAction);
