"use client";

import { memo } from "react";
import { useTranslations } from "next-intl";

import { AFFILIATE_PLATFORMS } from "@/constants/affiliatePlatforms";
import { cn } from "@/lib/utils";
import CoupangPurchaseInfo from "@/components/shared/CoupangPurchaseInfo";

interface AffiliateBookActionProps {
  className?: string;
  showNotice?: boolean;
  url: string;
}

function AffiliateBookAction({
  className,
  showNotice = false,
  url,
}: AffiliateBookActionProps) {
  const t = useTranslations("popularBooks");

  return (
    <div className={cn("min-w-0", className)} data-testid="content-affiliate-action">
      <div className="group/coupang-buy relative">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer nofollow sponsored"
          data-testid="content-affiliate-link"
          onClick={(event) => event.stopPropagation()}
          className="flex w-full items-center justify-center rounded-lg border border-red-400/35 bg-red-400/[0.08] px-10 py-2.5 text-base font-semibold text-red-100 group-hover/coupang-buy:border-red-300/80 group-hover/coupang-buy:bg-red-400/25 active:bg-red-400/[0.22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70"
        >
          <span>{t("buyOnCoupang")}</span>
        </a>
        <CoupangPurchaseInfo className="absolute end-1 top-1/2 -translate-y-1/2 text-red-100" />
      </div>
      {showNotice && (
        <p
          data-testid="content-affiliate-disclosure"
          className="mt-2 text-pretty text-[10px] leading-4 text-text-tertiary"
        >
          {AFFILIATE_PLATFORMS.coupang.notice}
        </p>
      )}
    </div>
  );
}

export default memo(AffiliateBookAction);
