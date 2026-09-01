import { findAffiliateLink } from "@/actions/home/affiliateLinks";
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

export function hasCoupangAffiliate(item: UserContentWithContent): boolean {
  return getCoupangAffiliateUrl(item.content) !== null;
}
