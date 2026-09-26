/*
  파일명: /hooks/useMouseDragScroll.ts
  기능: 가로·세로 목록을 마우스로 잡아끌어 넘긴다
  책임: 마우스 끌기, 놓은 뒤 미끄러짐, 끈 직후 클릭 막기를 한곳에 둔다.
        터치는 손대지 않는다 — 브라우저 기본 스크롤이어야 관성이 붙어 부드럽다.
        규칙과 경위는 ui-rail 스킬이 쥔다.
*/ // ------------------------------

"use client";

import { useEffect, useRef, useState, type DragEvent, type MouseEvent, type PointerEvent } from "react";

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  startScroll: number;
  dragging: boolean;
  /* 손을 뗀 뒤 이어 미끄러질 속도(px/ms)를 재려고 마지막 움직임을 기억한다 */
  lastPosition: number;
  lastTime: number;
  velocity: number;
}

/** 선택한 축으로 이만큼 움직여야 끌기로 본다. 그 전까지는 클릭이다 */
const DRAG_THRESHOLD_PX = 6;
/** 미끄러짐이 1ms마다 남기는 속도 비율 — 작을수록 빨리 멈춘다 */
const GLIDE_FRICTION = 0.995;
/** 마지막 움직임 뒤 이보다 오래 멈췄다 놓으면 미끄러지지 않는다 */
const GLIDE_RELEASE_MS = 80;

export function useMouseDragScroll<T extends HTMLElement = HTMLDivElement>(axis: "x" | "y" = "x") {
  const ref = useRef<T>(null);
  const dragRef = useRef<DragState | null>(null);
  const glideFrameRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const scrollPosition = (el: T) => axis === "x" ? el.scrollLeft : el.scrollTop;
  const maxScroll = (el: T) => axis === "x" ? el.scrollWidth - el.clientWidth : el.scrollHeight - el.clientHeight;
  const setScroll = (el: T, value: number) => { if (axis === "x") el.scrollLeft = value; else el.scrollTop = value; };
  const pointerPosition = (event: PointerEvent<T>) => axis === "x" ? event.clientX : event.clientY;

  const stopGlide = () => {
    if (glideFrameRef.current !== null) cancelAnimationFrame(glideFrameRef.current);
    glideFrameRef.current = null;
  };

  useEffect(() => () => {
    if (glideFrameRef.current !== null) cancelAnimationFrame(glideFrameRef.current);
  }, []);

  /* 끌다 놓으면 손 속도대로 조금 더 미끄러지다 멈춘다 — 그 자리에 뚝 서면 둔탁하다 */
  const glide = (el: T, pointerVelocity: number) => {
    const limit = maxScroll(el);
    let position = scrollPosition(el);
    let velocity = -pointerVelocity;
    let lastTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - lastTime;
      lastTime = now;
      position = Math.min(limit, Math.max(0, position + velocity * elapsed));
      setScroll(el, position);
      velocity *= GLIDE_FRICTION ** elapsed;
      const atEdge = position <= 0 || position >= limit;
      glideFrameRef.current = Math.abs(velocity) > 0.02 && !atEdge ? requestAnimationFrame(step) : null;
    };
    glideFrameRef.current = requestAnimationFrame(step);
  };

  const onPointerDown = (event: PointerEvent<T>) => {
    suppressClickRef.current = false;
    const el = ref.current;
    if (!el || event.pointerType !== "mouse" || event.button !== 0) return;
    /* 조작 요소 위에서 누른 건 끌기로 받지 않는다 — 뱃지·단추 위의 클릭이 문턱만큼
       움직였다는 이유로 끌기 판정에 삼켜지지 않게. 칸 안의 조작부는 data-no-drag를 단다 */
    if (event.target instanceof HTMLElement && event.target.closest("[data-no-drag]")) return;
    stopGlide();
    if (maxScroll(el) <= 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScroll: scrollPosition(el),
      dragging: false,
      lastPosition: pointerPosition(event),
      lastTime: event.timeStamp,
      velocity: 0,
    };
  };

  const onPointerMove = (event: PointerEvent<T>) => {
    const el = ref.current;
    const drag = dragRef.current;
    if (!el || !drag || drag.pointerId !== event.pointerId) return;

    if (!drag.dragging) {
      const deltaX = event.clientX - drag.startX;
      const deltaY = event.clientY - drag.startY;
      const distance = axis === "x" ? Math.abs(deltaX) : Math.abs(deltaY);
      const crossDistance = axis === "x" ? Math.abs(deltaY) : Math.abs(deltaX);
      if (distance < DRAG_THRESHOLD_PX || distance <= crossDistance) return;
      drag.dragging = true;
      /* 끌기로 판정한 지점을 새 기준으로 삼는다 — 문턱만큼 한 번에 건너뛰지 않게 */
      drag.startX = event.clientX;
      drag.startY = event.clientY;
      drag.lastPosition = pointerPosition(event);
      drag.lastTime = event.timeStamp;
      suppressClickRef.current = true;
      setIsDragging(true);
      el.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
    const position = pointerPosition(event);
    setScroll(el, drag.startScroll - (position - (axis === "x" ? drag.startX : drag.startY)));
    const elapsed = event.timeStamp - drag.lastTime;
    if (elapsed > 0) drag.velocity = 0.8 * ((position - drag.lastPosition) / elapsed) + 0.2 * drag.velocity;
    drag.lastPosition = position;
    drag.lastTime = event.timeStamp;
  };

  const onPointerEnd = (event: PointerEvent<T>) => {
    const el = ref.current;
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (el?.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    if (!drag.dragging) return;

    setIsDragging(false);
    /* 끈 직후의 클릭 한 번만 막는다. 클릭이 오지 않는 브라우저에서 다음 클릭까지 먹지 않게 곧 푼다 */
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, 0);
    /* 손을 멈췄다 놓았으면 미끄러지지 않는다 */
    if (el && event.timeStamp - drag.lastTime < GLIDE_RELEASE_MS) glide(el, drag.velocity);
  };

  /* 끌기로 판정된 직후의 클릭은 칸까지 내려보내지 않는다 — 밀려고 잡은 칸이 눌리지 않게 */
  const onClickCapture = (event: MouseEvent<T>) => {
    if (!suppressClickRef.current) return;
    event.preventDefault();
    event.stopPropagation();
  };

  /* 칸 안의 링크·이미지는 브라우저가 네이티브 드래그(dragstart)를 시작해 pointerup·click을 삼킨다 —
     눌러서 조금 움직인 클릭이 뱃지·단추까지 닿지 못하게 된다. 네이티브 드래그는 줄 안에서 전부 막는다 */
  const onDragStart = (event: DragEvent<T>) => {
    event.preventDefault();
  };

  return {
    ref,
    cursorClassName: isDragging ? "cursor-grabbing" : "cursor-grab",
    dragProps: { onPointerDown, onPointerMove, onPointerUp: onPointerEnd, onPointerCancel: onPointerEnd, onClickCapture, onDragStart },
  };
}
