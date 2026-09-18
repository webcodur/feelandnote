/*
  파일명: /components/layout/SwipeRail.tsx
  기능: PC 화면 오른쪽에 떠 있는 반투명 스와이프 판
  책임: 휴대폰에서 화면을 손가락으로 밀듯, 마우스로 이 판을 잡아끌면 페이지가 따라온다.
        놓으면 그 자리에서 멈춘다(마우스에는 미끄러짐이 어색하다). 스크롤바처럼 보이는 요소(화살표·트랙·눈금)는 두지 않는다.
        끄는 동안은 누른 자리에 짚은 자국이 남고, 자국은 화면이 실제로 움직인 거리만큼
        (손보다 감도 배율만큼 앞서) 오르내리며 판 밖으로 나가면 그대로 사라진다.
        맨 아래 설정 단추로 감도(손 1px당 페이지 몇 px)를 고르며, 값은 브라우저에 남는다.
        휴대폰 폭·게임 전체 화면·스크롤할 것이 없는 짧은 화면에서는 서지 않는다.
        인물 상세는 좌측 목차 레일의 중심을 CSS 변수로 알리므로 그 자리에 대칭으로 서고(1340px+),
        그 밖의 화면은 LayoutMain이 본문 틀 안쪽에 비워 둔 오른쪽 여백에 선다(1280px+). SwipeRail.module.css.
*/ // ------------------------------
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";

import { Z_INDEX } from "@/constants/zIndex";

import { useGameFullScreenLayer } from "./musicPlayerSlots";
import styles from "./SwipeRail.module.css";

/** 감도(잡아끄는 배율). 손 1px에 페이지가 몇 px 가는가. 긴 페이지를 오가도록 기본은 1보다 크다 */
const RATIO_DEFAULT = 2;
const RATIO_MIN = 1;
const RATIO_MAX = 4;
const RATIO_STEP = 0.5;
const RATIO_STORAGE_KEY = "feelandnote.swipeRail.ratio";

function readStoredRatio(): number {
  try {
    const raw = window.localStorage.getItem(RATIO_STORAGE_KEY);
    const value = raw === null ? NaN : Number(raw);
    if (!Number.isFinite(value)) return RATIO_DEFAULT;
    return Math.min(RATIO_MAX, Math.max(RATIO_MIN, value));
  } catch {
    return RATIO_DEFAULT;
  }
}
/** 이보다 짧으면 딸려온 진동으로 보고 무시한다 */
const DEADZONE_PX = 3;
/** 이만큼도 못 내려가는 화면에는 막대를 세우지 않는다 */
const MIN_SCROLLABLE_PX = 80;
/* ── 짚은 선의 잔상 ──
   선이 지나온 자리에 옅은 띠가 잠깐 남았다 사라진다. 최근 TRAIL_WINDOW_MS 동안 지나온
   구간을 띠로 그리므로, 멈추면 오래된 자취부터 창 밖으로 빠지며 띠가 저절로 줄어든다. */
const TRAIL_WINDOW_MS = 140;

