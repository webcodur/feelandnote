"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BookOpenText, ExternalLink } from "lucide-react";
import type { FigureBookContent } from "@/actions/figure-books/getFigureBooks";
import ContentImage from "@/components/ui/ContentImage";
import { AFFILIATE_PLATFORMS } from "@/constants/affiliatePlatforms";
import CoupangPurchaseInfo from "@/components/shared/CoupangPurchaseInfo";
import { useBookIntroduction } from "@/hooks/useBookIntroduction";
import RetryBlock from "@/components/ui/pending/RetryBlock";

export default function AuthoredBookListItem({ book }: { book: FigureBookContent }) {
  const locale = useLocale();
  const t = useTranslations("celebPage");
  const [editionId, setEditionId] = useState(book.editions[0]?.id);
  const edition = book.editions.find((item) => item.id === editionId) ?? book.editions[0];
  const { ref: cardRef, description, failed, retry } = useBookIntroduction(
    edition ? edition.bookIntroduction : book.bookIntroduction,
    locale,
    edition ? edition.description : book.description,
    true,
  );
  const title = edition?.title || book.title;
  const thumbnail = edition ? edition.thumbnailUrl : book.thumbnailUrl;
  const creator = edition?.creator || book.creator;
  const href = `${locale === "en" ? "/en" : ""}/content/${book.id}?category=book`;

  return (
    <article
      ref={cardRef}
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
          {description && <span className="mt-1.5 line-clamp-2 text-sm text-text-secondary">{description}</span>}
        </span>
      </a>
      {failed && <RetryBlock onRetry={retry} className="px-3 py-3" />}
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
          <div className="group/coupang-buy relative inline-flex">
            <a
              href={edition.purchaseUrl}
              target="_blank"
              rel="noopener noreferrer nofollow sponsored"
              className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-accent/30 py-2 font-medium text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${edition.platform === "coupang" ? "px-10 text-base group-hover/coupang-buy:border-accent group-hover/coupang-buy:bg-accent/20" : "px-3 text-xs hover:border-accent hover:bg-accent/10"}`}
            >
              {t(edition.platform === "amazon" ? "sourceWorkBuyAmazon" : "sourceWorkBuyCoupang")}
              {edition.platform !== "coupang" && <ExternalLink size={12} aria-hidden />}
            </a>
            {edition.platform === "coupang" && <CoupangPurchaseInfo className="absolute end-1 top-1/2 -translate-y-1/2 text-accent" />}
          </div>
          {edition.platform === "coupang" && (
            <p className="mt-2 text-xs leading-relaxed text-text-tertiary">{AFFILIATE_PLATFORMS.coupang.notice}</p>
          )}
        </div>
      )}
    </article>
  );
}
