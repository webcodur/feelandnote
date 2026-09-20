"use client";

import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { AFFILIATE_PLATFORMS, purchaseButtonStyle, type AffiliateLink } from "@/constants/affiliatePlatforms";
import { isLinkPriceUrl } from "@/lib/books/bookPurchaseRedirect";
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

  return (
    <div className={cn("min-w-0", className)}>
      <div className="relative flex flex-wrap gap-2">
        {links.map((link) => {
          const isYes24 = link.platform === "yes24";
          const sponsored = link.linkKind !== "search"
            ? !isYes24 || isYes24Affiliate(link.url)
            : isLinkPriceUrl(link.url);
          return (
            <div key={`${link.platform}:${link.url}`} className="group/purchase relative min-w-0 flex-[1_1_9rem]">
              <a
                href={link.url}
                target="_blank"
                rel={sponsored ? "noopener noreferrer nofollow sponsored" : "noopener noreferrer"}
                onClick={(event) => event.stopPropagation()}
                className={cn(
                  "flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2.5 text-center text-sm font-semibold focus-visible:outline-none focus-visible:ring-2",
                  purchaseButtonStyle(link.platform),
                )}
              >
                <span>{t(link.linkKind === "search" ? "searchAt" : "buyAt", { platform: AFFILIATE_PLATFORMS[link.platform].label })}</span>
                <ArrowUpRight size={14} className="shrink-0" aria-hidden />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
