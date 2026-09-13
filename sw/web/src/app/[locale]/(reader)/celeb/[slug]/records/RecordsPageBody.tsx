import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";

import BackToLibraryLink from "./BackToLibraryLink";
import RecordsList from "./RecordsList";
import { RECORDS_PAGE_SIZE, recordsPath } from "./recordsPageData";

export interface RecordsLabels {
  title: string;
  back: string;
  previous: string;
  next: string;
  page: string;
  source: string;
  emptyReview: string;
  spoiler: string;
  originalLanguage: string;
  introduction: string;
  myReview: string;
}

interface RecordsPageBodyProps {
  slug: string;
  locale: string;
  contents: GetUserContentsResponse;
  descriptions: Record<string, string | null>;
  initialFocusContentId?: string;
  labels: RecordsLabels;
}

export const PAGE_HEADER_HEIGHT_CLASS = "h-12";

export default function RecordsPageBody({
  slug,
  locale,
  contents,
  descriptions,
  initialFocusContentId,
  labels,
}: RecordsPageBodyProps) {
  const prefix = locale === "en" ? "/en" : "";
  const pageLinkClass = "rounded-lg border border-white/15 px-4 py-2 text-sm text-text-primary hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  const pagination = contents.totalPages > 1 && (
    <nav aria-label={labels.page} className="flex items-center justify-between gap-3 py-5">
      {contents.page > 1 ? (
        <a href={`${prefix}${recordsPath(slug, contents.page - 1)}`} rel="prev" className={pageLinkClass}>
          {labels.previous}
        </a>
      ) : <span />}
      <span className="text-sm tabular-nums text-text-secondary">{labels.page}</span>
      {contents.page < contents.totalPages ? (
        <a href={`${prefix}${recordsPath(slug, contents.page + 1)}`} rel="next" className={pageLinkClass}>
          {labels.next}
        </a>
      ) : <span />}
    </nav>
  );

  return (
    <>
      <div className="sticky top-0 z-20 border-b border-white/10 bg-[color-mix(in_srgb,var(--color-bg-main)_92%,transparent)] backdrop-blur-md">
        <div className={`relative mx-auto flex ${PAGE_HEADER_HEIGHT_CLASS} max-w-3xl items-center justify-center px-4 lg:max-w-4xl`}>
          <BackToLibraryLink
            href={`${prefix}/celeb/${encodeURIComponent(slug)}?instant=1#library`}
            label={labels.back}
            className="absolute left-4 flex size-8 items-center justify-center rounded-full border border-white/15 text-text-primary hover:border-accent hover:text-accent"
          />
          <h1 className="max-w-[75%] truncate text-base font-bold text-text-primary sm:text-lg">
            {labels.title}
          </h1>
        </div>
      </div>

      <section className="mx-auto max-w-3xl px-4 pb-10 pt-6 sm:pb-16 lg:max-w-4xl">
        {pagination}
        <RecordsList
          locale={locale}
          items={contents.items}
          descriptions={descriptions}
          initialFocusContentId={initialFocusContentId}
          startIndex={(contents.page - 1) * RECORDS_PAGE_SIZE}
          labels={labels}
        />
        {pagination}
      </section>
    </>
  );
}
