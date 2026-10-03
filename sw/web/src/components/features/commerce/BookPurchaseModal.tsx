"use client";

import { Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import AccessDialog, { AccessDisclosure } from "./AccessDialog";
import { isDeveloperMode } from "@/lib/developer-mode";
import BookPurchaseLinks from "@/components/features/commerce/BookPurchaseLinks";
import { AFFILIATE_PLATFORMS, type AffiliateLink } from "@/constants/affiliatePlatforms";
import { isAffiliatePurchaseLink } from "@/lib/books/bookPurchaseRedirect";
import { useYes24SalesState } from "./useYes24Sales";

interface BookPurchaseModalProps {
  bookLocale?: 'ko' | 'en';
  title?: string | null;
  creator?: string | null;
  thumbnail?: string | null;
  isbn?: string;
  /** 구매 가능한 서점 링크 — 서점 하나당 단추 하나 */
  links: readonly AffiliateLink[];
  onClose: () => void;
  /** 클릭 계측에 실을 대상 식별자 */
  tracking?: { contentId?: string; editionId?: number };
}

export default function BookPurchaseModal({ bookLocale, title, creator, thumbnail, isbn, links, onClose, tracking }: BookPurchaseModalProps) {
  const displayLocale = useLocale();
  const locale = bookLocale ?? displayLocale;
  // 가격 조회가 늦거나 실패해도 서점 선택은 즉시 가능하다.
  const { sales, loading } = useYes24SalesState({ ...tracking, isbn, active: locale === "ko" });
  const t = useTranslations("content.purchaseSales");
  const tAccess = useTranslations("content.access");
  const pendingYes24 = loading && links.some(link => link.platform === "yes24" && link.url.startsWith("/api/books/purchase/"));
  // 같은 ISBN의 실제 목적지를 받아 제휴 표시와 도착 주소를 일치시킨다.
  // 상품을 확인하지 못했으면 제휴 없는 공식 검색으로 연결한다.
  const resolvedLinks = links.map(link => {
    if (link.platform !== "yes24" || !link.url.startsWith("/api/books/purchase/") || loading) return link;
    if (sales?.onSale && sales.purchaseUrl) return { ...link, url: sales.purchaseUrl };
    const query = isbn || [title, creator].filter(Boolean).join(" ");
    return { ...link, url: `https://www.yes24.com/Product/Search?domain=BOOK&query=${encodeURIComponent(query)}`, linkKind: "search" as const };
  });
  const number = new Intl.NumberFormat(displayLocale);
  const price = (value: number) => t("price", { price: number.format(value) });
  const { starScore, salePrice, shopPrice, salePoint, pages, publishDate, onSale } = sales ?? {};
  const discountRate = onSale && salePrice != null && shopPrice != null && shopPrice > salePrice
    ? Math.round((1 - salePrice / shopPrice) * 100)
    : 0;

  // 팔리지 않는 판본이면 판매가·정가·판매지수처럼 지금과 어긋난 시세 값은 숨긴다
  const facts = sales ? [
    onSale && salePoint ? { label: t("salePoint"), value: <span className="tabular-nums">{number.format(salePoint)}</span> } : null,
    pages ? { label: t("pages"), value: t("pageCount", { count: pages }) } : null,
    publishDate ? { label: t("published"), value: <span className="tabular-nums">{publishDate}</span> } : null,
  ].filter((fact) => fact !== null) : [];

  // 실제 제휴 링크에만 짧은 수수료 안내를 붙이고, 지정 고지가 있으면 원문을 쓴다.
  const affiliateLinks = resolvedLinks.filter(isAffiliatePurchaseLink);
  const platformNotices = [...new Set(
    affiliateLinks
      .map((link): string | null | undefined => AFFILIATE_PLATFORMS[link.platform]?.notice)
      .filter((notice): notice is string => Boolean(notice)),
  )];

  return (
    <AccessDialog type="BOOK" title={title} creator={creator} thumbnail={thumbnail} onClose={onClose}>
        <BookPurchaseLinks links={resolvedLinks} tracking={tracking} pendingYes24={pendingYes24} />
        <AccessDisclosure hasAffiliates={affiliateLinks.length > 0} notices={platformNotices} />
        {isDeveloperMode() && (
          <p className="border-t border-border pt-4 text-xs leading-relaxed text-red-400">{tAccess("method.BOOK")}</p>
        )}
        {locale === "ko" && (isbn || tracking?.contentId) && (
          <section className="mt-5 space-y-3 border-t border-border pt-5" aria-label={t("details")}>
            <h3 className="text-center text-sm font-semibold text-text-primary">{t("details")}</h3>
            {loading && <p role="status" className="text-sm text-text-secondary">{tAccess("bookLoading")}</p>}
            {!loading && !onSale && (
              <p className="break-keep text-sm leading-relaxed text-pretty text-text-secondary">
                {sales ? t("changedNotice") : t("fallback")}
              </p>
            )}
            {((onSale && salePrice != null) || Boolean(starScore)) && (
              <div className="flex overflow-hidden rounded-md border border-purchase-ink/20 bg-bg-main/30 text-center">
                {onSale && salePrice != null && (
                  <div className="min-w-0 flex-1 space-y-1 px-3 py-3">
                    <p className="text-xs text-text-secondary">{t("salePrice")}</p>
                    <strong className="block text-2xl font-semibold tabular-nums text-purchase-ink">{price(salePrice)}</strong>
                    {discountRate > 0 && shopPrice != null && (
                      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs">
                        <span className="tabular-nums text-text-secondary line-through" aria-label={`${t("shopPrice")}: ${price(shopPrice)}`}>{price(shopPrice)}</span>
                        <span className="font-semibold text-accent">{t("discount", { rate: discountRate })}</span>
                      </div>
                    )}
                  </div>
                )}
                {Boolean(starScore) && (
                  <div className="flex min-w-22 flex-1 flex-col items-center gap-1 border-s border-purchase-ink/20 px-3 py-3 first:border-s-0">
                    <p className="text-xs text-text-secondary">{t("rating")}</p>
                    <span className="inline-flex items-center gap-1.5 text-2xl tabular-nums text-purchase-ink">
                      <Star size={15} className="fill-current text-accent" aria-hidden />
                      <strong className="font-semibold">{starScore}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}
            {facts.length > 0 && (
              <dl className="@container/sales grid overflow-hidden rounded-md border border-purchase-ink/20 text-center" style={{ gridTemplateColumns: `repeat(${facts.length}, minmax(0, 1fr))` }}>
                {facts.map((fact) => (
                  <div key={fact.label} className="min-w-0 space-y-1 border-s border-purchase-ink/20 px-1.5 py-2.5 first:border-s-0">
                    <dt className="text-xs text-text-secondary">{fact.label}</dt>
                    <dd className="text-xs text-text-primary @min-[270px]/sales:text-sm">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            )}
          </section>
        )}
    </AccessDialog>
  );
}
