/*
  파일명: /components/features/library/Yes24BookModal.tsx
  기능: 서재 베스트셀러 차트의 책 정보 모달
  책임: 차트 책은 우리 작품이 아니라 작품 상세로 보낼 수 없다. 외부 페이지로 내보내지 않고 YES24 상품 상세(ISBN)를 받아
        표지·서지·가격·평점·책 소개와 YES24 제휴 단추를 모달로 보인다. YES24가 아닌 차트(Apple Books)는 차트가 준 정보와 서점 단추만 보인다.
*/ // ------------------------------

"use client";

import { Fragment, useEffect, useState } from "react";
import { ArrowUpRight, BookOpen, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getYes24BookDetail } from "@/actions/library/getYes24BookDetail";
import type { BestsellerItem } from "@/actions/library/types";
import AffiliateBookAction from "@/components/features/user/contentLibrary/AffiliateBookAction";
import ContentImage from "@/components/ui/ContentImage";
import Modal from "@/components/ui/Modal";
import type { Yes24BookDetail } from "@/lib/books/yes24Purchase";

type DetailState =
  | { status: "loading" }
  | { status: "ready"; detail: Yes24BookDetail | null }
  | { status: "failed" };

export default function Yes24BookModal({ item, onClose }: { item: BestsellerItem; onClose: () => void }) {
  const t = useTranslations("library.popular");
  const locale = useLocale();
  const isYes24 = item.id.startsWith("yes24-");
  const isbn = isYes24 ? item.isbn : null;
  const [state, setState] = useState<DetailState>(() => (isbn ? { status: "loading" } : { status: "ready", detail: null }));

  useEffect(() => {
    if (!isbn) return;
    let alive = true;
    getYes24BookDetail(isbn)
      .then((detail) => alive && setState({ status: "ready", detail }))
      .catch((error) => {
        console.error("[Yes24BookModal] 책 정보 조회 실패:", error);
        if (alive) setState({ status: "failed" });
      });
    return () => {
      alive = false;
    };
  }, [isbn]);

  const detail = state.status === "ready" ? state.detail : null;
  const title = detail?.title ?? item.title;
  const cover = detail?.cover ?? item.thumbnail_url;
  const author = detail?.author ?? item.creator;
  const purchaseHref = detail?.purchaseUrl ?? item.purchase_url ?? item.source_url;
  const number = new Intl.NumberFormat(locale);
  const paragraphs = detail?.introduction?.split(/\n{2,}/) ?? [];
  const facts = [
    detail?.publisher ? { label: t("detail.publisher"), value: detail.publisher } : null,
    detail?.publishDate ? { label: t("detail.published"), value: detail.publishDate } : null,
    detail?.pages ? { label: t("detail.pages"), value: t("detail.pageCount", { count: detail.pages }) } : null,
  ].filter((fact): fact is { label: string; value: string } => fact !== null);
  const discounted = detail?.salePrice != null && detail.shopPrice != null && detail.shopPrice > detail.salePrice;

  return (
    <Modal isOpen onClose={onClose} size="full">
      <article className="px-4 pb-6 pt-12 sm:px-6 md:pt-6">
        <div className="grid gap-5 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-7">
          <div className="relative mx-auto aspect-[2/3] w-40 overflow-hidden rounded-lg border border-white/10 bg-bg-secondary sm:mx-0 sm:w-full">
            {cover ? (
              <ContentImage src={cover} alt={title} sizes="180px" className="object-contain" />
            ) : (
              <div className="flex h-full items-center justify-center text-text-tertiary">
                <BookOpen size={32} aria-hidden />
              </div>
            )}
          </div>

          <div className="min-w-0 sm:pe-8">
            <p className="text-sm font-bold tabular-nums text-accent">{t("rank", { rank: item.rank })}</p>
            <h2 className="mt-1 text-balance font-serif text-2xl font-bold leading-snug text-text-primary">{title}</h2>
            {detail?.subTitle && <p className="mt-1 text-sm text-text-secondary">{detail.subTitle}</p>}
            {author && <p className="mt-2 text-sm text-text-secondary">{author}</p>}

            {facts.length > 0 && (
              <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
                {facts.map((fact) => (
                  <Fragment key={fact.label}>
                    <dt className="text-text-tertiary">{fact.label}</dt>
                    <dd className="text-text-secondary">{fact.value}</dd>
                  </Fragment>
                ))}
              </dl>
            )}

            {(detail?.salePrice != null || (detail?.starScore ?? 0) > 0) && (
              <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                {detail?.salePrice != null && (
                  <span className="text-base font-bold tabular-nums text-text-primary">{t("detail.price", { price: number.format(detail.salePrice) })}</span>
                )}
                {discounted && detail?.shopPrice != null && (
                  <span className="tabular-nums text-text-tertiary line-through">{t("detail.price", { price: number.format(detail.shopPrice) })}</span>
                )}
                {(detail?.starScore ?? 0) > 0 && (
                  <span className="inline-flex items-center gap-1 text-accent">
                    <Star size={13} className="fill-current" aria-hidden />
                    {t("detail.rating", { score: detail?.starScore ?? 0 })}
                  </span>
                )}
              </p>
            )}

            <div className="mt-5 max-w-sm">
              {isYes24 ? (
                purchaseHref && <AffiliateBookAction contentId={item.id} yes24Href={purchaseHref} showNotice />
              ) : (
                item.source_url && (
                  <a
                    href={item.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-white/15 px-4 text-sm font-semibold text-text-primary hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {t("viewAtStore")}
                    <ArrowUpRight size={14} aria-hidden />
                  </a>
                )
              )}
            </div>
          </div>
        </div>

        {isbn && (
          <section aria-label={t("detail.introduction")} className="mt-6 border-t border-white/10 pt-5">
            {state.status === "loading" ? (
              <div className="space-y-2" aria-hidden>
                <div className="h-3.5 w-full animate-pulse rounded bg-white/[0.07]" />
                <div className="h-3.5 w-11/12 animate-pulse rounded bg-white/[0.07]" />
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-white/[0.07]" />
              </div>
            ) : state.status === "failed" ? (
              <p className="text-sm text-text-secondary">{t("detail.failed")}</p>
            ) : (
              paragraphs.length > 0 && (
                <>
                  <h3 className="mb-2 text-sm font-bold text-accent">{t("detail.introduction")}</h3>
                  <div className="space-y-3 whitespace-pre-line break-keep text-sm leading-7 text-text-secondary">
                    {paragraphs.map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </div>
                </>
              )
            )}
            {state.status === "ready" && <p className="mt-4 text-xs text-text-tertiary">{t("detail.source")}</p>}
          </section>
        )}
      </article>
    </Modal>
  );
}
