"use client";

import { BookOpen, ExternalLink } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import ContentPurchaseAction from "@/components/features/commerce/ContentPurchaseAction";
import CelebImage from "@/components/ui/CelebImage";
import FormattedText from "@/components/ui/FormattedText";
import SourceLink from "@/components/ui/SourceLink";
import InteractiveMediaCover from "@/components/ui/media-objects/InteractiveMediaCover";
import { MEDIA_KINDS } from "@/components/ui/media-objects/MediaObject";
import { getCategoryByDbType } from "@/constants/categories";
import { getCelebProfileUrl } from "@/lib/url";
import type { ContentType } from "@/types/database";

/** 언어 선택과 후보 선정은 호출부가 맡는다. 이 부품은 감상 한 건의 전문을 표시한다. */
export interface HomeFeaturedReviewData {
  id: string;
  review: string;
  sourceUrl: string | null;
  figure: { id: string; slug: string | null; name: string; avatarUrl: string | null };
  content: { id: string; type: ContentType; title: string; creator: string | null; thumbnailUrl: string | null; isbn?: string | null; affiliateUrl?: unknown };
}

export default function HomeFeaturedReview({ item }: { item: HomeFeaturedReviewData }) {
  const locale = useLocale();
  const t = useTranslations("home.featuredReview");
  const tCategory = useTranslations("content.category");
  const category = getCategoryByDbType(item.content.type);
  const ContentIcon = category?.lucideIcon ?? BookOpen;
  const figureHref = getCelebProfileUrl(item.figure);
  const focus = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

  return (
    <article className="relative mx-auto w-full min-w-0 max-w-3xl overflow-hidden rounded-xl border border-line bg-bg-card" aria-label={t("cardLabel", { name: item.figure.name, title: item.content.title })}>
      <div className="flex items-start gap-4 p-4 sm:gap-5 sm:p-5 md:pe-36">
        <div className="relative h-30 w-20 shrink-0 overflow-hidden rounded-md">
          <InteractiveMediaCover kind={MEDIA_KINDS[item.content.type]} image={item.content.thumbnailUrl ?? undefined}
            title={item.content.title} creator={item.content.creator ?? undefined} href={"/content/" + item.content.id} />
        </div>
        <div className="flex min-h-30 min-w-0 flex-1 flex-col md:min-h-32">
          <div className="min-w-0 flex-1">
            {category && <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-accent"><ContentIcon size={13} aria-hidden />{tCategory(category.id)}</p>}
            <h3 className="break-keep text-xl font-semibold leading-snug [overflow-wrap:anywhere] tracking-tight sm:text-2xl">{item.content.title}</h3>
            {item.content.creator && <p className="mt-1.5 break-words text-sm text-text-secondary">{item.content.creator.replace(/\^/g, ", ")}</p>}
          </div>
          {item.content.type === "BOOK" && <ContentPurchaseAction
            contentId={item.content.id} type={item.content.type} placement="home-featured-review"
            title={item.content.title} creator={item.content.creator} thumbnail={item.content.thumbnailUrl}
            isbn={item.content.isbn ?? undefined} affiliateUrl={item.content.affiliateUrl}
            bookLocale={locale === "en" ? "en" : "ko"} className="mt-auto w-full pt-3"
          />}
        </div>
      </div>

      <div className="border-t border-line p-4 sm:p-5">
        <div className="mb-2 flex min-w-0 flex-wrap items-center justify-between gap-x-3">
          <h4 className="min-w-0 break-keep text-base font-semibold leading-snug [overflow-wrap:anywhere] sm:text-lg">
            <Link href={figureHref} className={"rounded-sm hover:text-accent " + focus}>{t("backgroundTitle", { name: item.figure.name })}</Link>
          </h4>
          <SourceLink sourceUrl={item.sourceUrl} className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-xs text-text-tertiary hover:bg-white/5 hover:text-accent">
            {t("source")}<ExternalLink size={12} aria-hidden />
          </SourceLink>
        </div>
        <div className="flow-root break-words text-[15px] leading-[1.75] text-text-secondary [&_[data-text-paragraph]:first-child]:block [&_[data-text-paragraph]:first-child]:min-h-34 md:[&_[data-text-paragraph]:first-child]:min-h-0">
          <Link href={figureHref} aria-label={item.figure.name} className={"group relative float-start mb-2 me-4 block aspect-[3/4] w-24 md:absolute md:end-5 md:top-5 md:mb-0 md:me-0 overflow-hidden rounded-lg border border-line bg-portrait-stage hover:border-accent " + focus}>
            <CelebImage src={item.figure.avatarUrl} alt={item.figure.name} shape="square" />
          </Link>
          <FormattedText text={item.review} layout="prose" />
        </div>
      </div>
    </article>
  );
}
