"use client";

import { BookOpenText } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { BookShelfBook } from "./types";
import type { FigureBookEdition } from "@/actions/figure-books/figureBookLocale";
import ContentImage from "@/components/ui/ContentImage";
import ContentCoverLink from "@/components/shared/ContentCoverLink";
import BookShelfEditionHeading from "./BookShelfEditionHeading";
import BookShelfArrival from "./BookShelfArrival";
import BookIntroductionPanel from "@/components/shared/BookIntroductionPanel";
import BookPurchaseSummary from "@/components/features/commerce/BookPurchaseSummary";
import type { AffiliateLink } from "@/constants/affiliatePlatforms";
import { useBookIntroduction } from "@/hooks/useBookIntroduction";
import RetryBlock from "@/components/ui/pending/RetryBlock";
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
      introductionAttribution: source.introductionAttribution, platform: null, purchaseUrl: null };
  const introduction = useBookIntroduction(edition.bookIntroduction, locale, edition.description, lazyIntroduction);
  const busy = loading || introduction.pending;
  const purchaseLinks: AffiliateLink[] = [
    ...(edition.purchaseUrl && edition.platform ? [{ platform: edition.platform, url: edition.purchaseUrl }] : []),
    ...(edition.id === (source.preferredEditionId ?? source.editions[0]?.id) ? source.affiliateLinks ?? [] : []),
  ];
  const meta = [
    { label: t("sourceWorkPublisher"), value: edition.publisher },
    { label: t("sourceWorkReleaseDate"), value: formatDate(edition.releaseDate ?? null, locale) },
    { label: "ISBN", value: edition.isbn },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

  return (
    <article ref={lazyIntroduction ? introduction.ref : undefined} className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-5 gap-y-4 p-4 sm:grid-cols-[144px_minmax(0,1fr)] sm:grid-rows-[auto_auto_1fr] sm:gap-x-6 sm:p-6"
      data-bookshelf-feature={active ? true : undefined} data-book-id={source.id} data-edition-id={edition.id} aria-busy={busy}>
      <div data-testid="related-book-media" className={styles.media}>
        <div className={styles.cover}><div className={styles.coverImage}>
          <ContentCoverLink href={`/content/${source.id}?category=book`} title={edition.title}
            imageSrc={edition.thumbnailUrl} className="absolute inset-0 h-full w-full">
            <BookOpenText size={28} className="absolute inset-0 m-auto text-text-tertiary" aria-hidden />
            {edition.thumbnailUrl && <ContentImage src={edition.thumbnailUrl} alt={edition.title}
              sizes="(max-width: 639px) 88px, 144px" className="object-contain" />}
          </ContentCoverLink>
        </div></div>
        <BookPurchaseSummary contentId={source.id} editionId={edition.id} isbn={edition.isbn ?? undefined}
          title={edition.title || source.title} creator={edition.creator || source.creator}
          thumbnail={edition.thumbnailUrl} links={purchaseLinks}
          className="col-start-2 row-start-2 self-start sm:w-full" />
      </div>
      <header className="col-start-2 row-start-1 min-w-0 self-center sm:self-start">
        <BookShelfEditionHeading source={source} edition={edition} sharedEditionKeys={sharedEditionKeys} />
      </header>
      <BookShelfArrival name="introduction" ready={introduction.failed || !busy}
        className="col-span-2 row-start-3 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-2">
        {introduction.failed && <RetryBlock onRetry={introduction.retry} />}
        {!introduction.failed && <BookIntroductionPanel key={edition.id ?? source.id}
          description={introduction.description || t("sourceWorkIntroductionEmpty")}
          attribution={edition.introductionAttribution} showSource={!!introduction.description}
          label={t("sourceWorkIntroduction")} loading={busy}
          sourceTitle={edition.title} appearance="plain" className={styles.introduction} />}
      </BookShelfArrival>
      {meta.length > 0 && <BookShelfArrival name="metadata" ready={!loading}
        className="col-span-2 row-start-4 min-w-0 sm:col-span-1 sm:col-start-2 sm:row-start-3">
      <dl className="flex flex-wrap gap-x-6 gap-y-2 border-t border-white/[0.07] pt-3">
        {meta.map(({ label, value }) => <div key={label} className="flex min-w-0 items-baseline gap-2 text-xs leading-5">
          <dt className="shrink-0 text-text-tertiary">{label}</dt><dd className="break-all text-text-secondary">{value}</dd>
        </div>)}
      </dl></BookShelfArrival>}
    </article>
  );
}
