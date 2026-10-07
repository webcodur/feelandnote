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
import { LibraryTitleHeader } from "@/components/shared/LibraryDetailNavigation";
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
  const tShelf = useTranslations("celebPage");
  const professionLabel = useProfessionLabel();
  const period = formatCelebPeriod(item.figure.birthDate, item.figure.deathDate);
  const figureHref = getCelebProfileUrl(item.figure);
  const book = useMemo(() => homeReadingBook(item.content, {
    id: item.id, review: item.review, reviewEn: locale === "en" ? item.review : null, sourceUrl: item.sourceUrl,
  }), [item, locale]);
  const contentIds = useMemo(() => [item.content.id], [item.content.id]);
  const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
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
    <article className="mx-auto w-full min-w-0 max-w-4xl overflow-hidden rounded-xl border border-white/20 bg-bg-card" aria-label={t("cardLabel", { name: item.figure.name, title: item.content.title })}>
      <LibraryTitleHeader title={item.content.title} creator={item.content.creator?.replace(/\^/g, ", ") ?? null}
        previousLabel={tShelf("records.previous")} nextLabel={tShelf("records.next")}
        disabled hideArrows onPrevious={() => {}} onNext={() => {}} testPrefix="featured-review" />
      <BookShelfReviewDetail record={book.readingRecord!} celebId={item.figure.id} ownerNickname={item.figure.name}
        contentIds={contentIds} selectedIndex={0} expanded reviewAside={figure} recordIsComplete />
    </article>
  );
}
