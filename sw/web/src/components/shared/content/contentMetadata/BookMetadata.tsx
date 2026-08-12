"use client";

import { Book, BookOpen, Building2, Calendar, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import type { ContentMetadata } from "@/types/content";

interface BookMetadataProps {
  metadata: ContentMetadata;
  compact: boolean;
  hideLink: boolean;
  bookGrid: boolean;
  internalHref?: string;
}

interface BookInfoItemProps {
  label: string;
  value: string;
  nowrap?: boolean;
}

function BookInfoItem({ label, value, nowrap = false }: BookInfoItemProps) {
  return (
    <div className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] overflow-hidden rounded-md border border-white/[0.08] bg-white/[0.025] text-sm">
      <span className="flex items-center justify-center border-e border-white/[0.08] bg-white/[0.035] px-2 py-2.5 text-center text-sm font-medium text-text-secondary">
        {label}
      </span>
      <span className={`min-w-0 px-3 py-2.5 font-medium text-text-primary ${nowrap ? "whitespace-nowrap" : "break-words"}`}>
        {value}
      </span>
    </div>
  );
}

function CompactInfo({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon size={12} className="shrink-0 text-text-secondary" />
      <span className="text-text-secondary">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </div>
  );
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
          <BookInfoItem label={t("publisher")} value={publisher || t("unverified")} />
          <BookInfoItem label={t("publishDate")} value={publishDate || t("unverified")} nowrap />
          <BookInfoItem label="ISBN" value={isbn || t("unverified")} nowrap />
        </>
      ) : (
        <>
          {publisher && <CompactInfo icon={Building2} label={t("publisher")} value={publisher} />}
          {publishDate && <CompactInfo icon={Calendar} label={t("publishDate")} value={publishDate} />}
          {!compact && isbn && <CompactInfo icon={Book} label="ISBN" value={isbn} />}
        </>
      )}

      {!hideLink && internalHref ? (
        <div className={link ? "grid grid-cols-2 gap-2" : "grid grid-cols-1"}>
          <Link
            href={internalHref}
            data-testid="expand-all-reviews"
            className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-accent/35 bg-accent/10 px-3 py-2 text-center text-sm font-medium text-accent hover:border-accent/65 hover:bg-accent/15"
          >
            <BookOpen size={14} aria-hidden />
            {t("allReviews")}
          </Link>
          {link && (
            <a
              href={link}
              data-testid="expand-book-details"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-center text-sm font-medium text-text-secondary hover:border-white/25 hover:bg-white/[0.08] hover:text-text-primary"
            >
              <ExternalLink size={14} aria-hidden />
              {t("bookDetails")}
            </a>
          )}
        </div>
      ) : !hideLink && link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-accent hover:underline">
          <ExternalLink size={12} />
          {t("viewDetails")}
        </a>
      ) : null}
    </div>
  );
}
