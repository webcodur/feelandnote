"use client";

import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { AFFILIATE_PLATFORMS, BOOK_PURCHASE_BUTTON_STYLES, type AffiliateLink } from "@/constants/affiliatePlatforms";
import BookPurchaseInfo from "@/components/shared/BookPurchaseInfo";
import { cn } from "@/lib/utils";

function isYes24Affiliate(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "apis.yes24.com" && parsed.pathname.startsWith("/a/");
  } catch { return false; }
}

export default function BookPurchaseLinks({ links, className }: {
  links: readonly AffiliateLink[];
  className?: string;
}) {
  const t = useTranslations("content.purchase");
  if (!links.length) return null;
  const showPurchaseInfo = links.some((link) => link.platform === "yes24" || link.platform === "coupang");

  return (
    <div className={cn("min-w-0 space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        {links.map((link) => {
          const isYes24 = link.platform === "yes24";
          const sponsored = !isYes24 || isYes24Affiliate(link.url);
          return (
            <div key={`${link.platform}:${link.url}`} className="group/purchase relative min-w-0 flex-[1_1_9rem]">
              <a
                href={link.url}
                target="_blank"
                rel={sponsored ? "noopener noreferrer nofollow sponsored" : "noopener noreferrer"}
                onClick={(event) => event.stopPropagation()}
                className={cn(
                  "flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-center text-sm font-semibold focus-visible:outline-none focus-visible:ring-2",
                  isYes24
                    ? BOOK_PURCHASE_BUTTON_STYLES.yes24
                    : link.platform === "coupang" ? BOOK_PURCHASE_BUTTON_STYLES.coupang
                    : "border-border bg-bg-secondary text-text-primary hover:border-accent hover:bg-accent/10 hover:text-accent focus-visible:ring-accent",
                )}
              >
                <span>{t("buyAt", { platform: AFFILIATE_PLATFORMS[link.platform].label })}</span>
                <ArrowUpRight size={14} className="shrink-0" aria-hidden />
              </a>
            </div>
          );
        })}
      </div>
      {showPurchaseInfo && <BookPurchaseInfo className="w-full justify-end" />}
    </div>
  );
}
