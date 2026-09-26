"use client";

import { Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Modal, { ModalBody } from "@/components/ui/Modal";
import ContentImage from "@/components/ui/ContentImage";
import BookPurchaseLinks from "@/components/features/commerce/BookPurchaseLinks";
import { AFFILIATE_PLATFORMS, type AffiliateLink } from "@/constants/affiliatePlatforms";
import { isAffiliatePurchaseLink } from "@/lib/books/bookPurchaseRedirect";
import { useYes24Sales } from "./useYes24Sales";

interface BookPurchaseModalProps {
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

export default function BookPurchaseModal({ title, creator, thumbnail, isbn, links, onClose, tracking }: BookPurchaseModalProps) {
  const locale = useLocale();
  // 가격 조회가 늦거나 실패해도 서점 선택은 즉시 가능하다.
  const sales = useYes24Sales({ ...tracking, isbn, active: locale === "ko" });
  const t = useTranslations("content.purchaseSales");
  const tInfo = useTranslations("content.purchaseInfo");
  const number = new Intl.NumberFormat(locale);
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

  // 실제 제휴 링크에만 수수료·운영 지원 안내를 붙이고, 지정 고지가 있으면 원문을 쓴다.
  const affiliateLinks = links.filter(isAffiliatePurchaseLink);
  const platformNotices = [...new Set(
    affiliateLinks
      .map((link): string | null | undefined => AFFILIATE_PLATFORMS[link.platform]?.notice)
      .filter((notice): notice is string => Boolean(notice)),
  )];

  return (
    <Modal isOpen onClose={onClose} title={tInfo("title")} widthClassName="max-w-[420px]" frame="plain" stickyHeader escapeCapture animateHeightDuration={320}
      boxClassName="overflow-hidden rounded-lg border border-accent/25 bg-bg-card shadow-2xl"
      overlayClassName="bg-black/60 backdrop-blur-sm"
      titleClassName="px-10 font-medium text-accent"
      titleStyle={{ fontSize: "14px" }}
      closeButtonClassName="absolute end-1 top-1 z-40 flex size-11 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <ModalBody className="p-5 sm:p-6">
        <div className="space-y-5">
          {(title || creator || thumbnail) && (
            <div className="flex items-center gap-4">
              {thumbnail && (
                <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-sm border border-purchase-ink/20 bg-bg-main sm:h-27 sm:w-18">
                  <ContentImage src={thumbnail} alt={title ?? ""} sizes="72px" className="object-contain" loading="eager" dissolve={false} />
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-1.5 text-center">
                {title && <p className="break-words text-2xl font-semibold leading-snug text-purchase-ink">{title}</p>}
                {creator && <p className="break-words text-sm leading-relaxed text-text-secondary">{creator}</p>}
              </div>
            </div>
          )}
          <BookPurchaseLinks links={links} tracking={tracking} />
        </div>
        <div className="mt-3 space-y-1.5 break-keep text-sm leading-relaxed text-pretty text-text-secondary">
          <p>{platformNotices.length > 0 ? platformNotices.join(" ") : tInfo(affiliateLinks.length > 0 ? "notice" : "benefit")}</p>
          {affiliateLinks.length > 0 && <p className="text-text-primary">{tInfo("support")}</p>}
        </div>
        {locale === "ko" && (isbn || tracking?.contentId) && (
          <section className="mt-5 space-y-3 border-t border-border pt-5" aria-label={t("details")}>
            <h3 className="text-center text-sm font-semibold text-text-primary">{t("details")}</h3>
            {!onSale && (
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
      </ModalBody>
    </Modal>
  );
}
