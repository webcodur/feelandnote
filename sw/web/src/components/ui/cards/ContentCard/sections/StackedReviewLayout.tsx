"use client";

import { useCallback, useMemo } from "react";
import { ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import FormattedText from "@/components/ui/FormattedText";
import ClippedContentReadingText from "@/components/ui/ClippedContentReadingText";
import RetryBlock from "@/components/ui/pending/RetryBlock";
import { useContentBrief } from "@/components/features/user/contentLibrary/expand/useContentBrief";
import { resolveContentIntroFullText } from "@/components/features/user/contentLibrary/expand/contentIntroText";
import CardCover from "./CardCover";
import CardHeader from "./CardHeader";
import CardModals from "./CardModals";
import type { ContentCardProps } from "../types";
import type { ContentCardState } from "../useContentCardState";

/** 표지 옆에는 서지와 작품 소개를 묶고, 감상은 아래 전체 폭에서 읽는다. */
export default function StackedReviewLayout({ props, state }: { props: ContentCardProps; state: ContentCardState }) {
  const t = useTranslations("todayFigure");
  const tIntro = useTranslations("archiveSearch");
  const { displayTitle, displayCreator, displayReview, isSpoiler, handleClick } = state;
  const contentIds = useMemo(() => props.contentId ? [props.contentId] : [], [props.contentId]);
  const isActiveContent = useCallback((id: string) => id === props.contentId, [props.contentId]);
  const introduction = useContentBrief(contentIds, 0, props.contentId ?? null, isActiveContent,
    !!props.contentId && !state.editionUnavailable, undefined, false,
    state.showEditionToggle ? state.activeEdition : props.bookLocale);
  const introText = resolveContentIntroFullText(introduction.brief);
  return <>
    <article data-home-review-card className={"flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-bg-card " + (props.className ?? "")}>
      {props.showHeader !== false && <CardHeader props={props} state={state} />}
      <div className="grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] grid-rows-[9rem_2.75rem] items-start gap-x-3 gap-y-2 p-3 sm:gap-x-4 sm:p-4">
        <div className="relative h-36 w-full overflow-hidden rounded-md bg-bg-secondary">
          <CardCover props={props} state={state} review />
        </div>
        <div className="col-start-2 row-start-1 row-span-2 flex h-full min-h-0 min-w-0 flex-col">
          <h3 className="shrink-0 break-words text-base font-semibold leading-snug text-text-primary" title={displayTitle}>{displayTitle}</h3>
          {displayCreator && <p className="mt-2 shrink-0 break-words text-xs leading-relaxed text-text-secondary">{displayCreator.replace(/\^/g, ", ")}</p>}
          <div className="mt-2 flex min-h-0 flex-1 flex-col" aria-busy={introduction.isLoading}>
            {introduction.isLoading ? <div aria-hidden className="space-y-2 py-1">
              <div className="h-3 w-full animate-pulse rounded bg-white/[0.06]" />
              <div className="h-3 w-11/12 animate-pulse rounded bg-white/[0.06]" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-white/[0.06]" />
            </div> : introduction.hasError ? <RetryBlock onRetry={introduction.retry} className="gap-1 py-1 text-xs" />
              : introText && !state.editionUnavailable ? <ClippedContentReadingText
                text={introText} tone="secondary" size="compact" className="min-h-0 flex-1 overflow-hidden rounded-sm"
                onClick={() => state.setShowIntroModal(true)} clickLabel={tIntro("expandIntroMore")}>
                <span className="font-semibold text-text-primary">{tIntro("expandContentIntro")}: </span>
                <FormattedText text={introText.replace(/\n\s*\n/g, " ")} />
              </ClippedContentReadingText> : <p className="text-xs italic text-text-tertiary">{tIntro("expandNoIntro")}</p>}
          </div>
          <p className="sr-only">{t("reviewBackground")}</p>
        </div>
        {props.posterFooterNode && <div className="col-start-1 min-w-0 w-full" data-no-drag>{props.posterFooterNode}</div>}
      </div>
      <div className="flex min-w-0 flex-1 flex-col px-3 pb-3 sm:px-4 sm:pb-4">

        <button type="button" onClick={handleClick} aria-haspopup="dialog" aria-label={t("openReview", { title: displayTitle })}
          className="group flex min-w-0 flex-1 flex-col rounded-md text-left outline-none hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-accent">
          {props.reviewIsOriginalLanguage && <span className="mb-1 text-[11px] text-amber-200">{state.t("reviewModal.originalLanguage")}</span>}
          <span className="block w-full break-words text-sm leading-[1.7] text-text-secondary">
            {isSpoiler ? state.t("reviewModal.spoiler") : displayReview
              ? <span className="whitespace-pre-line line-clamp-5"><FormattedText text={displayReview.replace(/\n\s*\n/g, " ")} /></span>
              : state.t("reviewModal.noReview")}
          </span>
          <span className="mt-auto flex min-h-11 w-full items-center justify-end gap-1 pt-2 text-xs font-medium text-text-secondary group-hover:text-accent">
            {t("readReview")}<ChevronRight size={13} aria-hidden />
          </span>
        </button>
      </div>
    </article>
    {props.effectsEnabled !== false && <CardModals props={props} state={state} />}
  </>;
}
