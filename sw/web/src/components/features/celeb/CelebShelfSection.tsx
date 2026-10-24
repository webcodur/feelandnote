"use client";

import { Activity, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";

type ShelfPane = "reviews" | "references";

/** 상세 페이지와 도감 인물 창에서 감상·참고도서를 한 책장으로 전환한다. */
export default function CelebShelfSection({ hasReviews, librarySlot, booksSlot, pageAnchors = false }: {
  hasReviews: boolean;
  librarySlot: ReactNode;
  booksSlot: ReactNode;
  pageAnchors?: boolean;
}) {
  const t = useTranslations("celebPage");
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<{ pane: ShelfPane; referencesVisited: boolean }>(() => ({
    pane: hasReviews ? "reviews" : "references", referencesVisited: !hasReviews,
  }));
  const pane = hasReviews ? selection.pane : "references";

  const select = (next: ShelfPane) => {
    if (next === pane) return;
    rootRef.current?.querySelectorAll<HTMLMediaElement>(`[data-shelf-pane="${pane}"] audio, [data-shelf-pane="${pane}"] video`)
      .forEach((media) => media.pause());
    setSelection((current) => ({ pane: next, referencesVisited: current.referencesVisited || next === "references" }));
  };

  useEffect(() => {
    if (!pageAnchors) return;
    const syncHash = () => {
      const hash = window.location.hash;
      const next = hash === "#affiliate-books" || hash === "#archive" ? "references"
        : hash === "#library" && hasReviews ? "reviews" : null;
      if (!next) return;
      rootRef.current?.querySelectorAll<HTMLMediaElement>("audio, video").forEach((media) => media.pause());
      setSelection((current) => ({ pane: next, referencesVisited: current.referencesVisited || next === "references" }));
    };
    const frame = window.requestAnimationFrame(syncHash);
    window.addEventListener("hashchange", syncHash);
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener("hashchange", syncHash); };
  }, [hasReviews, pageAnchors]);

  const options = [
    { key: "reviews" as const, label: t("recordCountsLabel") },
    { key: "references" as const, label: t("relatedProducts") },
  ];
  return (
    <div ref={rootRef} data-celeb-shelf className="relative min-w-0 [overflow-anchor:none]">
      {pageAnchors && <>
        <span id="affiliate-books" aria-hidden className="absolute top-0 scroll-mt-20" />
        <span id="archive" aria-hidden className="absolute top-0 scroll-mt-20" />
      </>}
      {hasReviews && <div role="tablist" aria-label={t("bookshelfTitle")}
        className="mx-auto mb-6 flex w-full max-w-sm border-b border-white/15">
        {options.map((option, index) => <button key={option.key} type="button" role="tab"
          id={`${id}-${option.key}-tab`} aria-controls={`${id}-${option.key}-panel`}
          aria-selected={pane === option.key} tabIndex={pane === option.key ? 0 : -1}
          onClick={() => select(option.key)} onKeyDown={(event) => {
            const next = event.key === "Home" ? 0 : event.key === "End" ? 1
              : event.key === "ArrowLeft" || event.key === "ArrowRight" ? 1 - index : null;
            if (next === null) return;
            event.preventDefault();
            select(options[next].key);
            document.getElementById(`${id}-${options[next].key}-tab`)?.focus();
          }}
          className={`min-h-11 flex-1 border-b-2 px-4 py-2 text-sm font-semibold hover:bg-accent/5 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${pane === option.key ? "border-accent text-accent" : "border-transparent text-text-secondary"}`}>
          {option.label}
        </button>)}
      </div>}
      {hasReviews && <div id={`${id}-reviews-panel`} role="tabpanel" aria-labelledby={`${id}-reviews-tab`}
        data-shelf-pane="reviews" hidden={pane !== "reviews"} inert={pane !== "reviews"}>
        <Activity mode={pane === "reviews" ? "visible" : "hidden"}>{librarySlot}</Activity>
      </div>}
      <div id={`${id}-references-panel`} role={hasReviews ? "tabpanel" : undefined}
        aria-labelledby={hasReviews ? `${id}-references-tab` : undefined}
        data-shelf-pane="references" hidden={pane !== "references"} inert={pane !== "references"}>
        {(!hasReviews || selection.referencesVisited) ? <Activity mode={pane === "references" ? "visible" : "hidden"}>{booksSlot}</Activity> : null}
      </div>
    </div>
  );
}
