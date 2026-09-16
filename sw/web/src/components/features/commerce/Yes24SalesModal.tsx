/* ─────────────────────────────────────────────
 * [공통] YES24 판매 정보 창
 * - 값표(Yes24Sales)를 누르면 뜬다. 값이 YES24 제공이라는 안내, 값표에 다 못 싣는 값(정가·할인율·판매지수·쪽수·출간일),
 *   YES24 구매 단추(AffiliateBookAction)를 한 창에 싣는다
 * - 값표가 목록 카드마다 붙으므로 창은 누를 때만 불러온다(Yes24Sales의 dynamic import)
 * ───────────────────────────────────────────── */
"use client";

import { Fragment } from "react";
import { Info, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import AffiliateBookAction from "@/components/features/user/contentLibrary/AffiliateBookAction";
import Modal, { ModalBody } from "@/components/ui/Modal";
import type { Yes24SalesInfo } from "@/lib/books/yes24Purchase";

interface Yes24SalesModalProps {
  contentId: string;
  editionId?: number;
  sales: Yes24SalesInfo;
  onClose: () => void;
}

export default function Yes24SalesModal({ contentId, editionId, sales, onClose }: Yes24SalesModalProps) {
  const t = useTranslations("content.purchaseSales");
  const number = new Intl.NumberFormat(useLocale());
  const price = (value: number) => t("price", { price: number.format(value) });
  const { starScore, salePrice, shopPrice, salePoint, pages, publishDate } = sales;
  const discountRate = salePrice != null && shopPrice != null && shopPrice > salePrice
    ? Math.round((1 - salePrice / shopPrice) * 100)
    : 0;

  const facts = [
    starScore ? {
      label: t("rating"),
      value: (
        <span className="inline-flex items-center gap-1">
          <Star size={13} className="fill-current text-accent" aria-hidden />
          <strong className="font-bold tabular-nums text-text-primary">{starScore}</strong>
        </span>
      ),
    } : null,
    salePrice != null ? {
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
    salePoint ? { label: t("salePoint"), value: <span className="tabular-nums">{number.format(salePoint)}</span> } : null,
    pages ? { label: t("pages"), value: t("pageCount", { count: pages }) } : null,
    publishDate ? { label: t("published"), value: <span className="tabular-nums">{publishDate}</span> } : null,
  ].filter((fact) => fact !== null);

  return (
    <Modal isOpen onClose={onClose} title={t("label")} size="sm">
      <ModalBody className="space-y-4 p-4 sm:p-5">
        <p className="flex items-start gap-2 rounded-md border border-accent-dim/40 bg-bg-secondary/60 px-3 py-2 text-xs leading-relaxed text-text-secondary">
          <Info size={14} className="mt-0.5 shrink-0 text-accent" aria-hidden />
          {t("notice")}
        </p>

        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
          {facts.map((fact) => (
            <Fragment key={fact.label}>
              <dt className="text-text-tertiary">{fact.label}</dt>
              <dd className="min-w-0 text-text-secondary">{fact.value}</dd>
            </Fragment>
          ))}
        </dl>

        {/* YES24 구매 단추 — 값표를 이미 보여 줬으므로 단추 위 값표 칸은 뺀다 */}
        <AffiliateBookAction contentId={contentId} editionId={editionId} hideSales />
      </ModalBody>
    </Modal>
  );
}
