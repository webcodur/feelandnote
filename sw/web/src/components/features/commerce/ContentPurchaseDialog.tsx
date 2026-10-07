"use client";

import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import { validate as isUuid } from "uuid";
import { toAffiliateLinks, type AffiliateLink } from "@/constants/affiliatePlatforms";
import { getBookPurchaseLinks } from "@/lib/books/bookPurchaseLinks";
import { isAccessType, type ContentAccess } from "@/lib/commerce/contentAccess";

const BookPurchaseModal = dynamic(() => import("./BookPurchaseModal"), { ssr: false });
const ContentAccessModal = dynamic(() => import("./ContentAccessModal"), { ssr: false });

export interface ContentPurchaseDetails {
  contentId: string;
  type: string;
  title: string;
  creator?: string | null;
  thumbnail?: string | null;
  placement: string;
  bookLocale?: "ko" | "en";
  editionId?: number;
  isbn?: string;
  links?: readonly AffiliateLink[];
  affiliateUrl?: unknown;
  yes24Href?: string;
  initialAccess?: ContentAccess;
}

export default function ContentPurchaseDialog({ onClose, ...content }: ContentPurchaseDetails & { onClose: () => void }) {
  const locale = useLocale();
  if (content.type === "BOOK") {
    const links = getBookPurchaseLinks({ ...content, locale: content.bookLocale ?? locale,
      links: content.links ?? toAffiliateLinks(content.affiliateUrl) });
    return <BookPurchaseModal {...content} links={links} onClose={onClose}
      tracking={{ contentId: content.contentId, editionId: content.editionId }} />;
  }
  if (!isAccessType(content.type) || (!isUuid(content.contentId) && !content.initialAccess)) return null;
  return <ContentAccessModal {...content} type={content.type} onClose={onClose} />;
}
