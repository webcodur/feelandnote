/* ─────────────────────────────────────────────
 * 구획 목차 — 공용 (아틀라스 내비게이션)
 * - 목차 위치: 공용. 넓은 화면(≥1340px)은 왼쪽 옆 레일, 그 아래는 하단 띠+목차 시트
 * - 데이터: items/activeId/onNavigate props
 * - 함께 보기: lib/scroll/useSectionNavigation.ts
 *   레일은 body 포털로 띄운다 — 월드 스코프(isolate) 안에 두면 푸터 가로선 밑에 깔린다.
 *   첫 렌더는 자리에 그려 하이드레이션을 맞추고, 붙은 뒤 포털로 옮긴다.
 * ───────────────────────────────────────────── */
"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useBottomNavDock } from "@/components/layout/bottomNavDock";
import { Link, usePathname } from "@/i18n/navigation";
import Modal from "@/components/ui/Modal";
import { cn } from "@/lib/utils";

import styles from "./AtlasNav.module.css";

export interface AtlasNavItem {
  key: string;
  /** 하단 띠·시트에 새기는 장 번호(01, 02-A…). 없으면 라벨만 선다 */
  chapter?: string;
  label: string;
  /** 현재 구획 추적용 앵커 id — DOM에 같은 id의 구획이 있어야 한다 */
  sectionId: string;
  /** 주소가 있으면 굴러가는 대신 그 주소로 간다 — 목차가 실행 입구인 화면(쉼터 게임 목록)용 */
  href?: string;
  /** 목록에서 앞에 구분선을 둔다 — 묶음이 갈리는 자리 */
  groupStart?: boolean;
}

interface AtlasNavProps {
  items: AtlasNavItem[];
  activeId: string;
  onNavigate: (sectionId: string) => void;
}

function usePortalTarget() {
  return useSyncExternalStore(
    () => () => {},
    () => document.body,
    () => null,
  );
}

/* 같은 화면으로 가는 해시 링크는 브라우저 고유 동작으로 새긴다 —
   Next의 소프트 네비게이션은 hashchange를 울리지 않아 해시를 듣는 화면
   (쉼터의 게임 열기)이 반응하지 못한다. 보조 키·새 탭 누름은 주소를 그대로 따른다 */
function useFollowSamePageHash() {
  const pathname = usePathname();
  return useCallback((event: React.MouseEvent, href: string) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(href, window.location.href);
    if (url.pathname !== pathname || !url.hash) return;
    event.preventDefault();
    window.location.hash = url.hash;
  }, [pathname]);
}

