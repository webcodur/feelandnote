"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type TouchEvent,
  useEffect,
  useRef,
} from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { FactionCollectionData, CollectionSection } from "./types";
import styles from "./SectionCarousel.module.css";

interface SectionCarouselProps {
  data: FactionCollectionData;
  activeIndex: number;
  onChange: (index: number) => void;
  children: (section: CollectionSection, index: number) => ReactNode;
}

export default function SectionCarousel({
  data,
  activeIndex,
  onChange,
  children,
}: SectionCarouselProps) {
  const t = useTranslations("explore.faction.intro");
  const sections = [...data.real, ...data.fiction];
  const safeIndex = Math.min(activeIndex, Math.max(0, sections.length - 1));
  const activeSection = sections[safeIndex];
  const railRef = useRef<HTMLDivElement>(null);
  const activeButtonRef = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    activeButtonRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [safeIndex]);

  if (!activeSection) return null;

  const move = (delta: number) => {
    const next = Math.min(Math.max(safeIndex + delta, 0), sections.length - 1);
    if (next !== safeIndex) onChange(next);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") move(-1);
    if (event.key === "ArrowRight") move(1);
  };

  const handleTouchStart = (event: TouchEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("[data-theme-rail]")) {
      touchStart.current = null;
      return;
    }
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLElement>) => {
    if (!touchStart.current) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) < 52 || Math.abs(dx) < Math.abs(dy) * 1.35) return;
    move(dx < 0 ? 1 : -1);
  };

  const deckStyle = {
    "--deck-color": activeSection.color,
  } as CSSProperties;

  return (
    <section
      className={styles.deck}
      style={deckStyle}
      aria-label={t("carousel.sectionNav")}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.navigator}>
        <div ref={railRef} className={styles.rail} data-theme-rail>
          {sections.map((section, index) => {
            const active = index === safeIndex;
            return (
              <button
                key={section.tag.id}
                ref={active ? activeButtonRef : undefined}
                type="button"
                className={`${styles.chapterButton} ${active ? styles.chapterButtonActive : ""}`}
                aria-current={active ? "true" : undefined}
                onClick={() => onChange(index)}
              >
                <span className={styles.chapterNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <strong>{section.name}</strong>
                <span className={styles.chapterType}>
                  {section.tag.is_fiction
                    ? t("carousel.fiction")
                    : t("carousel.real")}
                </span>
              </button>
            );
          })}
        </div>

        <div className={styles.controls}>
          <span className={styles.counter} aria-live="polite">
            {String(safeIndex + 1).padStart(2, "0")}
            <span className={styles.counterTotal}>
              / {String(sections.length).padStart(2, "0")}
            </span>
          </span>
          <div className={styles.arrowGroup}>
            <button
              type="button"
              className={styles.arrowButton}
              disabled={safeIndex === 0}
              aria-label={t("carousel.previousSection")}
              onClick={() => move(-1)}
            >
              <ChevronLeft size={19} />
            </button>
            <button
              type="button"
              className={styles.arrowButton}
              disabled={safeIndex === sections.length - 1}
              aria-label={t("carousel.nextSection")}
              onClick={() => move(1)}
            >
              <ChevronRight size={19} />
            </button>
          </div>
        </div>
      </div>

      <div key={activeSection.tag.id} className={styles.stage} aria-live="polite">
        {children(activeSection, safeIndex)}
      </div>
      <div className={styles.progress} aria-hidden="true">
        <div
          className={styles.progressValue}
          style={{ width: `${((safeIndex + 1) / sections.length) * 100}%` }}
        />
      </div>
      <p className={styles.swipeHint}>{t("carousel.swipeHint")}</p>
    </section>
  );
}
