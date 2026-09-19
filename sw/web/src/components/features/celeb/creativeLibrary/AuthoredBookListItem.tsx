"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { BookOpenText } from "lucide-react";
import type { FigureBookContent } from "@/actions/figure-books/getFigureBooks";
import ContentImage from "@/components/ui/ContentImage";
import NoEditionBadge from "@/components/ui/NoEditionBadge";
import { useBookIntroduction } from "@/hooks/useBookIntroduction";
import RetryBlock from "@/components/ui/pending/RetryBlock";
import BookIntroductionSource from "@/components/shared/BookIntroductionSource";
import BookPurchaseSummary from "@/components/features/commerce/BookPurchaseSummary";
import type { AffiliateLink } from "@/constants/affiliatePlatforms";

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
  // 통합 구매 모듈의 서점 링크 — 판본 상품 주소에 작품의 보유 서점 링크를 잇는다
  const purchaseModuleLinks: AffiliateLink[] = [
    ...(edition?.purchaseUrl && edition.platform
      ? [{ platform: edition.platform, url: edition.purchaseUrl }]
      : []),
    ...(book.affiliateLinks ?? []),
  ];
  const href = `${locale === "en" ? "/en" : ""}/content/${book.id}?category=book`;

  return (
    <article
      ref={cardRef}
      data-creative-source="authored"
      data-content-id={book.id}
      className="w-full max-w-[300px] overflow-hidden rounded-xl border border-border/30 bg-bg-card/30 md:max-w-none"
    >
      <a
        href={href}
        className="group flex gap-3 p-3 hover:bg-bg-stone-light/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
      >
        <span className="relative h-22 w-16 shrink-0 overflow-hidden rounded-lg bg-bg-stone-light">
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
            <span className="rounded bg-bg-stone-light px-1.5 py-0.5 text-text-secondary">{t("worksTypeBook")}</span>
            <span className="rounded bg-accent/10 px-1.5 py-0.5 text-accent">{t("roleAuthor")}</span>
          </span>
          <span className="line-clamp-2 text-sm font-medium leading-snug text-text-primary group-hover:text-accent">
            <NoEditionBadge badge={edition?.title ? null : book.titleBadge} />
            {title}
          </span>
          {creator && <span className="mt-0.5 block truncate text-sm text-text-secondary">{creator}</span>}
          {edition?.publisher && <span className="mt-1.5 block text-xs text-text-secondary">{edition.publisher}</span>}
        </span>
      </a>
      {description && (
        <div className="px-3 pb-3">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <p className="text-xs font-medium text-text-secondary">{t("sourceWorkIntroduction")}</p>
            <BookIntroductionSource attribution={edition ? edition.introductionAttribution : book.introductionAttribution} />
          </div>
          <p className="line-clamp-2 text-sm text-text-secondary">{description}</p>
        </div>
      )}
      {failed && <RetryBlock onRetry={retry} className="px-3 py-3" />}
      {/* 통합 구매 모듈 — 출판사·소개·판본의 책정보 흐름에 붙인다. 누르면 서점 링크·주의 안내 창이 뜬다 */}
      <BookPurchaseSummary
        contentId={book.id}
        editionId={edition?.id}
        title={title}
        creator={creator}
        links={purchaseModuleLinks}
        enabled={book.type === "BOOK"}
        full
        className="px-3 pb-3"
      />
      {book.editions.length > 1 && (
        <div className="px-3 pb-2">
          <select
            aria-label={t("sourceEditionSelect")}
            value={edition?.id}
            onChange={(event) => setEditionId(Number(event.target.value))}
            className="w-full rounded border border-border/40 bg-bg-card px-2 py-2 text-xs text-text-secondary hover:border-accent hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {book.editions.map((option) => (
              <option key={option.id} value={option.id}>
                {[option.title, option.publisher].filter(Boolean).join(" · ")}
              </option>
            ))}
          </select>
        </div>
      )}
    </article>
  );
}
