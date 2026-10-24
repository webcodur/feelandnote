"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

interface Props {
  showAllItems: boolean;
  onAllItemsChange: (value: boolean) => void;
  recordsAction?: ReactNode;
}

export default function LibraryShelfUtilities({ showAllItems, onAllItemsChange, recordsAction }: Props) {
  const t = useTranslations("archiveSearch");
  const buttonClass = "min-w-24 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent";
  return (
    <div data-shelf-utilities className="mb-3 flex flex-wrap justify-center gap-2">
      {/* 작품 소개는 항상 표시한다. 소개 토글은 일단 주석 처리한다.
      <button data-shelf-intro-toggle type="button" aria-pressed={showIntroduction} onClick={() => onIntroductionChange(!showIntroduction)}
        className={`min-h-11 rounded-control border hover:border-accent ${borderClass(showIntroduction)} ${toggleClass(showIntroduction)}`}>
        {t("expandContentIntro")}
      </button>
      */}
      <div data-shelf-records-actions role="group" aria-label={t("shelfViewMode")}
        className="inline-flex min-h-11 items-stretch overflow-hidden rounded-control border border-white/15 hover:border-accent"
        onKeyDown={(event) => {
          if (!(event.target instanceof HTMLButtonElement)) return;
          const all = event.key === "ArrowRight" || event.key === "End" ? true
            : event.key === "ArrowLeft" || event.key === "Home" ? false : null;
          if (all === null) return;
          event.preventDefault();
          onAllItemsChange(all);
          event.currentTarget.querySelector<HTMLButtonElement>(all ? "[data-shelf-all-toggle]" : "[data-shelf-single-toggle]")?.focus();
        }}>
        <button data-shelf-single-toggle type="button" aria-pressed={!showAllItems} onClick={() => onAllItemsChange(false)}
          className={`${buttonClass} px-3 hover:bg-accent/10 hover:text-accent active:bg-accent/15 ${!showAllItems ? "bg-accent/10 text-accent" : "text-text-secondary"}`}>
          {t("shelfViewSingle")}
        </button>
        <div data-shelf-all-option className={`relative flex border-s border-white/15 hover:bg-accent/10 hover:text-accent active:bg-accent/15 ${showAllItems ? "bg-accent/10 text-accent" : "text-text-secondary"}`}>
          <button data-shelf-all-toggle type="button" aria-pressed={showAllItems} onClick={() => onAllItemsChange(true)}
            className={`${buttonClass} w-full ${recordsAction ? "ps-3 pe-11" : "px-3"}`}>
            {t("shelfViewAll")}
          </button>
          {recordsAction}
        </div>
      </div>
    </div>
  );
}
