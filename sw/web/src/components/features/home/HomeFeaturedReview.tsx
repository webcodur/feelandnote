"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import NationalityText from "@/components/ui/NationalityText";
import { useProfessionLabel } from "@/hooks/useFilterLabels";
import { formatCelebPeriod } from "@/lib/utils/celeb-period";
import CelebImage from "@/components/ui/CelebImage";
import CelebProfessionMark from "@/components/features/celeb/CelebProfessionMark";
import BookShelfReviewDetail from "@/components/shared/BookShelf/BookShelfReviewDetail";
import ContentCover from "@/components/ui/ContentCover";
import ContentCoverLink from "@/components/shared/ContentCoverLink";
import ContentPurchaseAction from "@/components/features/commerce/ContentPurchaseAction";
import { TYPE_ICONS } from "@/components/ui/cards/ContentCard/constants";
import { getCategoryByDbType } from "@/constants/categories";
import { getCelebProfileUrl } from "@/lib/url";
import { homeReadingBook } from "./homeReadingBook";
import type { ContentType } from "@/types/database";

/** 언어 선택과 후보 선정은 호출부가 맡는다. 공통 책장으로 감상 한 건의 전문을 표시한다. */
export interface HomeFeaturedReviewData {
  id: string;
  review: string;
  sourceUrl: string | null;
  figure: { id: string; slug: string | null; name: string; avatarUrl: string | null; profession?: string | null; nationality?: string | null; birthDate?: string | null; deathDate?: string | null };
  content: { id: string; type: ContentType; title: string; creator: string | null; thumbnailUrl: string | null; isbn?: string | null; affiliateUrl?: unknown };
}

export default function HomeFeaturedReview({ item }: { item: HomeFeaturedReviewData }) {
  const locale = useLocale();
  const t = useTranslations("home.featuredReview");
  const professionLabel = useProfessionLabel();
  const period = formatCelebPeriod(item.figure.birthDate, item.figure.deathDate);
  const figureHref = getCelebProfileUrl(item.figure);
  const book = useMemo(() => homeReadingBook(item.content, {
    id: item.id, review: item.review, reviewEn: locale === "en" ? item.review : null, sourceUrl: item.sourceUrl,
  }), [item, locale]);
  const contentIds = useMemo(() => [item.content.id], [item.content.id]);
  const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
  const creator = item.content.creator?.replace(/\^/g, ", ") ?? null;
  const category = getCategoryByDbType(item.content.type)?.id ?? "book";
  const figure = <div className="flex min-w-0 items-center gap-2 whitespace-nowrap leading-5" data-featured-figure-basics>
    <Link href={figureHref} title={item.figure.name} className={"group inline-flex min-w-0 items-center gap-2 rounded-sm text-sm font-semibold text-text-primary hover:text-accent " + focus}>
      <span className="relative block size-8 shrink-0 overflow-hidden rounded-full border border-line bg-portrait-stage group-hover:border-accent">
        <CelebImage src={item.figure.avatarUrl} alt="" shape="circle" fallbackSize={18} />
      </span>
      <h4 className="truncate">{item.figure.name}</h4>
    </Link>
    {(item.figure.profession || item.figure.nationality || period) && <div className="flex shrink-0 items-center gap-2 text-xs text-text-secondary">
        {item.figure.profession && <span className="inline-flex items-center gap-1.5">
          <span role="img" aria-label={professionLabel(item.figure.profession)} title={professionLabel(item.figure.profession)}><CelebProfessionMark profession={item.figure.profession} size={14} /></span>
          <span className="hidden md:inline">{professionLabel(item.figure.profession)}</span>
        </span>}
        {item.figure.nationality && <span className="inline-flex items-center gap-2">
          {item.figure.profession && <span aria-hidden className="text-text-tertiary">·</span>}
          <NationalityText code={item.figure.nationality} />
        </span>}
        {period && <span className="hidden items-center gap-2 tabular-nums text-text-tertiary md:inline-flex">
          {(item.figure.profession || item.figure.nationality) && <span aria-hidden>·</span>}
          {period}
        </span>}
    </div>}
  </div>;

  return (
    <article className="mx-auto w-full min-w-0 max-w-4xl" aria-label={t("cardLabel", { name: item.figure.name, title: item.content.title })}>
      <div data-testid="featured-review-hero" className="mb-6 flex min-w-0 flex-col items-center text-center md:mb-8">
        <ContentCoverLink href={`/content/${item.content.id}?category=${category}`} title={item.content.title}
          imageSrc={item.content.thumbnailUrl} contentType={item.content.type}
          className="h-[270px] w-[180px] rounded-lg border border-white/10 bg-bg-secondary shadow-lg hover:border-accent/50 md:h-[324px] md:w-[216px]">
          <ContentCover src={item.content.thumbnailUrl} alt={item.content.title} ContentIcon={TYPE_ICONS[item.content.type]}
            sizes="(max-width: 767px) 180px, 216px" className="object-contain" loading="eager" />
        </ContentCoverLink>
        <Link href={`/content/${item.content.id}?category=${category}`} className={`group mt-3 max-w-2xl rounded-sm px-3 ${focus}`}>
          <h3 className="text-balance break-keep text-[1.75rem] font-bold leading-tight tracking-tight text-text-primary [overflow-wrap:anywhere] group-hover:text-accent md:text-4xl">{item.content.title}</h3>
        </Link>
        {creator && <p className="mt-1.5 max-w-xl text-balance break-keep px-3 text-sm leading-relaxed text-text-secondary md:text-base">{creator}</p>}
        <ContentPurchaseAction contentId={item.content.id} type={item.content.type} placement="library-expand"
          title={item.content.title} creator={creator} thumbnail={item.content.thumbnailUrl} isbn={item.content.isbn ?? undefined}
          affiliateUrl={item.content.affiliateUrl} className="mt-4 w-[180px] md:w-[216px]" />
      </div>
      <div className="overflow-hidden rounded-xl border border-white/20 bg-bg-card">
        <BookShelfReviewDetail record={book.readingRecord!} celebId={item.figure.id} ownerNickname={item.figure.name}
          contentIds={contentIds} selectedIndex={0} expanded reviewHeader={figure} recordIsComplete showMedia={false} />
      </div>
    </article>
  );
}
