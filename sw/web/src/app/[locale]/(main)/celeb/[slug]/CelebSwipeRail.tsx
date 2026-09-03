/* ─────────────────────────────────────────────
 * [celeb 상세] 공통 — 우측 스와이프 레일(PC 전용)
 * - 목차 위치: 공통 (옆 드래그 막대)
 * - 데이터: 없음. 잡아끌면 페이지가 따라온다
 * - 함께 보기: CelebSwipeRail.module.css
 * ───────────────────────────────────────────── */
"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";

import styles from "./CelebSwipeRail.module.css";

/** 잡아끄는 배율. 긴 페이지를 오가도록 1보다 크게 둔다 */
const DRAG_RATIO = 2;
/** 이보다 짧으면 딸려온 진동으로 보고 무시한다 */
const DEADZONE_PX = 3;
/** 놓을 때 이 속도(px/ms) 이상이면 여파로 미끄러진다 */
const FLING_MIN_VELOCITY = 0.25;
/** 프레임당 감쇠. 1에 가까울수록 멀리 간다 */
const FLING_FRICTION = 0.94;

export default function CelebSwipeRail() {
  const t = useTranslations("celebPage");
  // 좌측 레일과 같이 body 포털로 띄운다. 스코프 안에 두면 푸터선 밑에 깔린다.
  // 첫 렌더는 자리에 그려 하이드레이션을 맞추고, 붙은 뒤 포털로 옮긴다.
  const portalTarget = useSyncExternalStore(
    () => () => {},
    () => document.body,
    () => null,
  );
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startY: number; startScroll: number } | null>(null);
  // 최근 포인터 자취(속도 계산용)와 여파 애니메이션 손잡이
  const trailRef = useRef<{ y: number; t: number }[]>([]);
  const flingRef = useRef(0);

  const stopFling = useCallback(() => {
    cancelAnimationFrame(flingRef.current);
    flingRef.current = 0;
  }, []);

  // 놓은 뒤 속도를 살려 미끄러진다. 모바일 스와이프 여파와 같은 결이다.
  const startFling = useCallback((velocity: number) => {
    stopFling();
    let v = velocity;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      v *= Math.pow(FLING_FRICTION, dt / 16.7);
      if (Math.abs(v) < 0.05) {
        flingRef.current = 0;
        return;
      }
      const before = window.scrollY;
      window.scrollTo({ top: before + v * dt, behavior: "instant" });
      // 끝에 닿아 더 안 가면 멈춘다
      if (window.scrollY === before) {
        flingRef.current = 0;
        return;
      }
      flingRef.current = requestAnimationFrame(step);
    };
    flingRef.current = requestAnimationFrame(step);
  }, [stopFling]);

  const endDrag = useCallback(() => {
    // 최근 100ms 자취로 놓는 속도를 잰다. 위로 밀면 위로 미끄러진다(부호 반전 유의).
    const trail = trailRef.current;
    const now = performance.now();
    const recent = trail.filter((point) => now - point.t < 100);
    let velocity = 0;
    if (recent.length >= 2) {
      const first = recent[0];
      const lastPoint = recent[recent.length - 1];
      const dt = lastPoint.t - first.t;
      if (dt > 0) velocity = (-(lastPoint.y - first.y) / dt) * DRAG_RATIO;
    }
    trailRef.current = [];
    dragRef.current = null;
    setDragging(false);
    document.body.style.cursor = "";
    if (Math.abs(velocity) >= FLING_MIN_VELOCITY) startFling(velocity);
    else stopFling();
  }, [startFling, stopFling]);

  // 포인터가 막대를 벗어나도 잡은 손은 유지된다. 놓치면 커서를 되돌린다.
  // 언마운트 시 여파도 함께 끈다.
  useEffect(() => {
    if (!dragging) return;
    const cancel = () => endDrag();
    window.addEventListener("pointerup", cancel);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointerup", cancel);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [dragging, endDrag]);

  useEffect(() => () => stopFling(), [stopFling]);

  const railNode = (
    <div
      className={`${styles.swipeRail} ${dragging ? styles.dragging : ""}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={t("swipeRailLabel")}
      tabIndex={0}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        stopFling();
        dragRef.current = { startY: event.clientY, startScroll: window.scrollY };
        trailRef.current = [{ y: event.clientY, t: performance.now() }];
        setDragging(true);
        document.body.style.cursor = "grabbing";
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag) return;
        const dy = event.clientY - drag.startY;
        trailRef.current.push({ y: event.clientY, t: performance.now() });
        if (trailRef.current.length > 12) trailRef.current.shift();
        if (Math.abs(dy) < DEADZONE_PX) return;
        // 전역 smooth를 타면 늦게 따라오므로 즉시 이동을 명시한다
        window.scrollTo({ top: drag.startScroll - dy * DRAG_RATIO, behavior: "instant" });
      }}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={(event) => {
        // 키보드로도 같은 막대를 탄다. 한 번에 한 화면의 4분의 1씩 간다.
        const step = Math.max(120, Math.round(window.innerHeight / 4));
        if (event.key === "ArrowUp") {
          event.preventDefault();
          window.scrollBy({ top: -step });
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          window.scrollBy({ top: step });
        } else if (event.key === "Home") {
          event.preventDefault();
          window.scrollTo({ top: 0 });
        } else if (event.key === "End") {
          event.preventDefault();
          window.scrollTo({ top: document.documentElement.scrollHeight });
        }
      }}
    >
      <span className={styles.grip} aria-hidden>
        <ChevronUp size={16} className={styles.hoverArrow} />
        <span className={styles.gripDots}>
          <span />
          <span />
          <span />
        </span>
        <ChevronDown size={16} className={styles.hoverArrow} />
      </span>
    </div>
  );

  return (
    <aside className={styles.swipeAside}>
      {portalTarget ? createPortal(railNode, portalTarget) : railNode}
    </aside>
  );
}
