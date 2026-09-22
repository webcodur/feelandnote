"use client";

import { ArrowUpRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { AFFILIATE_PLATFORMS, purchaseButtonStyle, type AffiliateLink } from "@/constants/affiliatePlatforms";
import { isLinkPriceUrl } from "@/lib/books/bookPurchaseRedirect";
import { trackCommerceClick } from "@/lib/analytics/track";
import { cn } from "@/lib/utils";

function isYes24Affiliate(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && parsed.hostname === "apis.yes24.com" && parsed.pathname.startsWith("/a/");
  } catch { return false; }
}

export default function BookPurchaseLinks({ links, className, tracking }: {
  links: readonly AffiliateLink[];
  className?: string;
  /** 클릭 계측에 실을 대상 식별자 */
  tracking?: { contentId?: string; editionId?: number };
}) {
  const pathname = usePathname();
  const locale = useLocale();
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
                onClick={(event) => {
                  event.stopPropagation();
                  trackCommerceClick({
                    screen: pathname,
                    target: link.linkKind === "search" ? "search" : "product",
                    contentId: tracking?.contentId,
                    editionId: tracking?.editionId,
                    platform: link.platform,
                    locale,
                  });
                }}
                className={cn(
                  "relative flex min-h-11 w-full items-center justify-center rounded-lg border px-3 py-2.5 text-center text-sm font-semibold focus-visible:outline-none focus-visible:ring-2",
                  purchaseButtonStyle(link.platform),
                )}
              >
                <span>{AFFILIATE_PLATFORMS[link.platform].label}</span>
                <ArrowUpRight size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2" aria-hidden />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
