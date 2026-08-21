"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { ContentMetadata } from "@/types/content";
import MetadataField from "../MetadataField";

interface BookMetadataProps {
  metadata: ContentMetadata;
  compact: boolean;
  hideLink: boolean;
  bookGrid: boolean;
  internalHref?: string;
}

export default function BookMetadata({
  metadata,
  compact,
  hideLink,
  bookGrid,
  internalHref,
}: BookMetadataProps) {
  const t = useTranslations("shared.content");
  const { publisher, publishDate, isbn, link } = metadata;
  const useGrid = bookGrid && !compact;

  return (
    <div className={useGrid ? "grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-x-6" : `flex flex-col ${compact ? "gap-1.5" : "gap-3"}`}>
      {useGrid ? (
        <>
          <MetadataField label={t("publisher")} value={publisher || t("unverified")} />
          <MetadataField label={t("publishDate")} value={publishDate || t("unverified")} nowrap />
          <MetadataField label="ISBN" value={isbn || t("unverified")} nowrap />
        </>
      ) : (
        <>
          {publisher && <MetadataField label={t("publisher")} value={publisher} compact={compact} />}
          {publishDate && <MetadataField label={t("publishDate")} value={publishDate} compact={compact} />}
          {!compact && isbn && <MetadataField label="ISBN" value={isbn} />}
        </>
      )}

      {!hideLink && internalHref ? (
        <div className={link ? "grid grid-cols-2 gap-2" : "grid grid-cols-1"}>
          <Link
            href={internalHref}
            data-testid="expand-all-reviews"
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-accent/35 bg-accent/10 px-3 py-2 text-center text-sm font-medium text-accent hover:border-accent/65 hover:bg-accent/15"
          >
            {t("allReviews")}
          </Link>
          {link && (
            <a
              href={link}
              data-testid="expand-book-details"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center justify-center rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-sm font-medium text-text-secondary hover:border-white/25 hover:bg-white/[0.08] hover:text-text-primary"
            >
              {t("bookDetails")}
            </a>
          )}
        </div>
      ) : !hideLink && link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
          {t("viewDetails")}
        </a>
      ) : null}
    </div>
  );
}
