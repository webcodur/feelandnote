/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 옆 목차 레일(아틀라스 내비게이션)
 * - 목차 위치: 공통 (옆 목차)
 * - 데이터: serviceItems/activeSectionId props
 * - 함께 보기: celebServiceItems.ts, detail/CelebRecordSections.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
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
  "relatedFigures",
]);

export function CelebAtlasNavigation({
  items,
  activeSectionId,
  onNavigate,
}: NavigationProps) {
  const t = useTranslations("celebPage");
  // 레일은 body 포털로 띄운다. 월드 스코프(isolate) 안에 두면 푸터 가로선(z-20) 밑에 깔린다.
  // 첫 렌더는 자리에 그려 하이드레이션을 맞추고, 붙은 뒤 포털로 옮긴다.
  const portalTarget = useSyncExternalStore(
    () => () => {},
    () => document.body,
    () => null,
  );
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndex = items.findIndex(
    (item) => item.target.sectionId === activeSectionId,
  );
  // 실제 위치는 배경으로, 마우스 위치는 대괄호로 따로 그린다.
  // 손을 떼면(hoveredIndex null) 대괄호만 사라지고 배경은 실제 자리를 지킨다.
  const [activeRect, setActiveRect] = useState<{
    top: number;
    height: number;
  } | null>(null);
  const [hoverRect, setHoverRect] = useState<{
    top: number;
    height: number;
  } | null>(null);

  // 항목은 locale과 묶음 구분선에 따라 높이가 달라질 수 있으므로 실제 위치를 잰다.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const measure = () => {
      const navBox = nav.getBoundingClientRect();
      const rectOf = (index: number) => {
        const target = itemRefs.current[index] ?? null;
        if (!target) return null;
        const targetBox = target.getBoundingClientRect();
        return {
          top: targetBox.top - navBox.top,
          height: targetBox.height,
        };
      };
      setActiveRect(rectOf(activeIndex));
      // 손이 없으면 실제 자리에, 닿으면 그쪽으로 미끄러지듯 옮긴다
      setHoverRect(rectOf(hoveredIndex === null ? activeIndex : hoveredIndex));
    };

    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(nav);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [items.length, activeIndex, hoveredIndex, portalTarget]);

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

  const railNode = (
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
          {activeRect ? (
            <span
              aria-hidden
              className={styles.profileNavSpot}
              style={{
                height: activeRect.height,
                transform: `translateY(${activeRect.top}px)`,
              }}
            />
          ) : null}
          {hoverRect ? (
            <>
              <span
                aria-hidden
                className={`${styles.profileNavBracket} ${styles.profileNavBracketLeft}`}
                style={{
                  height: hoverRect.height,
                  transform: `translateY(${hoverRect.top}px)`,
                }}
              />
              <span
                aria-hidden
                className={`${styles.profileNavBracket} ${styles.profileNavBracketRight}`}
                style={{
                  height: hoverRect.height,
                  transform: `translateY(${hoverRect.top}px)`,
                }}
              />
            </>
          ) : null}

          {items.map((item, index) => {
            const isActive = item.target.sectionId === activeSectionId;

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
                className={cn(
                  styles.profileNavItem,
                  NAV_GROUP_START_KEYS.has(item.key) &&
                    styles.profileNavItemGroupStart,
                  isActive && styles.profileNavItemActive,
                )}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
    </div>
  );

  return (
    <aside className={styles.profileAside}>
      {portalTarget ? createPortal(railNode, portalTarget) : railNode}
    </aside>
  );
}
