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
  const buttonClass = "min-w-24 py-2 text-sm font-semibold text-text-secondary hover:bg-white/[0.06] hover:text-text-primary active:bg-accent/30 active:text-accent aria-pressed:bg-accent/15 aria-pressed:text-accent aria-pressed:shadow-[inset_0_-2px_0_var(--color-accent)] aria-pressed:hover:bg-accent/20 aria-pressed:active:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent";
  return (
    <div data-shelf-utilities className="mb-3 flex flex-wrap justify-center gap-2">
      {/* 작품 소개는 항상 표시한다. 소개 토글은 일단 주석 처리한다.
      <button data-shelf-intro-toggle type="button" aria-pressed={showIntroduction} onClick={() => onIntroductionChange(!showIntroduction)}
        className={`min-h-11 rounded-control border hover:border-accent ${borderClass(showIntroduction)} ${toggleClass(showIntroduction)}`}>
        {t("expandContentIntro")}
      </button>
      */}
      <div data-shelf-records-actions role="group" aria-label={t("shelfViewMode")}
        className="inline-flex min-h-11 items-stretch overflow-hidden rounded-control border border-white/15"
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
          className={`${buttonClass} px-3`}>
          {t("shelfViewSingle")}
        </button>
        <div data-shelf-all-option className="relative flex border-s border-white/15">
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
