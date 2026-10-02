"use client";

import { BookOpenText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { BookShelfBook } from "./types";
import type { FigureBookEdition } from "@/actions/figure-books/figureBookLocale";
import ContentImage from "@/components/ui/ContentImage";
import ContentCoverLink from "@/components/shared/ContentCoverLink";
import BookShelfEditionHeading from "./BookShelfEditionHeading";
import BookShelfArrival from "./BookShelfArrival";
import ContentIntro from "@/components/features/user/contentLibrary/expand/ContentIntro";
import BookPurchaseSummary from "@/components/features/commerce/BookPurchaseSummary";
import type { AffiliateLink } from "@/constants/affiliatePlatforms";
import { useBookIntroduction } from "@/hooks/useBookIntroduction";
import RetryBlock from "@/components/ui/pending/RetryBlock";
import { getContentDetailHref } from "@/lib/books/contentEdition";
import styles from "./BookShelf.module.css";

interface Props {
  source: BookShelfBook;
  edition?: FigureBookEdition;
  active?: boolean; lazyIntroduction?: boolean;
  loading?: boolean;
  sharedEditionKeys?: ReadonlySet<string>;
}

function formatDate(value: string | null, locale: string): string | null {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
    year: "numeric", month: "short", day: "numeric", timeZone: "UTC",
  }).format(date);
}

/** 작품을 고른 뒤에는 모든 책장이 같은 표지·판본·소개·서지를 보여준다. */
export default function BookShelfEditionDetail({ source, edition: selectedEdition, active = true, lazyIntroduction = false, sharedEditionKeys, loading = false }: Props) {
  const locale = useLocale();
  const t = useTranslations("celebPage");
  const edition = selectedEdition ?? source.editions[0]
    ?? { id: undefined, title: source.title, creator: source.creator, thumbnailUrl: source.thumbnailUrl,
      isbn: source.isbn, publisher: source.publisher, releaseDate: source.releaseDate,
      description: source.description, bookIntroduction: source.bookIntroduction,
      introductionAttribution: source.introductionAttribution, platform: null, purchaseUrl: null,
      affiliateLinks: source.affiliateLinks };
  const introduction = useBookIntroduction(edition.bookIntroduction, locale, edition.description, lazyIntroduction);
  const busy = loading || introduction.pending;
  const purchaseLinks: AffiliateLink[] = [
    ...(edition.purchaseUrl && edition.platform ? [{ platform: edition.platform, url: edition.purchaseUrl }] : []),
    ...(edition.affiliateLinks ?? []),
  ];
  const meta = [
    { label: t("sourceWorkPublisher"), value: edition.publisher },
    { label: t("sourceWorkReleaseDate"), value: formatDate(edition.releaseDate ?? null, locale) },
    { label: "ISBN", value: edition.isbn },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

  return (
    <article ref={lazyIntroduction ? introduction.ref : undefined} className="flow-root px-3 py-5 sm:grid sm:grid-cols-[192px_minmax(0,1fr)] sm:gap-x-6 sm:gap-y-4 sm:px-4 md:px-5 md:py-6"
      data-bookshelf-feature={active ? true : undefined} data-book-id={source.id} data-edition-id={edition.id} aria-busy={busy}>
      <div data-testid="related-book-media" className="float-start mb-2 me-4 w-24 sm:col-start-1 sm:row-start-1 sm:float-none sm:m-0 sm:flex sm:w-full sm:flex-col sm:gap-3">
        <div className={styles.cover}><div className={styles.coverImage}>
          <ContentCoverLink href={getContentDetailHref(source.id, edition.id)} title={edition.title}
            imageSrc={edition.thumbnailUrl} className="absolute inset-0 h-full w-full">
            <BookOpenText size={28} className="absolute inset-0 m-auto text-text-tertiary" aria-hidden />
            {edition.thumbnailUrl && <ContentImage src={edition.thumbnailUrl} alt={edition.title}
              sizes="(max-width: 639px) 96px, 192px" className="object-contain" />}
          </ContentCoverLink>
        </div></div>
        <BookPurchaseSummary contentId={source.id} editionId={edition.id} isbn={edition.isbn ?? undefined}
          title={edition.title || source.title} creator={edition.creator || source.creator}
          thumbnail={edition.thumbnailUrl} links={purchaseLinks}
          className="mt-1 w-full self-start sm:mt-0" />
      </div>
      <div className="min-w-0 sm:col-start-2 sm:row-start-1 sm:flex sm:flex-col sm:contain-size" aria-busy={busy}>
        <BookShelfEditionHeading source={source} edition={edition} sharedEditionKeys={sharedEditionKeys} />
        {introduction.failed && <RetryBlock onRetry={introduction.retry} />}
        {!introduction.failed && <div className="sm:flex sm:min-h-0 sm:flex-1 sm:flex-col">
          <ContentIntro key={edition.id ?? source.id} category="book" isLoading={busy} inlineLabel
            brief={{ contentId: source.id, category: "book", description: introduction.description,
              bookIntroduction: edition.bookIntroduction, introductionAttribution: edition.introductionAttribution,
              releaseDate: edition.releaseDate ?? null, metadata: null }} />
        </div>}
      </div>
      {meta.length > 0 && <BookShelfArrival name="metadata" ready={!loading}
        className="clear-both min-w-0 sm:col-span-2 sm:row-start-2">
      {/* 모바일 여백도 높이 측정 대상에 넣어 마지막 서지 행이 잘리지 않게 한다. */}
      <div className="pt-3 sm:pt-0">
      <dl className="flex flex-wrap gap-x-6 gap-y-2 border-t border-white/[0.07] pt-3">
        {meta.map(({ label, value }) => <div key={label} className="flex min-w-0 items-baseline gap-2 text-xs leading-5">
          <dt className="shrink-0 text-text-tertiary">{label}</dt><dd className="break-all text-text-secondary">{value}</dd>
        </div>)}
      </dl></div></BookShelfArrival>}
    </article>
  );
}
