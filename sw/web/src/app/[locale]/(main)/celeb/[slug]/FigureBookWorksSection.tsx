/* ─────────────────────────────────────────────
 * [celeb 상세] sourceWorks — 연관 작품 고름틀
 * - 목차 위치: sourceWorks
 * - 데이터: sources props
 * - 함께 보기: FigureBookFeature.tsx, detail/CelebRecordSections.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { FigureBookContent } from "@/actions/figure-books/getFigureBooks";
import FigureBookFeature from "./FigureBookFeature";
import styles from "./CelebPageContent.module.css";

interface FigureBookWorksSectionProps {
  sources: FigureBookContent[];
}

export default function FigureBookWorksSection({
  sources,
}: FigureBookWorksSectionProps) {
  const t = useTranslations("celebPage");
  /* 등장과 연관을 한 섹션에 묶는다. 등장 여부는 판본 본문을 열어야 확정되는데 그럴 수 없어,
     확인하지 못한 것을 등장이라 단정하지 않고 「연관 작품」 하나로 보여 준다.
     창작(authored)은 저작 목록이 따로 있으므로 여기서 뺀다. */
  const appearanceSources = sources.filter((source) => source.relationType !== "authored");
  const [selectedId, setSelectedId] = useState(appearanceSources[0]?.id ?? "");
  const railRef = useRef<HTMLDivElement>(null);
  const selectedButtonRef = useRef<HTMLButtonElement>(null);
  const selected = appearanceSources.find((source) => source.id === selectedId) ?? appearanceSources[0];
  useEffect(() => {
    const rail = railRef.current;
    const button = selectedButtonRef.current;
    if (!rail || !button) return;

    const railBox = rail.getBoundingClientRect();
    const buttonBox = button.getBoundingClientRect();
    const target = rail.scrollLeft
      + buttonBox.left - railBox.left
      - (rail.clientWidth - button.clientWidth) / 2;
    const maxScrollLeft = Math.max(0, rail.scrollWidth - rail.clientWidth);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rail.scrollTo({
      left: Math.min(maxScrollLeft, Math.max(0, target)),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [selected?.id]);
  if (!selected) return null;

  return (
    <div className={`${styles.recordContentGap} space-y-4`}>
      <section className="overflow-hidden rounded-lg border border-accent-dim/50 bg-stone-heavy shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
          <header className="relative flex min-h-11 items-center justify-start gap-2.5 bg-bg-secondary/55 pe-3 ps-8 py-2 text-start before:absolute before:inset-y-2.5 before:start-3 before:w-0.5 before:rounded-full before:bg-accent/80 before:content-['']">
            <p className="shrink-0 text-[15px] font-black tracking-[0.12em] text-accent">
              {t("sourceWorksLabel")}<span className="ms-1 text-accent-dim" aria-hidden>:</span>
            </p>
            <p className="min-w-0 truncate text-[15px] font-medium leading-5 tracking-[0.01em] text-text-secondary">
              {t("sourceWorksIntro")}
            </p>
          </header>
          <div className="relative bg-stone-heavy bg-texture-noise px-2 py-2.5 sm:px-3 sm:py-3 md:px-4">
            <div ref={railRef} className="flex snap-x snap-proximity gap-2 overflow-x-auto overscroll-x-contain scroll-px-2 pb-1 [overflow-anchor:none] [scrollbar-width:thin] sm:scroll-px-3">
              {appearanceSources.map((source) => {
                const active = source.id === selected.id;
                return (
                  <button
                    key={source.id}
                    ref={active ? selectedButtonRef : undefined}
                    type="button"
                    aria-pressed={active}
                    aria-label={t("sourceWorkSelect", { title: source.title })}
                    onClick={() => setSelectedId(source.id)}
                    className={`relative grid h-[84px] shrink-0 snap-center grid-rows-2 overflow-hidden border px-4 py-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                      active
                        ? "border-accent bg-accent/10"
                        : "effect-engraved border-stone-light bg-stone-heavy hover:border-accent hover:bg-accent/[0.06]"
                    }`}
                  >
                    <span className={`flex min-w-0 items-center justify-center ${source.creator ? "" : "row-span-2"}`}>
                      <span className="block truncate text-[15px] font-black leading-[1.25] tracking-[-0.01em] text-3d-gold">
                        {source.title}
                      </span>
                    </span>
                    {source.creator && <span className="flex min-w-0 items-center justify-center"><span className="block truncate text-sm font-medium leading-5 tracking-[0.05em] text-text-secondary">{source.creator}</span></span>}
                  </button>
                );
              })}
            </div>
          </div>
      </section>

      <FigureBookFeature source={selected} />
    </div>
  );
}
