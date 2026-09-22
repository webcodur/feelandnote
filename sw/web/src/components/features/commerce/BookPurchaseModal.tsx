/* ─────────────────────────────────────────────
 * [공통] 통합 구매 창
 * - 값표(BookPurchaseSummary)를 누르면 뜬다
 * - YES24 제공 안내·상세 값(정가·할인율·판매지수·쪽수·출간일), 서점별 구매 단추(서점 색),
 *   수수료·주의 안내 문구를 한 창에 싣는다 — 흩어져 있던 주의사항 모듈의 자리다
 * - 값표가 목록 카드마다 붙으므로 창은 누를 때만 불러온다(BookPurchaseSummary의 dynamic import)
 * ───────────────────────────────────────────── */
"use client";

import { Fragment } from "react";
import { Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Modal, { ModalBody } from "@/components/ui/Modal";
import BookPurchaseLinks from "@/components/features/commerce/BookPurchaseLinks";
import { AFFILIATE_PLATFORMS, type AffiliateLink } from "@/constants/affiliatePlatforms";
import type { Yes24SalesInfo } from "@/lib/books/yes24Purchase";

interface BookPurchaseModalProps {
  /** 한국어 도서 — YES24가 주는 판매 정보. 외국어·비도서·조회 실패면 null */
  sales: Yes24SalesInfo | null;
  /** 구매 가능한 서점 링크 — 서점 하나당 단추 하나 */
  links: readonly AffiliateLink[];
  onClose: () => void;
  /** 클릭 계측에 실을 대상 식별자 */
  tracking?: { contentId?: string; editionId?: number };
}

export default function BookPurchaseModal({ sales, links, onClose, tracking }: BookPurchaseModalProps) {
  const t = useTranslations("content.purchaseSales");
  const tInfo = useTranslations("content.purchaseInfo");
  const number = new Intl.NumberFormat(useLocale());
  const price = (value: number) => t("price", { price: number.format(value) });
  const { starScore, salePrice, shopPrice, salePoint, pages, publishDate, onSale } = sales ?? {};
  const discountRate = onSale && salePrice != null && shopPrice != null && shopPrice > salePrice
    ? Math.round((1 - salePrice / shopPrice) * 100)
    : 0;

  // 팔리지 않는 판본이면 판매가·정가·판매지수처럼 지금과 어긋난 시세 값은 숨긴다
  const facts = sales ? [
    starScore ? {
      label: t("rating"),
      value: (
        <span className="inline-flex items-center gap-1">
          <Star size={13} className="fill-current text-accent" aria-hidden />
          <strong className="font-bold tabular-nums text-text-primary">{starScore}</strong>
        </span>
      ),
    } : null,
    onSale && salePrice != null ? {
      label: t("salePrice"),
      value: (
        <span className="inline-flex flex-wrap items-center gap-x-2">
          <strong className="font-bold tabular-nums text-text-primary">{price(salePrice)}</strong>
          {discountRate > 0 && <span className="text-xs font-semibold text-accent">{t("discount", { rate: discountRate })}</span>}
        </span>
      ),
    } : null,
    discountRate > 0 && shopPrice != null ? {
      label: t("shopPrice"),
      value: <span className="tabular-nums line-through">{price(shopPrice)}</span>,
    } : null,
    onSale && salePoint ? { label: t("salePoint"), value: <span className="tabular-nums">{number.format(salePoint)}</span> } : null,
    pages ? { label: t("pages"), value: t("pageCount", { count: pages }) } : null,
    publishDate ? { label: t("published"), value: <span className="tabular-nums">{publishDate}</span> } : null,
  ].filter((fact) => fact !== null) : [];

  // 서점이 스스로 밝히는 수수료 문구(쿠팡 파트너스 등)를 링크 있는 서점 것만 모은다
  const platformNotices = [...new Set(
    links
      .map((link): string | null | undefined => AFFILIATE_PLATFORMS[link.platform]?.notice)
      .filter((notice): notice is string => Boolean(notice)),
  )];

  return (
    <Modal isOpen onClose={onClose} title={tInfo("title")} size="sm">
      <ModalBody className="space-y-4 p-4 sm:p-5">
        {sales && (
          <p className="rounded-md border border-accent-dim/40 bg-bg-secondary/60 px-3 py-2 text-xs leading-relaxed text-text-secondary">
            {onSale ? t("notice") : t("changedNotice")}
          </p>
        )}

        {facts.length > 0 && (
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
            {facts.map((fact) => (
              <Fragment key={fact.label}>
                <dt className="text-text-tertiary">{fact.label}</dt>
                <dd className="min-w-0 text-text-secondary">{fact.value}</dd>
              </Fragment>
            ))}
          </dl>
        )}

        {/* 서점별 구매 단추 — 서점 브랜드 색을 단추 테두리·글자에 그대로 쓴다 */}
        {links.length > 0 && <BookPurchaseLinks links={links} tracking={tracking} />}

        {/* 수수료·주의 안내 — 제목 옆 ⓘ에 흩어져 있던 문구를 이 창의 한 단락으로 모았다 */}
        <p className="border-t border-white/10 pt-3 text-xs leading-relaxed text-text-tertiary">
          {[tInfo("benefit"), tInfo("notice"), ...platformNotices].join(" ")}
        </p>
      </ModalBody>
    </Modal>
  );
}
