"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowUpRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Modal from "@/components/ui/Modal";
import ContentPurchaseDialog, { type ContentPurchaseDetails } from "@/components/features/commerce/ContentPurchaseDialog";
import PurchaseOpener from "@/components/features/commerce/PurchaseOpener";
import { trackEvent } from "@/lib/analytics/track";
import ContentInfoHeader from "./ContentInfoHeader";
import { AFFILIATE_PLATFORMS } from "@/constants/affiliatePlatforms";

export default function ContentInfoDialog({ isOpen = true, onClose, children, purchase, detailHref, ...header }: ComponentProps<typeof ContentInfoHeader> & {
  isOpen?: boolean;
  onClose: () => void;
  children: ReactNode;
  purchase?: ContentPurchaseDetails;
  detailHref?: string;
}) {
  const locale = useLocale();
  const t = useTranslations("content.intro");
  const [purchaseOpen, setPurchaseOpen] = useState(false);
  if (!isOpen) return null;
  if (purchaseOpen && purchase) return <ContentPurchaseDialog {...purchase} onClose={onClose} />;

  const footer = (purchase || detailHref) && <div className="border-t border-line bg-bg-secondary px-5 py-4 md:px-7">
    <div className={`grid gap-2 ${purchase && detailHref ? "md:grid-cols-2" : ""}`}>
      {detailHref && <Link href={detailHref}
        className="flex min-h-11 items-center justify-center gap-1 rounded-control border border-line-strong px-3 py-2 text-sm text-text-primary hover:border-accent hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">
        {t("viewDetail")}<ArrowUpRight size={15} aria-hidden />
      </Link>}
      {purchase && <PurchaseOpener type={purchase.type} primary
        stores={purchase.type === "BOOK" && (purchase.bookLocale ?? locale) === "en" ? [AFFILIATE_PLATFORMS.amazon.label] : []}
        onOpen={() => {
        trackEvent("commerce_open", { screen: purchase.placement, content_id: purchase.contentId, content_type: purchase.type, locale });
        setPurchaseOpen(true);
      }} />}
    </div>
  </div>;

  return <Modal isOpen onClose={onClose} ariaLabel={header.title} widthClassName="max-w-[680px]" frame="plain"
    animateHeight={false} fadeClippedEnd footer={footer}
    boxClassName="overflow-hidden rounded-panel border border-line-strong bg-bg-card shadow-2xl [&_div.overflow-y-auto]:[overflow-anchor:none]"
    closeButtonClassName="absolute end-2 top-2 z-40 flex size-11 items-center justify-center rounded-control text-text-secondary hover:bg-bg-raised hover:text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent">
    <article data-content-info={header.type} className="px-5 pb-6 pt-8 md:px-7 md:pb-7 md:pt-7">
      <ContentInfoHeader {...header} />
      {children}
    </article>
  </Modal>;
}
