"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Compass } from "lucide-react";

import { cn } from "@/lib/utils";

import type { ServiceItem, ServiceTarget } from "./celebServiceItems";
import styles from "./CelebAtlasRails.module.css";

interface NavigationProps {
  items: ServiceItem[];
  activeSectionId: string;
  onNavigate: (target: ServiceTarget) => void;
}

const NAV_GROUP_START_KEYS = new Set([
  "connections",
  "analysis",
  "media",
  "guestbook",
]);

export function CelebAtlasNavigation({
  items,
  activeSectionId,
  onNavigate,
}: NavigationProps) {
  const t = useTranslations("celebPage");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = items.findIndex(
    (item) => item.target.sectionId === activeSectionId,
  );
  const spotIndex = hoveredIndex ?? activeIndex;
  const [spotRect, setSpotRect] = useState<{
    top: number;
    height: number;
  } | null>(null);

  // 항목은 locale과 묶음 구분선에 따라 높이가 달라질 수 있으므로 실제 위치를 잰다.
  useEffect(() => {
    const nav = navRef.current;
    const target = itemRefs.current[spotIndex] ?? null;
    if (!nav || !target) {
      const frame = requestAnimationFrame(() => setSpotRect(null));
      return () => cancelAnimationFrame(frame);
    }

    const measure = () => {
      const navBox = nav.getBoundingClientRect();
      const targetBox = target.getBoundingClientRect();
      setSpotRect({
        top: targetBox.top - navBox.top,
        height: targetBox.height,
      });
    };

    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(nav);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [items.length, spotIndex]);

  // 낮은 화면에서는 현재 구획이 박스 내부 스크롤 밖으로 숨지 않게 맞춘다.
  useEffect(() => {
    const rail = railRef.current;
    const activeItem = activeItemRef.current;
    if (!rail || !activeItem || rail.scrollHeight <= rail.clientHeight) return;

    const railBox = rail.getBoundingClientRect();
    const itemBox = activeItem.getBoundingClientRect();
    const safeInset = 12;

    if (itemBox.bottom > railBox.bottom - safeInset) {
      rail.scrollTop += itemBox.bottom - railBox.bottom + safeInset;
    } else if (itemBox.top < railBox.top + safeInset) {
      rail.scrollTop -= railBox.top - itemBox.top + safeInset;
    }
  }, [activeSectionId]);

  return (
    <aside className={styles.profileAside}>
      <div ref={railRef} className={styles.profileRail}>
        <h2 id="celeb-atlas-title" className={styles.profileTitle}>
          <span className={styles.profileEmblem} aria-hidden>
            <Compass size={17} strokeWidth={1.7} />
          </span>
          <span className="sr-only">{t("serviceGuideTitle")}</span>
        </h2>
        <nav
          ref={navRef}
          aria-labelledby="celeb-atlas-title"
          className={styles.profileNav}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {spotRect ? (
            <span
              aria-hidden
              className={styles.profileNavSpot}
              style={{
                height: spotRect.height,
                transform: `translateY(${spotRect.top}px)`,
              }}
            />
          ) : null}

          {items.map((item, index) => {
            const isActive = item.target.sectionId === activeSectionId;
            const isReady = item.ready;

            return (
              <button
                key={item.key}
                ref={(element) => {
                  itemRefs.current[index] = element;
                  if (isActive) activeItemRef.current = element;
                }}
                type="button"
                onClick={() => onNavigate(item.target)}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHoveredIndex(index)}
                onFocus={() => setHoveredIndex(index)}
                onBlur={() => setHoveredIndex(null)}
                aria-current={isActive ? "location" : undefined}
                aria-label={
                  isReady
                    ? item.label
                    : `${item.label}, ${t("atlasUnavailable")}. ${t("atlasGuideOpenAction")}`
                }
                className={cn(
                  styles.profileNavItem,
                  NAV_GROUP_START_KEYS.has(item.key) &&
                    styles.profileNavItemGroupStart,
                  isActive && styles.profileNavItemActive,
                  !isReady && styles.profileNavItemPending,
                )}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
