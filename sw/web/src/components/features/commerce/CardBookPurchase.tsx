"use client";

import { useLocale } from "next-intl";
import { findAffiliateLink } from "@/actions/home/affiliateLinks";
import BookPurchaseLinks from "@/components/features/commerce/BookPurchaseLinks";
import Yes24Sales from "@/components/features/commerce/Yes24Sales";
import AffiliateBookAction from "@/components/features/user/contentLibrary/AffiliateBookAction";
import { getCoupangAffiliateUrl } from "@/components/features/user/contentLibrary/contentAffiliate";
import { getEnglishBookPurchaseLinks } from "@/lib/books/amazonBookSearch";

/** 작품 카드 발꿈치(posterFooterNode)의 책 구매 단추 — 한국어는 YES24·쿠팡, 영어는 아마존.
    한국어는 단추와 YES24 값표(★ 평점·가격)를 두 조각으로 내어 카드가 표지 아래·감상 칸 아래에 나눠 세운다.
    책일 때만 부른다. 수수료 안내(ⓘ)는 부르는 쪽 구획 머리말이 맡는다 */
export default function CardBookPurchase({ contentId, title, creator, affiliateUrl }: {
  contentId: string;
  /** 화면 언어로 고른 제목·저자 — 영어 화면의 아마존 검색어가 된다 */
  title: string;
  creator?: string | null;
  affiliateUrl?: unknown;
}) {
  const locale = useLocale();

  if (locale === "ko") {
    return (
      <>
        <AffiliateBookAction
          contentId={contentId}
          coupangUrl={getCoupangAffiliateUrl({ type: "BOOK", affiliate_url: affiliateUrl })}
          hideSales
        />
        <Yes24Sales contentId={contentId} />
      </>
    );
  }

  const amazonLink = findAffiliateLink(affiliateUrl, "amazon");
  return (
    <BookPurchaseLinks
      links={getEnglishBookPurchaseLinks({ locale, title, creator, links: amazonLink ? [amazonLink] : [] })}
    />
  );
}
