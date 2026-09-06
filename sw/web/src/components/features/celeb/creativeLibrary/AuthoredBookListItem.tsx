"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BookOpenText, ExternalLink } from "lucide-react";
import type { FigureBookContent } from "@/actions/figure-books/getFigureBooks";
import ContentImage from "@/components/ui/ContentImage";
import { AFFILIATE_PLATFORMS } from "@/constants/affiliatePlatforms";

export default function AuthoredBookListItem({ book }: { book: FigureBookContent }) {
  const locale = useLocale();
  const t = useTranslations("celebPage");
  const [editionId, setEditionId] = useState(book.editions[0]?.id);
  const edition = book.editions.find((item) => item.id === editionId) ?? book.editions[0];
  const title = edition?.title || book.title;
  const thumbnail = edition ? edition.thumbnailUrl : book.thumbnailUrl;
  const creator = edition?.creator || book.creator;
  const href = `${locale === "en" ? "/en" : ""}/content/${book.id}?category=book`;

  return (
    <article
      data-creative-source="authored"
      data-content-id={book.id}
      className="w-full max-w-[300px] overflow-hidden rounded-xl border border-border/30 bg-surface/30 md:max-w-none"
    >
      <a
        href={href}
        className="group flex gap-3 p-3 hover:bg-surface-hover/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        <span className="relative h-22 w-16 shrink-0 overflow-hidden rounded-lg bg-surface-hover">
          {thumbnail ? (
            <ContentImage src={thumbnail} alt="" sizes="64px" />
          ) : (
            <span className="flex h-full items-center justify-center text-accent">
              <BookOpenText size={22} aria-hidden />
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium">
            <span className="rounded bg-surface-hover px-1.5 py-0.5 text-text-secondary">{t("worksTypeBook")}</span>
            <span className="rounded bg-accent/10 px-1.5 py-0.5 text-accent">{t("roleAuthor")}</span>
          </span>
          <span className="line-clamp-2 text-sm font-medium leading-snug text-text-primary group-hover:text-accent">{title}</span>
          {creator && <span className="mt-0.5 block truncate text-sm text-text-secondary">{creator}</span>}
          {edition?.publisher && <span className="mt-1.5 block text-xs text-text-secondary">{edition.publisher}</span>}
          {edition?.description && <span className="mt-1.5 line-clamp-2 text-sm text-text-secondary">{edition.description}</span>}
        </span>
      </a>
      {book.editions.length > 1 && (
        <div className="px-3 pb-2">
          <select
            aria-label={t("sourceEditionSelect")}
            value={edition?.id}
            onChange={(event) => setEditionId(Number(event.target.value))}
            className="w-full rounded border border-border/40 bg-surface px-2 py-2 text-xs text-text-secondary hover:border-accent hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {book.editions.map((option) => (
              <option key={option.id} value={option.id}>
                {[option.title, option.publisher].filter(Boolean).join(" · ")}
              </option>
            ))}
          </select>
        </div>
      )}
      {edition?.purchaseUrl && (
        <div className="px-3 pb-3">
          <a
            href={edition.purchaseUrl}
            target="_blank"
            rel="noopener noreferrer nofollow sponsored"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-accent/30 px-3 py-2 text-xs font-medium text-accent hover:border-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {t(edition.platform === "amazon" ? "sourceWorkBuyAmazon" : "sourceWorkBuyCoupang")}
            <ExternalLink size={12} aria-hidden />
          </a>
          {edition.platform === "coupang" && (
            <p className="mt-2 text-xs leading-relaxed text-text-tertiary">{AFFILIATE_PLATFORMS.coupang.notice}</p>
          )}
        </div>
      )}
    </article>
  );
}
