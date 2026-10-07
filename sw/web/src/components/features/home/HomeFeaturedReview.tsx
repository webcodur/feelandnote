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
  const figure = <div className="w-24 min-w-0 md:w-32" data-featured-figure-basics>
    <Link href={figureHref} aria-label={item.figure.name} className={"group relative block aspect-[3/4] w-full overflow-hidden rounded-lg border border-line bg-portrait-stage hover:border-accent " + focus}>
      <CelebImage src={item.figure.avatarUrl} alt={item.figure.name} shape="square" />
    </Link>
    <Link href={figureHref} className={"mt-2 block text-balance break-keep rounded-sm text-center text-sm font-semibold leading-snug [overflow-wrap:anywhere] text-text-primary hover:text-accent " + focus}>{item.figure.name}</Link>
    {item.figure.profession && <p className="mt-1 hidden break-words text-center text-xs leading-relaxed text-text-secondary md:block">{professionLabel(item.figure.profession)}</p>}
    {(item.figure.profession || item.figure.nationality) && <div className="mt-1 flex items-center justify-center gap-1.5 text-xs leading-relaxed text-text-secondary md:mt-0.5">
      {item.figure.profession && <span className="shrink-0 md:hidden" role="img" aria-label={professionLabel(item.figure.profession)} title={professionLabel(item.figure.profession)}><CelebProfessionMark profession={item.figure.profession} size={14} /></span>}
      {item.figure.nationality && <NationalityText code={item.figure.nationality} />}
    </div>}
    {period && <p className="mt-0.5 hidden text-center text-xs leading-relaxed tabular-nums text-text-tertiary md:block">{period}</p>}
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
          contentIds={contentIds} selectedIndex={0} expanded reviewAside={figure} recordIsComplete showMedia={false} />
      </div>
    </article>
  );
}
