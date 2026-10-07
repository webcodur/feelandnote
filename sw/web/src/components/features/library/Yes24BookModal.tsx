"use client";

// 차트의 책 정보 창. 한국어는 YES24 상세, 영문은 같은 Apple 도서 ID의 소개를 읽고 구매는 Amazon으로 잇는다.
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { getYes24BookDetail } from "@/actions/library/getYes24BookDetail";
import { getAppleBookDetail } from "@/actions/library/getAppleBookDetail";
import type { BestsellerItem } from "@/actions/library/types";
import type { AppleBookDetail } from "@/lib/library/appleBookDetail";
import type { Yes24BookDetail } from "@/lib/books/yes24Purchase";
import BookIntroductionSource from "@/components/shared/BookIntroductionSource";
import ContentInfoDialog from "@/components/shared/content/ContentInfoDialog";
import ContentDescription from "@/components/shared/content/ContentDescription";

type DetailState =
  | { status: "loading" }
  | { status: "ready"; detail: Yes24BookDetail | null; apple: AppleBookDetail | null }
  | { status: "failed" };

export default function Yes24BookModal({ item, onClose }: { item: BestsellerItem; onClose: () => void }) {
  const t = useTranslations("library.popular");
  const locale = useLocale();
  const isYes24 = item.id.startsWith("yes24-");
  const isbn = isYes24 ? item.isbn : null;
  const canFetch = Boolean(isYes24 ? isbn : item.id.startsWith("apple-books-"));
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<DetailState>(() => canFetch
    ? { status: "loading" } : { status: "ready", detail: null, apple: null });

  useEffect(() => {
    if (!canFetch) return;
    let alive = true;
    const read = isYes24 && isbn
      ? getYes24BookDetail(isbn).then(detail => ({ detail, apple: null }))
      : getAppleBookDetail(item.id).then(apple => ({ detail: null, apple }));
    read.then(result => { if (alive) setState({ status: "ready", ...result }); })
      .catch(() => { if (alive) setState({ status: "failed" }); });
    return () => { alive = false; };
  }, [canFetch, isYes24, isbn, item.id, attempt]);

  const detail = state.status === "ready" ? state.detail : null;
  const apple = state.status === "ready" ? state.apple : null;
  const title = detail?.title ?? item.title;
  const cover = detail?.cover ?? item.thumbnail_url;
  const author = detail?.author ?? item.creator;
  const purchaseHref = detail?.purchaseUrl ?? item.purchase_url ?? item.source_url;
  const description = detail?.introduction ?? apple?.description ?? item.description ?? "";
  const published = detail?.publishDate ?? apple?.releaseDate ?? item.published_date;
  const date = published ? new Date(published) : null;
  const publishedLabel = date && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(date) : null;
  const number = new Intl.NumberFormat(locale);
  const facts = [
    (detail?.publisher ?? item.publisher) ? { label: t("detail.publisher"), value: detail?.publisher ?? item.publisher } : null,
    publishedLabel ? { label: t("detail.published"), value: publishedLabel } : null,
    detail?.pages ? { label: t("detail.pages"), value: t("detail.pageCount", { count: detail.pages }) } : null,
    apple?.genres.length ? { label: t("detail.genre"), value: apple.genres.join(" · ") } : null,
  ].filter(fact => fact !== null);
  const discounted = detail?.onSale && detail.salePrice != null && detail.shopPrice != null && detail.shopPrice > detail.salePrice;
  const sourceUrl = apple?.sourceUrl ?? item.source_url ?? null;

  const prices = (detail?.onSale && detail.salePrice != null || (detail?.starScore ?? 0) > 0) && (
    <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
      {detail?.onSale && detail.salePrice != null && <span className="font-semibold tabular-nums text-text-primary">{t("detail.price", { price: number.format(detail.salePrice) })}</span>}
      {discounted && detail?.shopPrice != null && <span className="tabular-nums text-text-tertiary line-through">{t("detail.price", { price: number.format(detail.shopPrice) })}</span>}
      {(detail?.starScore ?? 0) > 0 && <span className="inline-flex items-center gap-1 text-accent"><Star size={13} className="fill-current" aria-hidden />{t("detail.rating", { score: detail?.starScore ?? 0 })}</span>}
    </p>
  );

  return <ContentInfoDialog type="BOOK" title={title} creator={author} thumbnail={cover} subtitle={detail?.subTitle}
    label={t("rank", { rank: item.rank })} facts={facts} extra={prices} onClose={onClose}
    purchase={{ contentId: item.id, type: "BOOK", title, creator: author, thumbnail: cover,
      placement: "popular-chart", bookLocale: isYes24 ? "ko" : "en", isbn: item.isbn ?? undefined,
      yes24Href: isYes24 ? purchaseHref ?? undefined : undefined }}>
    <ContentDescription title={t("detail.introduction")} description={description}
      source={<BookIntroductionSource attribution={{ provider: isYes24 ? "yes24" : "itunes", url: sourceUrl, translated: false }} />}
      status={state.status === "failed" ? "failed" : state.status === "loading" ? "loading" : "ready"}
      loadingLabel={t("detail.loading")} emptyLabel={t("detail.unavailable")} failedLabel={t("detail.failed")}
      onRetry={() => { setState({ status: "loading" }); setAttempt(value => value + 1); }} />
  </ContentInfoDialog>;
}
