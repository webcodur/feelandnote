"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./SectionCarousel.module.css";

interface ThemeRailProps {
  className: string;
  children: ReactNode;
}

export default function ThemeRail({ className, children }: ThemeRailProps) {
  const t = useTranslations("explore.faction.intro");
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateControls = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setCanPrev(track.scrollLeft > 8);
    setCanNext(track.scrollLeft + track.clientWidth < track.scrollWidth - 8);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    updateControls();
    track.addEventListener("scroll", updateControls, { passive: true });
    window.addEventListener("resize", updateControls);
    return () => {
      track.removeEventListener("scroll", updateControls);
      window.removeEventListener("resize", updateControls);
    };
  }, [updateControls]);

  const move = (direction: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: track.clientWidth * 0.82 * direction,
      behavior: "smooth",
    });
  };

  return (
    <div className={styles.railShell}>
      <div className={styles.railControls}>
        <button
          type="button"
          className={styles.railButton}
          disabled={!canPrev}
          aria-label={t("carousel.previousThemes")}
          onClick={() => move(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          className={styles.railButton}
          disabled={!canNext}
          aria-label={t("carousel.nextThemes")}
          onClick={() => move(1)}
        >
          <ChevronRight size={18} />
        </button>
      </div>
      <div ref={trackRef} className={className} data-theme-rail>
        {children}
      </div>
    </div>
  );
}
