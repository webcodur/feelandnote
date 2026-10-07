"use client";

import { ChevronRight, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import SourceLink from "@/components/ui/SourceLink";
import FormattedText from "@/components/ui/FormattedText";
import CardCover from "./CardCover";
import CardHeader from "./CardHeader";
import CardModals from "./CardModals";
import type { ContentCardProps } from "../types";
import type { ContentCardState } from "../useContentCardState";

/** 표지 옆에는 서지·출처를 묶고, 감상은 아래 전체 폭에서 읽는다. */
export default function StackedReviewLayout({ props, state }: { props: ContentCardProps; state: ContentCardState }) {
  const t = useTranslations("todayFigure");
  const { displayTitle, displayCreator, displayReview, isSpoiler, handleClick } = state;
  return <>
    <article data-home-review-card className={"flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-bg-card " + (props.className ?? "")}>
      {props.showHeader !== false && <CardHeader props={props} state={state} />}
      <div className="flex min-w-0 items-center gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="relative h-33 w-22 shrink-0 overflow-hidden rounded-md bg-bg-secondary">
          <CardCover props={props} state={state} review />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="break-words text-base font-semibold leading-snug text-text-primary" title={displayTitle}>{displayTitle}</h3>
          {displayCreator && <p className="mt-2 break-words text-xs leading-relaxed text-text-secondary">{displayCreator.replace(/\^/g, ", ")}</p>}
        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-2">
          <p className="sr-only">{t("reviewBackground")}</p>
          <SourceLink sourceUrl={props.sourceUrl} className="inline-flex min-h-11 items-center gap-1 rounded-md px-1 text-xs text-accent hover:bg-accent/10 hover:text-accent-hover">
            {state.t("reviewModal.source")}<ExternalLink size={11} aria-hidden />
          </SourceLink>
        </div>
        </div>
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
      {props.posterFooterNode && <div className="mt-auto border-t border-line p-3 sm:px-4">{props.posterFooterNode}</div>}
    </article>
    {props.effectsEnabled !== false && <CardModals props={props} state={state} />}
  </>;
}