export default function SwipeRail({ celeb = false }: { celeb?: boolean }) {
  const t = useTranslations("layout.swipeRail");
  const gameLayer = useGameFullScreenLayer();
  const [scrollable, setScrollable] = useState(false);
  const [dragging, setDragging] = useState(false);
  // 첫 렌더는 어차피 null(스크롤 가능 여부를 잰 뒤에야 그린다)이라 초기값에서 저장소를 읽어도 서버와 어긋나지 않는다
  const [ratio, setRatio] = useState(() => (typeof window === "undefined" ? RATIO_DEFAULT : readStoredRatio()));
  const [settingsOpen, setSettingsOpen] = useState(false);
  // 포인터 핸들러는 렌더와 무관하게 최신 감도를 읽는다
  const ratioRef = useRef(ratio);
  const settingsRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLSpanElement>(null);
  const trailBandRef = useRef<HTMLSpanElement>(null);
  const dragRef = useRef<{ startY: number; startScroll: number } | null>(null);
  // 잔상 자취: 최근 이동량과 시각, 그리고 띠를 갱신하는 애니메이션 손잡이
  const trailPathRef = useRef<{ points: { shift: number; t: number }[]; raf: number }>({ points: [], raf: 0 });

  /* ── 0. 감도 저장·설정 창 닫기 ── */
  const changeRatio = useCallback((next: number) => {
    ratioRef.current = next;
    setRatio(next);
    try {
      window.localStorage.setItem(RATIO_STORAGE_KEY, String(next));
    } catch {
      // 저장이 막힌 브라우저에서는 이번 방문에만 적용된다
    }
  }, []);

  // 설정 창은 바깥을 누르거나 Esc로 닫는다
  useEffect(() => {
    if (!settingsOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!settingsRef.current?.contains(event.target as Node)) setSettingsOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSettingsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [settingsOpen]);

  /* ── 1. 세울 수 있는 화면인가 ── */
  useEffect(() => {
    const measure = () => {
      const room = document.documentElement.scrollHeight - window.innerHeight;
      setScrollable(room > MIN_SCROLLABLE_PX);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(document.body);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  /* ── 2. 끌기 ── */
  /** 최근 자취로 잔상 띠를 프레임마다 그린다. 자취가 창 밖으로 다 빠지면 띠를 접고 멈춘다 */
  const runTrail = useCallback(() => {
    const trail = trailPathRef.current;
    if (trail.raf) return;
    const step = () => {
      const band = trailBandRef.current;
      trail.raf = 0;
      if (!band) return;
      const now = performance.now();
      const points = trail.points.filter((point) => now - point.t <= TRAIL_WINDOW_MS);
      // 현재 위치는 항상 남긴다 — 마지막 점이 창을 벗어나도 띠의 한쪽 끝은 지금 자리다
      const latest = trail.points[trail.points.length - 1];
      if (latest && !points.includes(latest)) points.push(latest);
      trail.points = points;
      if (points.length < 2 || !latest) {
        band.style.height = "0px";
        return;
      }
      const oldest = points[0].shift;
      const current = latest.shift;
      const top = Math.min(oldest, current);
      const height = Math.abs(current - oldest);
      band.style.top = `calc(var(--pin-y, 0px) + ${top}px)`;
      band.style.height = `${height}px`;
      // 지나온 쪽(오래된 끝)이 옅다
      band.style.background = current >= oldest
        ? "linear-gradient(180deg, transparent, color-mix(in srgb, white 9%, transparent))"
        : "linear-gradient(0deg, transparent, color-mix(in srgb, white 9%, transparent))";
      trail.raf = requestAnimationFrame(step);
    };
    trail.raf = requestAnimationFrame(step);
  }, []);

  /** 자국의 이동량을 판의 CSS 변수로 올린다. null이면 자국과 잔상을 지운다.
      자국은 화면이 간 거리를 그대로 받아 판을 넘어가면 overflow에 잘려 사라진다. */
  const paintTrack = useCallback((dy: number | null) => {
    const track = trackRef.current;
    const trail = trailPathRef.current;
    if (!track) return;
    if (dy === null) {
      track.style.removeProperty("--pin-y");
      track.style.removeProperty("--pin-shift");
      cancelAnimationFrame(trail.raf);
      trail.raf = 0;
      trail.points = [];
      if (trailBandRef.current) trailBandRef.current.style.height = "0px";
      return;
    }
    track.style.setProperty("--pin-shift", `${dy}px`);
    trail.points.push({ shift: dy, t: performance.now() });
    runTrail();
  }, [runTrail]);

  useEffect(() => () => cancelAnimationFrame(trailPathRef.current.raf), []);

  // 놓으면 페이지는 그 자리에서 멈춘다. 손이 멈춘 곳이 곧 페이지가 선 곳이다.
  const endDrag = useCallback(() => {
    paintTrack(null);
    dragRef.current = null;
    setDragging(false);
    document.body.style.cursor = "";
  }, [paintTrack]);

  // 포인터가 막대를 벗어나도 잡은 손은 유지된다. 놓치면 커서를 되돌린다.
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

  // 게임 전체 화면이 덮고 있거나 내려갈 데가 없으면 서지 않는다
  if (gameLayer || !scrollable) return null;

  return (
    <div
      className={styles.rail}
      style={{ zIndex: Z_INDEX.fab }}
      data-celeb={celeb || undefined}
      data-dragging={dragging || undefined}
      role="separator"
      aria-orientation="vertical"
      aria-label={t("label")}
      tabIndex={0}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        const track = trackRef.current;
        const box = track?.getBoundingClientRect();
        // 누른 자리를 판 좌표로 옮겨 자국을 찍는다. 자국은 판과 함께 화면이 간 만큼 움직인다
        const pinY = box ? event.clientY - box.top : 0;
        dragRef.current = { startY: event.clientY, startScroll: window.scrollY };
        track?.style.setProperty("--pin-y", `${pinY}px`);
        paintTrack(0);
        setDragging(true);
        document.body.style.cursor = "grabbing";
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag) return;
        const dy = event.clientY - drag.startY;
        if (Math.abs(dy) < DEADZONE_PX) return;
        // 전역 smooth를 타면 늦게 따라오므로 즉시 이동을 명시한다
        window.scrollTo({ top: drag.startScroll - dy * ratioRef.current, behavior: "instant" });
        // 자국은 손이 아니라 화면이 실제로 움직인 거리만큼 간다. 손보다 감도 배율만큼 빠르고,
        // 페이지가 끝에 닿아 더 못 가면 자국도 거기서 멈춘다
        paintTrack(-(window.scrollY - drag.startScroll));
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
      <span ref={trackRef} className={styles.track} aria-hidden>
        {/* 선이 지나온 자리의 잔상. 오래된 쪽이 옅고, 멈추면 저절로 줄어든다 */}
        <span ref={trailBandRef} className={styles.trail} />
        {/* 누른 자리의 자국 — 판 폭 전체의 가는 눈금. 화면이 간 만큼 움직이고 판을 넘으면 잘려 보이지 않는다 */}
        <span className={styles.pin} />
      </span>

      {/* 설정: 감도. 단추와 창 모두 판의 끌기로 올라가지 않게 막는다 */}
      <div ref={settingsRef} className={styles.foot} onPointerDown={(event) => event.stopPropagation()}>
        <button
          type="button"
          className={styles.gear}
          aria-label={t("settings")}
          aria-expanded={settingsOpen}
          data-open={settingsOpen || undefined}
          onClick={() => setSettingsOpen((open) => !open)}
        >
          <SlidersHorizontal size={15} aria-hidden />
        </button>
        {settingsOpen && (
          <div className={styles.settings} role="dialog" aria-label={t("settings")}>
            <label className={styles.settingsRow}>
              <span className={styles.settingsLabel}>{t("sensitivity")}</span>
              <span className={styles.settingsValue}>{ratio.toFixed(1)}×</span>
              <input
                type="range"
                className={styles.slider}
                min={RATIO_MIN}
                max={RATIO_MAX}
                step={RATIO_STEP}
                value={ratio}
                onChange={(event) => changeRatio(Number(event.target.value))}
              />
            </label>
            <p className={styles.settingsNote}>{t("sensitivityNote")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