/** 넓은 화면의 옆 목차 — 뷰포트 왼쪽에 고정되는 얇은 구획 목록 */
function AtlasRail({ items, activeId, onNavigate }: AtlasNavProps) {
  const t = useTranslations("shared.atlasNav");
  const portalTarget = usePortalTarget();
  const followSamePageHash = useFollowSamePageHash();
  const railRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  // 낮은 화면에서는 현재 구획이 목록 내부 스크롤 밖으로 숨지 않게 맞춘다.
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
  }, [activeId]);

  const railNode = (
    <div ref={railRef} className={styles.atlasRail}>
      <h2 id="atlas-nav-title" className="sr-only">{t("rail")}</h2>
      <nav aria-labelledby="atlas-nav-title" className={styles.atlasList}>
        {items.map((item) => {
          const isActive = item.sectionId === activeId;
          const itemClass = cn(
            styles.atlasItem,
            item.groupStart && styles.atlasItemGroupStart,
            isActive && styles.atlasItemActive,
          );
          return item.href ? (
            <Link
              key={item.key}
              href={item.href}
              onClick={(event) => followSamePageHash(event, item.href!)}
              aria-current={isActive ? "location" : undefined}
              className={itemClass}
            >
              {item.label}
            </Link>
          ) : (
            <button
              key={item.key}
              ref={isActive ? activeItemRef : undefined}
              type="button"
              onClick={() => onNavigate(item.sectionId)}
              onMouseDown={(event) => event.preventDefault()}
              aria-current={isActive ? "location" : undefined}
              className={itemClass}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <aside className={styles.atlasAside}>
      {portalTarget ? createPortal(railNode, portalTarget) : railNode}
    </aside>
  );
}

/* ── 좁은 화면의 목차 ──
   옆 레일은 1340px부터만 선다. 그 아래에서는 이 띠가 같은 목차를 대신 쥔다:
   좌우로 이웃 구획을 즉시 오가고, 가운데를 누르면 전체 목차가 시트로 올라온다. */
function AtlasBottomBar({ items, activeId, onNavigate }: AtlasNavProps) {
  const t = useTranslations("shared.atlasNav");
  const portalTarget = usePortalTarget();
  const [sheetOpen, setSheetOpen] = useState(false);

  const followSamePageHash = useFollowSamePageHash();
  const activeIndex = Math.max(0, items.findIndex((item) => item.sectionId === activeId));
  const current = items[activeIndex];
  const previous = items[activeIndex - 1];
  const next = items[activeIndex + 1];

  // 시트를 연 채로 뒤 구획이 바뀌어도 목록은 그대로 있어야 한다 — 이동할 때만 닫는다
  const go = useCallback((sectionId: string) => {
    setSheetOpen(false);
    onNavigate(sectionId);
  }, [onNavigate]);

  // 하단 내비가 서 있으면 그 고정 틀 안에 들어가 한 몸으로 움직인다(bottomNavDock)
  const dock = useBottomNavDock();

  if (!current) return null;

  /* 이웃 구획으로 가는 ‹ › — href가 있는 항목(실행 입구)은 링크로 둔다 */
  const step = (item: AtlasNavItem | undefined, icon: React.ReactNode, label: string) =>
    item?.href ? (
      <Link href={item.href} onClick={(event) => followSamePageHash(event, item.href!)}
        aria-label={label} className={styles.atlasBarStep}>
        {icon}
      </Link>
    ) : (
      <button
        type="button"
        onClick={() => item && go(item.sectionId)}
        aria-disabled={!item || undefined}
        aria-label={label}
        className={styles.atlasBarStep}
      >
        {icon}
      </button>
    );

  const barNode = (
    <div className={cn(styles.atlasBar, !dock && styles.atlasBarFloating)}>
      <div className={styles.atlasBarInner}>
        {step(previous, <ChevronLeft size={20} strokeWidth={1.8} aria-hidden />,
          previous ? t("previous", { name: previous.label }) : t("noPrevious"))}

        <button
          type="button"
          onClick={() => setSheetOpen((open) => !open)}
          aria-expanded={sheetOpen}
          aria-label={t(sheetOpen ? "close" : "open")}
          className={styles.atlasBarCurrent}
        >
          {current.chapter ? <span className={styles.atlasBarChapter}>{current.chapter}</span> : null}
          <span className={styles.atlasBarLabel}>{current.label}</span>
        </button>

        {step(next, <ChevronRight size={20} strokeWidth={1.8} aria-hidden />,
          next ? t("next", { name: next.label }) : t("noNext"))}
      </div>
    </div>
  );

  // 목차 창은 공용 중앙 모달로 띄운다. 하단 내비 틀 안에 두면 그 틀의 층 순서에 갇힌다
  const sheetNode = (
    <Modal isOpen={sheetOpen} onClose={() => setSheetOpen(false)} title={t("sheetTitle")} size="md" animateHeight={false}>
      <div className={`${styles.atlasSheetGrid} p-3`}>
        {items.map((item) => {
          const content = (
            <>
              {item.chapter ? <span className={styles.atlasBarChapter}>{item.chapter}</span> : null}
              <span className={styles.atlasSheetItemLabel}>{item.label}</span>
            </>
          );
          return item.href ? (
            <Link
              key={item.key}
              href={item.href}
              onClick={(event) => {
                setSheetOpen(false);
                followSamePageHash(event, item.href!);
              }}
              aria-current={item.sectionId === activeId ? "location" : undefined}
              className={styles.atlasSheetItem}
            >
              {content}
            </Link>
          ) : (
            <button
              key={item.key}
              type="button"
              onClick={() => go(item.sectionId)}
              aria-current={item.sectionId === activeId ? "location" : undefined}
              className={styles.atlasSheetItem}
            >
              {content}
            </button>
          );
        })}
      </div>
    </Modal>
  );

  if (!portalTarget) return null;

  return (
    <>
      {createPortal(barNode, dock ?? portalTarget)}
      {sheetNode}
    </>
  );
}

/** 한 번 달면 넓은 화면엔 옆 레일, 좁은 화면엔 하단 띠가 선다 — 두 모습이 같은 목차다 */
export default function AtlasNav(props: AtlasNavProps) {
  if (props.items.length < 2) return null;
  return (
    <>
      <AtlasRail {...props} />
      <AtlasBottomBar {...props} />
    </>
  );
}
