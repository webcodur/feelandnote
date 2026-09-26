"use client";

import BookPurchaseSummary from "@/components/features/commerce/BookPurchaseSummary";
import { toAffiliateLinks } from "@/constants/affiliatePlatforms";

/** 작품 카드 발꿈치(posterFooterNode)의 통합 구매 모듈 — 값표+서점 마커를 누르면 서점 링크·주의 안내 창이 뜬다.
    책일 때만 부른다 */
export default function CardBookPurchase({ contentId, title, creator, thumbnail, affiliateUrl }: {
  contentId: string;
  /** 화면 언어로 고른 제목·저자 — 영어 화면의 아마존 검색어가 된다 */
  title: string;
  creator?: string | null;
  thumbnail?: string | null;
  affiliateUrl?: unknown;
}) {
  return (
    <BookPurchaseSummary
      contentId={contentId}
      title={title}
      creator={creator}
      thumbnail={thumbnail}
      links={toAffiliateLinks(affiliateUrl)}
      full
    />
  );
}
