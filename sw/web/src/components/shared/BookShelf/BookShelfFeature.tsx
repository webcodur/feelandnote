"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSnapCarousel } from "@/components/ui/SnapCarousel";
import type { BookShelfBook } from "./types";
import BookShelfEditionDetail from "./BookShelfEditionDetail";
import BookShelfEditionNav from "./BookShelfEditionNav";
import styles from "./BookShelfEditionStage.module.css";

interface Props {
  source: BookShelfBook; loading?: boolean; sharedEditionKeys?: ReadonlySet<string>;
}

/** 작품 선택 아래에서는 판본 한 권의 표지·제목·본문을 함께 넘긴다. */
export default function BookShelfFeature(props: Props) {
  if (props.source.editions.length <= 1) return <><BookShelfEditionNav source={props.source} /><BookShelfEditionDetail {...props} /></>;
  const key = [props.source.id, props.source.preferredEditionId, ...props.source.editions.map(edition => edition.id)].join(":");
  return <EditionStage key={key} {...props} />;
}

function EditionStage({ source, loading, sharedEditionKeys }: Props) {
  const t = useTranslations("celebPage");
  const preferred = source.editions.find(edition => edition.id === source.preferredEditionId) ?? source.editions[0];
  const editions = [preferred, ...source.editions.filter(edition => edition.id !== preferred.id)];
  const { ref, activeIndex, scrollTo, syncIndex } = useSnapCarousel(editions.length);
  useEffect(() => {
    const track = ref.current;
    const active = track?.children[activeIndex] as HTMLElement | undefined;
    if (!track || !active) return;
    const measure = () => { track.style.height = active.getBoundingClientRect().height + "px"; };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(active);
    let width = track.clientWidth;
    const resize = new ResizeObserver(() => {
      if (track.clientWidth === width) return;
      width = track.clientWidth;
      track.scrollTo({ left: track.scrollLeft + active.getBoundingClientRect().left - track.getBoundingClientRect().left, behavior: "instant" });
    });
    resize.observe(track);
    return () => { observer.disconnect(); resize.disconnect(); };
  }, [activeIndex, ref]);
  const select = (id: number) => {
    const index = editions.findIndex(edition => edition.id === id);
    if (index < 0) return;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) { scrollTo(index); return; }
    const track = ref.current;
    const target = track?.children[index] as HTMLElement | undefined;
    if (!track || !target) return;
    track.scrollTo({ left: track.scrollLeft + target.getBoundingClientRect().left - track.getBoundingClientRect().left, behavior: "instant" });
    syncIndex();
  };
  return (
    <div>
    <BookShelfEditionNav source={source} editions={editions} index={activeIndex} onSelect={select} />
    <div ref={ref} data-bookshelf-edition-stage aria-label={t("sourceEditionIntro")} tabIndex={0}
      onScroll={syncIndex} onKeyDown={event => {
        if (event.target !== event.currentTarget) return;
        const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
        if (!offset) return;
        event.preventDefault();
        select(editions[Math.max(0, Math.min(editions.length - 1, activeIndex + offset))].id);
      }}
      className={styles.stage + " flex snap-x snap-mandatory items-start overflow-x-auto overflow-y-hidden overscroll-x-contain scrollbar-hide outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"}>
      {editions.map((edition, index) => (
        <div key={edition.id} className="w-full min-w-0 shrink-0 snap-start" aria-hidden={index !== activeIndex || undefined} inert={index !== activeIndex}>
          <BookShelfEditionDetail source={source} edition={edition}
            active={index === activeIndex} lazyIntroduction loading={loading} sharedEditionKeys={sharedEditionKeys} />
        </div>
      ))}
    </div>
    </div>
  );
}
