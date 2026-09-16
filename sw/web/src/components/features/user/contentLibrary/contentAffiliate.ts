import { findAffiliateLink } from "@/actions/home/affiliateLinks";
import { normalizePurchaseIsbn } from "@/lib/books/yes24Purchase";
import type { UserContentWithContent } from "@/actions/contents/getMyContents";

type AffiliateContent = Pick<UserContentWithContent["content"], "type" | "affiliate_url">;

export function getCoupangAffiliateUrl(content: AffiliateContent): string | null {
  if (content.type !== "BOOK") return null;
  const url = findAffiliateLink(content.affiliate_url, "coupang")?.url;
  if (!url) return null;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch {
    return null;
  }
}

/** YES24로 이을 한국어 책인가 — ISBN이 있거나 쿠팡 보조 링크가 붙었다(홈·인물 추천 도서 후보와 같은 기준) */
export function hasKoreanBookPurchase(item: UserContentWithContent): boolean {
  if (item.content?.type !== "BOOK") return false;
  return Boolean(normalizePurchaseIsbn(item.content.isbn_ko)) || getCoupangAffiliateUrl(item.content) !== null;
}
