/* ─────────────────────────────────────────────
 * [celeb 상세] 참고도서(affiliateBooks) — 연관 작품 고름틀
 * - 목차 위치: affiliateBooks
 * - 데이터: sources props
 * - 함께 보기: FigureBookFeature.tsx, detail/CelebRecordSections.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import type { FigureBookContent } from "@/actions/figure-books/getFigureBooks";
import { useMouseDragScroll } from "@/hooks/useMouseDragScroll";
import NoEditionBadge from "@/components/ui/NoEditionBadge";
import FigureBookFeature from "./FigureBookFeature";
import styles from "./CelebPageContent.module.css";

interface FigureBookWorksSectionProps {
  sources: FigureBookContent[];
  /** 고름틀 헤더의 굵은 라벨 — 모드 탭이 그룹 이름을 대신할 때는 비운다 */
  label?: string;
  /** 라벨 뒤에 이어지는 가는 설명 */
  intro: string;
}

export default function FigureBookWorksSection({
  sources,
  label,
  intro,
}: FigureBookWorksSectionProps) {
  const t = useTranslations("celebPage");
  /* 어떤 관계의 책을 보여 줄지는 호출부가 고른다 — 등장·연관은 「등장」 모드에,
     창작은 「집필」 모드에 각각 넘긴다. */
  const [selectedId, setSelectedId] = useState(sources[0]?.id ?? "");
  /* 고른 칸을 가운데로 보내는 effect가 같은 ref를 쓰므로 훅의 ref를 그대로 이어 받는다 */
  const { ref: railRef, cursorClassName, dragProps } = useMouseDragScroll<HTMLDivElement>();
  const selectedButtonRef = useRef<HTMLButtonElement>(null);
  const selected = sources.find((source) => source.id === selectedId) ?? sources[0];
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
  }, [railRef, selected?.id]);
  if (!selected) return null;

  return (
    <div className={`${styles.recordContentGap} space-y-4`}>
      <section className="overflow-hidden rounded-lg border border-accent-dim/50 bg-stone-heavy shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
          <header className="relative flex min-h-11 items-center justify-start gap-2.5 bg-bg-secondary/55 pe-3 ps-8 py-2 text-start before:absolute before:inset-y-2.5 before:start-3 before:w-0.5 before:rounded-full before:bg-accent/80 before:content-['']">
            {label ? (
              <p className="shrink-0 text-[15px] font-black tracking-[0.12em] text-accent">
                {label}<span className="ms-1 text-accent-dim" aria-hidden>:</span>
              </p>
            ) : null}
            <p className="min-w-0 truncate text-[15px] font-medium leading-5 tracking-[0.01em] text-text-secondary">
              {intro}
            </p>
            {/* 수수료·주의 안내는 통합 구매 창(BookPurchaseModal)이 싣는다 */}
          </header>
          <div className="relative bg-stone-heavy bg-texture-noise px-2 py-2.5 sm:px-3 sm:py-3 md:px-4">
            <div ref={railRef} {...dragProps} className={`flex gap-2 overflow-x-auto overscroll-x-contain scroll-px-2 pb-1 select-none scrollbar-hide pointer-coarse:snap-x pointer-coarse:snap-proximity [overflow-anchor:none] sm:scroll-px-3 ${cursorClassName}`}>
              {sources.map((source) => {
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
                        <NoEditionBadge contentType={"BOOK"} badge={source.titleBadge} />
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
