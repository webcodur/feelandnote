"use client";

import { useEffect, useRef, type CSSProperties } from "react";

import type { GetUserContentsResponse } from "@/actions/contents/getUserContents";
import ContentImage from "@/components/ui/ContentImage";
import ContentReadingText from "@/components/ui/ContentReadingText";
import FormattedText from "@/components/ui/FormattedText";
import NoEditionBadge from "@/components/ui/NoEditionBadge";

import type { RecordsLabels } from "./RecordsPageBody";

interface RecordsListProps {
  locale: string;
  items: GetUserContentsResponse["items"];
  descriptions: Record<string, string | null>;
  initialFocusContentId?: string;
  startIndex?: number;
  labels: Pick<
    RecordsLabels,
    "source" | "emptyReview" | "spoiler" | "originalLanguage" | "introduction" | "myReview"
  >;
}

const LINK_CLASS = "text-accent underline underline-offset-4 hover:text-accent-hover";
const READING_LABEL_CLASS = "text-xs font-black uppercase tracking-[0.16em] text-3d-gold-bright";
const READING_LABEL_STYLE = { filter: "none" } satisfies CSSProperties;
const REVIEW_SECTION_CLASS = "relative mt-10 border-t border-accent/25 pt-9 sm:mt-14 sm:pt-10";

export default function RecordsList({
  locale,
  items,
  descriptions,
  initialFocusContentId,
  startIndex = 0,
  labels,
}: RecordsListProps) {
  const prefix = locale === "en" ? "/en" : "";
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialFocusContentId) return;
    const target = [...(listRef.current?.querySelectorAll<HTMLElement>("[data-record-content]") ?? [])]
      .find((element) => element.dataset.recordContent === initialFocusContentId);
    target?.scrollIntoView({ block: "start" });
  }, [initialFocusContentId]);

  return (
    <div ref={listRef} className="space-y-8">
      {items.map((item, index) => {
        const review = item.public_record;
        const text = locale === "en" && review?.content_preview_en
          ? review.content_preview_en
          : review?.content_preview;
        const thumbnail = locale === "en" && item.content.thumbnail_en
          ? item.content.thumbnail_en
          : item.content.thumbnail_url;
        const description = descriptions[item.content_id];
        const titleId = `record-title-${item.content_id}`;

        return (
          <article
            key={item.id}
            data-record-content={item.content_id}
            data-record-index={startIndex + index}
            aria-labelledby={titleId}
            className="scroll-mt-20 overflow-hidden rounded-xl border border-white/10 bg-bg-card"
          >
            <header className="flex items-center gap-3 border-b border-white/10 bg-bg-secondary/55 px-4 py-4 sm:px-6">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-accent/30 font-mono text-xs tabular-nums text-accent">
                {startIndex + index + 1}
              </span>
              <div className="min-w-0 flex-1 text-center">
                <h2 id={titleId} className="text-lg font-semibold text-text-primary sm:text-xl lg:text-2xl">
                  <a href={`${prefix}/content/${item.content_id}`} className="hover:text-accent">
                    <NoEditionBadge badge={item.content.title_badge} />
                    {item.content.title}
                  </a>
                </h2>
                {item.content.creator && (
                  <p className="mt-1 truncate text-sm text-text-secondary lg:text-base">
                    {item.content.creator}
                  </p>
                )}
              </div>
              <span className="size-8 shrink-0" aria-hidden />
            </header>

            <div className="p-5 sm:p-8 lg:p-10">
              {thumbnail && (
                <div className="relative mx-auto mb-5 aspect-[2/3] w-24 overflow-hidden rounded-md border border-white/10 bg-bg-secondary shadow-lg sm:w-28">
                  <ContentImage src={thumbnail} alt={item.content.title} sizes="112px" />
                </div>
              )}

              {description && (
                <div>
                  <p className={`${READING_LABEL_CLASS} text-center`} style={READING_LABEL_STYLE}>
                    {labels.introduction}
                  </p>
                  <ContentReadingText text={description} tone="secondary" size="reader" className="mt-3" />
                </div>
              )}

              <div className={description ? REVIEW_SECTION_CLASS : "relative"}>
                {description && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -top-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-accent/75"
                  />
                )}
                <p className={`${READING_LABEL_CLASS} text-center`} style={READING_LABEL_STYLE}>
                  {labels.myReview}
                </p>
                <ContentReadingText tone="primary" size="reader" className="mt-4">
                  {text && !review?.is_spoiler && (
                    <>
                      {locale === "en" && !review?.content_preview_en && (
                        <p className="mb-3 text-sm text-text-secondary">{labels.originalLanguage}</p>
                      )}
                      <FormattedText text={text} />
                    </>
                  )}
                  {text && review?.is_spoiler && (
                    <p className="text-text-secondary">{labels.spoiler}</p>
                  )}
                  {!text && <p className="text-text-secondary">{labels.emptyReview}</p>}
                </ContentReadingText>
                {item.source_url && (
                  <p className="mt-6 break-words border-t border-white/10 pt-4 text-sm">
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={LINK_CLASS}
                    >
                      {labels.source}: {item.source_url}
                    </a>
                  </p>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
