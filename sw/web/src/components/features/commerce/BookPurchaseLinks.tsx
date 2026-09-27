"use client";

import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { AFFILIATE_PLATFORMS, purchaseButtonStyle, type AffiliateLink } from "@/constants/affiliatePlatforms";
import { purchaseAffiliation } from "@/lib/books/bookPurchaseRedirect";
import { trackCommerceClick } from "@/lib/analytics/track";
import { cn } from "@/lib/utils";
import AnimatedHeight from "@/components/ui/AnimatedHeight";
import AccessLinkCard from "./AccessLinkCard";
import AccessStatusRow from "./AccessStatusRow";

export default function BookPurchaseLinks({ links, className, tracking, pendingYes24 = false }: {
  links: readonly AffiliateLink[]; className?: string; tracking?: { contentId?: string; editionId?: number }; pendingYes24?: boolean;
}) {
  const pathname = usePathname();
  const locale = useLocale();
  const t = useTranslations("content.purchase");
  const tAccess = useTranslations("content.access");
  if (!links.length) return null;
  return <div className={cn("min-w-0 space-y-2.5", className)}>
    {links.map(link => <AnimatedHeight key={link.platform} independent duration={320}>
      <div data-access-source={link.platform} data-access-state={pendingYes24 && link.platform === "yes24" ? "loading" : "ready"}>
      {pendingYes24 && link.platform === "yes24" && <AccessStatusRow name="YES24" loading description={tAccess("bookLoading")} />}
      {!(pendingYes24 && link.platform === "yes24") && <AccessLinkCard
        name={AFFILIATE_PLATFORMS[link.platform].label} href={link.url} affiliation={purchaseAffiliation(link)}
        ariaLabel={link.linkKind === "search" ? t("searchStore", { store: AFFILIATE_PLATFORMS[link.platform].label }) : undefined}
        className={purchaseButtonStyle(link.platform)}
        onClick={event => {
          event.stopPropagation();
          trackCommerceClick({ screen: pathname, target: link.linkKind === "search" ? "search" : "product", contentId: tracking?.contentId, editionId: tracking?.editionId, platform: link.platform, locale });
        }} />}
      </div>
    </AnimatedHeight>)}
  </div>;
}
