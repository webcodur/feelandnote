"use client";

import { useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import FormattedText from "@/components/ui/FormattedText";
import ClippedContentReadingText from "@/components/ui/ClippedContentReadingText";
import RetryBlock from "@/components/ui/pending/RetryBlock";
import { useClippedText } from "@/hooks/useClippedText";
import { useContentBrief } from "@/components/features/user/contentLibrary/expand/useContentBrief";
import { resolveContentIntroFullText } from "@/components/features/user/contentLibrary/expand/contentIntroText";
import CardCover from "./CardCover";
import CardModals from "./CardModals";
import type { ContentCardProps } from "../types";
import type { ContentCardState } from "../useContentCardState";

/** 제목·저자는 헤더에, 작품 소개는 표지 옆에, 감상은 아래 전체 폭에 배치한다. */
export default function StackedReviewLayout({ props, state }: { props: ContentCardProps; state: ContentCardState }) {
  const t = useTranslations("todayFigure");
  const tIntro = useTranslations("archiveSearch");
  const { displayTitle, displayCreator, displayReview, isSpoiler, handleClick } = state;
  const { ref: reviewRef, isClipped: isReviewClipped } = useClippedText<HTMLSpanElement>(displayReview, !!displayReview && !isSpoiler);
  const contentIds = useMemo(() => props.contentId ? [props.contentId] : [], [props.contentId]);
  const isActiveContent = useCallback((id: string) => id === props.contentId, [props.contentId]);
  const introduction = useContentBrief(contentIds, 0, props.contentId ?? null, isActiveContent,
    !!props.contentId && !state.editionUnavailable, undefined, false,
    state.showEditionToggle ? state.activeEdition : props.bookLocale);
  const introText = resolveContentIntroFullText(introduction.brief);
  return <>
    <article data-home-review-card className={"flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-bg-card " + (props.className ?? "")}>
      <header className="flex min-w-0 flex-wrap items-baseline justify-center gap-x-2 gap-y-0.5 border-b border-line px-3 py-3 text-center sm:px-4">
        <h3 className="min-w-0 max-w-full break-words text-base font-semibold leading-snug text-text-primary">{displayTitle}</h3>
        {displayCreator && <p className="min-w-0 max-w-full break-words text-xs leading-relaxed text-text-secondary"><span className="text-text-tertiary">- </span>{displayCreator.replace(/\^/g, ", ")}</p>}
      </header>
      <div className="grid min-w-0 grid-cols-[6rem_minmax(0,1fr)] grid-rows-[9rem_2.75rem] items-start gap-x-3 gap-y-2 p-3 sm:gap-x-4 sm:p-4">
        <div className="relative h-36 w-full overflow-hidden rounded-md bg-bg-secondary">
          <CardCover props={props} state={state} review />
        </div>
        <div className="col-start-2 row-start-1 row-span-2 flex h-full min-h-0 min-w-0 flex-col">
          <div className="flex min-h-0 flex-1 flex-col" aria-busy={introduction.isLoading}>
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
          className="flex min-w-0 flex-1 flex-col rounded-md text-left outline-none hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-accent">
          {props.reviewIsOriginalLanguage && <span className="mb-1 text-[11px] text-amber-200">{state.t("reviewModal.originalLanguage")}</span>}
          <span className="block w-full break-words text-sm leading-[1.7] text-text-secondary">
            {isSpoiler ? state.t("reviewModal.spoiler") : displayReview
              ? <span ref={reviewRef} className={"whitespace-pre-line line-clamp-5 " + (isReviewClipped ? "clip-fade-end" : "")}><FormattedText text={displayReview.replace(/\n\s*\n/g, " ")} /></span>
              : state.t("reviewModal.noReview")}
          </span>
        </button>
      </div>
    </article>
    {props.effectsEnabled !== false && <CardModals props={props} state={state} />}
  </>;
}
