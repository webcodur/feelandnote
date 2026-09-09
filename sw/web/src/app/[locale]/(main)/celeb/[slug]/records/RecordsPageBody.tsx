import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import FormattedText from "@/components/ui/FormattedText";
import { recordsPath } from "./recordsPageData";

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
}

interface Props {
  slug: string;
  locale: string;
  contents: GetUserContentsResponse;
  labels: RecordsLabels;
}

const LINK_CLASS = "text-accent underline underline-offset-4 hover:text-accent-hover";

export default function RecordsPageBody({ slug, locale, contents, labels }: Props) {
  const prefix = locale === "en" ? "/en" : "";
  return (
    <section className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <a href={`${prefix}/celeb/${encodeURIComponent(slug)}#library`} className={`text-sm ${LINK_CLASS}`}>{labels.back}</a>
      <h1 className="mt-6 text-2xl font-bold text-text-primary sm:text-3xl">{labels.title}</h1>
      <p className="mt-3 text-sm text-text-secondary">{labels.page}</p>
      <div className="mt-8 space-y-8">
        {contents.items.map((item) => {
          const review = item.public_record;
          const text = locale === "en" && review?.content_preview_en
            ? review.content_preview_en : review?.content_preview;
          return (
            <article key={item.id} data-record-content={item.content_id} className="rounded-xl border border-white/10 bg-card p-5 sm:p-8">
              <h2 className="text-xl font-semibold text-text-primary">
                <a href={`${prefix}/content/${item.content_id}`} className="hover:text-accent">{item.content.title}</a>
              </h2>
              {item.content.creator && <p className="mt-2 text-sm text-text-secondary">{item.content.creator}</p>}
              <div className="mt-5 text-base leading-relaxed text-text-primary">
                {text && !review?.is_spoiler && <>
                  {locale === "en" && !review?.content_preview_en && <p className="mb-3 text-sm text-text-secondary">{labels.originalLanguage}</p>}
                  <FormattedText text={text} />
                </>}
                {text && review?.is_spoiler && <p className="text-text-secondary">{labels.spoiler}</p>}
                {!text && <p className="text-text-secondary">{labels.emptyReview}</p>}
              </div>
              {item.source_url && <p className="mt-5 break-words text-sm">
                <a href={item.source_url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>{labels.source}: {item.source_url}</a>
              </p>}
            </article>
          );
        })}
      </div>
      <nav aria-label={labels.page} className="mt-10 flex items-center justify-between gap-4 text-sm">
        <span>{contents.page > 1 && <a rel="prev" href={recordsPath(slug, contents.page - 1, locale)} className={LINK_CLASS}>{labels.previous}</a>}</span>
        <span className="text-text-secondary">{labels.page}</span>
        <span>{contents.page < contents.totalPages && <a rel="next" href={recordsPath(slug, contents.page + 1, locale)} className={LINK_CLASS}>{labels.next}</a>}</span>
      </nav>
    </section>
  );
}
