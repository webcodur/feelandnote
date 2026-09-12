/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 옆 목차 레일(아틀라스 내비게이션)
 * - 목차 위치: 공통 (옆 목차)
 * - 데이터: serviceItems/activeSectionId props
 * - 함께 보기: celebServiceItems.ts, detail/CelebRecordSections.tsx
 * ───────────────────────────────────────────── */
"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Compass, X } from "lucide-react";

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


/* ── 좁은 화면의 목차 ──
   옆 레일은 1340px부터만 선다. 그 아래에서는 이 띠가 같은 목차를 대신 쥔다:
   좌우로 이웃 구획을 즉시 오가고, 가운데를 누르면 전체 목차가 시트로 올라온다.
   구획 머리의 화살표와 기능이 겹치지만, 그 화살표는 구획 머리가 화면에 있을 때만
   닿는다 — 본문 한가운데서 다음으로 넘어갈 길이 이 띠 말고는 없다. */
export function CelebAtlasBottomBar({
  items,
  activeSectionId,
  onNavigate,
}: NavigationProps) {
  const t = useTranslations("celebPage");
  const portalTarget = useSyncExternalStore(
    () => () => {},
    () => document.body,
    () => null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.target.sectionId === activeSectionId),
  );
  const current = items[activeIndex];
  const previous = items[activeIndex - 1];
  const next = items[activeIndex + 1];

  // 시트를 연 채로 뒤 구획이 바뀌어도 목록은 그대로 있어야 한다 — 이동할 때만 닫는다
  const go = useCallback(
    (target: ServiceTarget) => {
      setSheetOpen(false);
      onNavigate(target);
    },
    [onNavigate],
  );

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  if (!current) return null;

  const barNode = (
    <>
      <div className={styles.atlasBar}>
        <div className={styles.atlasBarInner}>
          <button
            type="button"
            onClick={() => previous && go(previous.target)}
            aria-disabled={!previous || undefined}
            aria-label={
              previous
                ? t("previousSection", { name: previous.label })
                : t("noPreviousSection")
            }
            className={styles.atlasBarStep}
          >
            <ChevronLeft size={20} strokeWidth={1.8} aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => setSheetOpen((open) => !open)}
            aria-expanded={sheetOpen}
            aria-label={t(sheetOpen ? "atlasBarClose" : "atlasBarOpen")}
            className={styles.atlasBarCurrent}
          >
            <span className={styles.atlasBarChapter}>{current.chapter}</span>
            <span className={styles.atlasBarLabel}>{current.label}</span>
            <Compass size={15} strokeWidth={1.8} aria-hidden />
          </button>

          <button
            type="button"
            onClick={() => next && go(next.target)}
            aria-disabled={!next || undefined}
            aria-label={
              next ? t("nextSection", { name: next.label }) : t("noNextSection")
            }
            className={styles.atlasBarStep}
          >
            <ChevronRight size={20} strokeWidth={1.8} aria-hidden />
          </button>
        </div>
      </div>

      {sheetOpen ? (
        <div className={styles.atlasSheetLayer}>
          <button
            type="button"
            aria-label={t("atlasBarClose")}
            onClick={() => setSheetOpen(false)}
            className={styles.atlasSheetScrim}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("atlasBarSheetTitle")}
            className={styles.atlasSheet}
          >
            <div className={styles.atlasSheetHead}>
              <span>{t("atlasBarSheetTitle")}</span>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label={t("atlasBarClose")}
                className={styles.atlasSheetClose}
              >
                <X size={17} strokeWidth={1.8} aria-hidden />
              </button>
            </div>
            <div className={styles.atlasSheetGrid}>
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => go(item.target)}
                  aria-current={
                    item.target.sectionId === activeSectionId
                      ? "location"
                      : undefined
                  }
                  className={styles.atlasSheetItem}
                >
                  <span className={styles.atlasBarChapter}>{item.chapter}</span>
                  <span className={styles.atlasSheetItemLabel}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );

  return portalTarget ? createPortal(barNode, portalTarget) : null;
}
