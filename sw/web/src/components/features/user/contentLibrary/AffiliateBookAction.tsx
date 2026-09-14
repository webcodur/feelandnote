"use client";

import BookPurchaseInfo from "@/components/shared/BookPurchaseInfo";
import { memo } from "react";
import { useTranslations } from "next-intl";

import { AFFILIATE_PLATFORMS, BOOK_PURCHASE_BUTTON_STYLES } from "@/constants/affiliatePlatforms";
import { getBookPurchaseHref } from "@/lib/books/bookPurchaseHref";
import { cn } from "@/lib/utils";

interface AffiliateBookActionProps {
  className?: string;
  showNotice?: boolean;
  contentId: string;
  editionId?: number;
  coupangUrl?: string | null;
  /** 격자 카드 아래처럼 폭이 좁은 자리에 맞춘 작은 단추 */
  compact?: boolean;
}

function AffiliateBookAction({
  className,
  showNotice = false,
  contentId,
  editionId,
  coupangUrl,
  compact = false,
}: AffiliateBookActionProps) {
  const t = useTranslations("content.purchase");
  const hasCoupang = !!coupangUrl && coupangUrl.startsWith("https://");
  const buttonClass = "flex min-h-11 min-w-0 items-center justify-center px-2 py-2 text-center text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset";

  return (
    <div className={cn("min-w-0", className)} data-testid="content-affiliate-action">
      <div className={cn(
        "grid overflow-hidden border border-white/15 divide-x divide-white/15",
        compact ? "rounded-md" : "rounded-lg",
        hasCoupang ? "grid-cols-2" : "grid-cols-1",
      )}>
        <a
          href={getBookPurchaseHref(contentId, editionId, "yes24")}
          target="_blank"
          rel="noopener noreferrer nofollow sponsored"
          data-testid="content-affiliate-link"
          onClick={(event) => event.stopPropagation()}
          className={cn(buttonClass, BOOK_PURCHASE_BUTTON_STYLES.yes24)}
        >
          {hasCoupang ? "YES24" : t("viewAt", { platform: "YES24" })}
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
      </div>
      {showNotice && (
        <BookPurchaseInfo className="mt-2" />
      )}
    </div>
  );
}

export default memo(AffiliateBookAction);
