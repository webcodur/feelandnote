"use client";

import { useCallback, useMemo } from "react";
import { BookOpen, ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ContentPurchaseAction from "@/components/features/commerce/ContentPurchaseAction";
import NationalityText from "@/components/ui/NationalityText";
import { useProfessionLabel } from "@/hooks/useFilterLabels";
import { formatCelebPeriod } from "@/lib/utils/celeb-period";
import CelebImage from "@/components/ui/CelebImage";
import FormattedText from "@/components/ui/FormattedText";
import SourceLink from "@/components/ui/SourceLink";
import InteractiveMediaCover from "@/components/ui/media-objects/InteractiveMediaCover";
import { MEDIA_KINDS } from "@/components/ui/media-objects/MediaObject";
import { getCategoryByDbType } from "@/constants/categories";
import { getCelebProfileUrl } from "@/lib/url";
import ContentIntro from "@/components/features/user/contentLibrary/expand/ContentIntro";
import { useContentBrief } from "@/components/features/user/contentLibrary/expand/useContentBrief";
import { resolveContentIntroFullText } from "@/components/features/user/contentLibrary/expand/contentIntroText";
import { fitsInlineReadingText } from "@/constants/readingText";
import RetryBlock from "@/components/ui/pending/RetryBlock";
import type { ContentType } from "@/types/database";

/** 언어 선택과 후보 선정은 호출부가 맡는다. 이 부품은 감상 한 건의 전문을 표시한다. */
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
  const tCategory = useTranslations("content.category");
  const category = getCategoryByDbType(item.content.type);
  const ContentIcon = category?.lucideIcon ?? BookOpen;
  const contentIds = useMemo(() => [item.content.id], [item.content.id]);
  const isActiveContent = useCallback((id: string) => id === item.content.id, [item.content.id]);
  const introduction = useContentBrief(contentIds, 0, item.content.id, isActiveContent);
  const introFitsInline = fitsInlineReadingText(resolveContentIntroFullText(introduction.brief), locale);
  const professionLabel = useProfessionLabel();
  const period = formatCelebPeriod(item.figure.birthDate, item.figure.deathDate);
  const figureHref = getCelebProfileUrl(item.figure);
  const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <article className="mx-auto w-full min-w-0 max-w-3xl overflow-hidden rounded-xl border border-line bg-bg-card" aria-label={t("cardLabel", { name: item.figure.name, title: item.content.title })}>
      <div className="flow-root p-4 [--intro-media-height:196px] sm:grid sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-5 sm:p-5">
        <div className="relative z-10 float-start mb-2 me-4 flex w-24 flex-col items-center gap-2 sm:static sm:z-auto sm:float-none sm:m-0 sm:w-full">
          <div className="relative h-36 w-24 shrink-0 overflow-hidden rounded-md sm:h-72 sm:w-48">
            <InteractiveMediaCover kind={MEDIA_KINDS[item.content.type]} image={item.content.thumbnailUrl ?? undefined}
              title={item.content.title} creator={item.content.creator ?? undefined} href={"/content/" + item.content.id} />
          </div>
          {item.content.type === "BOOK" && <ContentPurchaseAction
            contentId={item.content.id} type={item.content.type} placement="home-featured-review"
            title={item.content.title} creator={item.content.creator} thumbnail={item.content.thumbnailUrl}
            isbn={item.content.isbn ?? undefined} affiliateUrl={item.content.affiliateUrl}
            bookLocale={locale === "en" ? "en" : "ko"} className="w-full"
          />}
        </div>
        <div className={"min-w-0 sm:flex sm:flex-col " + (introFitsInline ? "" : "sm:contain-size")}>
          <div className="mb-3">
            {category && <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-accent"><ContentIcon size={13} aria-hidden />{tCategory(category.id)}</p>}
            <h3 className="break-keep text-xl font-semibold leading-snug [overflow-wrap:anywhere] tracking-tight sm:text-2xl">{item.content.title}</h3>
            {item.content.creator && <p className="mt-1.5 break-words text-sm text-text-secondary">{item.content.creator.replace(/\^/g, ", ")}</p>}
          </div>
          {introduction.hasError ? <RetryBlock onRetry={introduction.retry} /> : <div className="sm:flex sm:min-h-0 sm:flex-1 sm:flex-col">
            <ContentIntro brief={introduction.brief} category={category?.id ?? "book"} isLoading={introduction.isLoading} inlineLabel />
          </div>}
        </div>
      </div>

      <section aria-label={t("backgroundTitle", { name: item.figure.name })} className="flow-root border-t border-line p-4 sm:grid sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-5 sm:p-5">
        <div className="float-start mb-2 me-4 w-24 sm:float-none sm:m-0 sm:flex sm:w-full sm:flex-col sm:items-center">
          <Link href={figureHref} aria-label={item.figure.name} className={"group relative block aspect-[3/4] w-24 overflow-hidden rounded-lg border border-line bg-portrait-stage hover:border-accent sm:w-32 " + focus}>
            <CelebImage src={item.figure.avatarUrl} alt={item.figure.name} shape="square" />
          </Link>
          <div className="mt-2 w-full min-w-0 text-center sm:max-w-32" data-featured-figure-basics>
            <Link href={figureHref} className={"block break-words rounded-sm text-sm font-semibold leading-snug text-text-primary hover:text-accent " + focus}>{item.figure.name}</Link>
            {item.figure.profession && <p className="mt-1 break-words text-xs leading-relaxed text-text-secondary">{professionLabel(item.figure.profession)}</p>}
            {item.figure.nationality && <p className="mt-0.5 break-words text-xs leading-relaxed text-text-secondary"><NationalityText code={item.figure.nationality} /></p>}
            {period && <p className="mt-0.5 text-xs leading-relaxed tabular-nums text-text-tertiary">{period}</p>}
          </div>
        </div>
        <div className="min-w-0">
          <h4 className="mb-2 break-keep text-base font-semibold leading-snug [overflow-wrap:anywhere] sm:text-lg">
            <Link href={figureHref} className={"rounded-sm hover:text-accent " + focus}>{t("backgroundTitle", { name: item.figure.name })}</Link>
          </h4>
          <div className="break-words text-[15px] leading-[1.75] text-text-secondary [&_[data-text-paragraph]:first-child]:block">
            <FormattedText text={item.review} layout="prose" />
          </div>
          <SourceLink sourceUrl={item.sourceUrl} className="mt-2 inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-xs text-text-tertiary hover:bg-white/5 hover:text-accent">
            {t("source")}<ExternalLink size={12} aria-hidden />
          </SourceLink>
        </div>
      </section>
    </article>
  );
}
