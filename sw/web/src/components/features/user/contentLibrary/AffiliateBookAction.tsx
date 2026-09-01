"use client";

import { memo } from "react";
import { ExternalLink, ShoppingBag } from "lucide-react";
import { useTranslations } from "next-intl";

import { AFFILIATE_PLATFORMS } from "@/constants/affiliatePlatforms";
import { cn } from "@/lib/utils";

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
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        data-testid="content-affiliate-link"
        onClick={(event) => event.stopPropagation()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-400/35 bg-red-400/[0.08] px-3 py-2.5 text-sm font-semibold text-red-100 hover:border-red-300/60 hover:bg-red-400/[0.16] active:bg-red-400/[0.22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300/70"
      >
        <ShoppingBag size={16} aria-hidden />
        <span>{t("buyOnCoupang")}</span>
        <ExternalLink size={14} aria-hidden />
      </a>
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
