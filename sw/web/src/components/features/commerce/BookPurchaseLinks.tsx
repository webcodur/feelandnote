"use client";

import { ArrowUpRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AFFILIATE_PLATFORMS, BOOK_PURCHASE_LABEL_STYLE, purchaseButtonStyle, type AffiliateLink } from "@/constants/affiliatePlatforms";
import { isAffiliatePurchaseLink } from "@/lib/books/bookPurchaseRedirect";
import { trackCommerceClick } from "@/lib/analytics/track";
import { cn } from "@/lib/utils";

export default function BookPurchaseLinks({ links, className, tracking }: {
  links: readonly AffiliateLink[];
  className?: string;
  /** 클릭 계측에 실을 대상 식별자 */
  tracking?: { contentId?: string; editionId?: number };
}) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("content.purchase");
  if (!links.length) return null;

  return (
    <div className={cn("min-w-0", className)}>
      <div className="grid grid-cols-2 gap-2">
        {links.map((link) => {
          const sponsored = isAffiliatePurchaseLink(link);
          return (
            <div key={`${link.platform}:${link.url}`} className="min-w-0">
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
                  "group/purchase relative flex h-10 w-full items-center justify-center whitespace-nowrap rounded-md border px-7 text-[15px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-card",
                  purchaseButtonStyle(link.platform),
                )}
              >
                <span className={cn(BOOK_PURCHASE_LABEL_STYLE, "gap-1.5")}>
                  <span>{AFFILIATE_PLATFORMS[link.platform].label}</span>
                  {link.linkKind === "search" && link.platform !== "coupang" && <span className="text-[11px] font-normal">{t("searchLabel")}</span>}
                </span>
                <ArrowUpRight size={15} className="pointer-events-none absolute end-2.5 top-1/2 -translate-y-1/2" aria-hidden />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
