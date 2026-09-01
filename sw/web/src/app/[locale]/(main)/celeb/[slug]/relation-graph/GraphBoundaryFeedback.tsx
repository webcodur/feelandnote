"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { PanBoundary } from "./graphCamera";
import styles from "./GraphBoundaryFeedback.module.css";

const BOUNDARIES = ["top", "end", "bottom", "start"] as const satisfies PanBoundary[];
const BOUNDARY_CLASSES = {
  top: styles.top,
  end: styles.end,
  bottom: styles.bottom,
  start: styles.start,
} satisfies { [Key in PanBoundary]: string };
const LINGER_MS = 320;
const clampInside = (value: number, start: number, end: number, inset: number) => {
  const safeInset = Math.min(inset, Math.max(0, end - start) / 2);
  return Math.min(end - safeInset, Math.max(start + safeInset, value));
};

export interface GraphBoundaryFeedbackHandle {
  show: (boundaries: PanBoundary[], pointer?: [number, number]) => void;
}

const GraphBoundaryFeedback = forwardRef<GraphBoundaryFeedbackHandle>(function GraphBoundaryFeedback(_, ref) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useImperativeHandle(ref, () => ({
    show: (boundaries, pointer) => {
      const root = rootRef.current;
      if (!root) return;
      if (boundaries.length) {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
        const next = boundaries.join(" ");
        if (root.dataset.edges !== next) root.dataset.edges = next;
        const rect = root.getBoundingClientRect();
        const compact = rect.width < 480;
        const visibleTop = Math.max(rect.top, 72);
        const visibleBottom = Math.min(rect.bottom, window.innerHeight - (compact ? 84 : 8));
        const pointerX = pointer?.[0] ?? rect.left + rect.width / 2;
        const pointerY = pointer?.[1] ?? (visibleTop + visibleBottom) / 2;
        root.style.setProperty("--feedback-x", `${clampInside(pointerX, rect.left, rect.right, compact ? 82 : 144) - rect.left}px`);
        root.style.setProperty("--feedback-y", `${clampInside(pointerY, visibleTop, visibleBottom, compact ? 74 : 112) - rect.top}px`);
        root.style.setProperty("--feedback-top", `${visibleTop - rect.top + 7}px`);
        root.style.setProperty("--feedback-bottom", `${visibleBottom - rect.top - 7}px`);
        return;
      }
      if (!root.dataset.edges || hideTimerRef.current) return;
      hideTimerRef.current = setTimeout(() => {
        delete root.dataset.edges;
        hideTimerRef.current = null;
      }, LINGER_MS);
    },
  }), []);
  useEffect(() => () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, []);
  return <div ref={rootRef} className={styles.feedback} aria-hidden="true">
    {BOUNDARIES.map((boundary) => <span key={boundary} className={`${styles.stop} ${BOUNDARY_CLASSES[boundary]}`}><i /></span>)}
  </div>;
});

export default GraphBoundaryFeedback;
