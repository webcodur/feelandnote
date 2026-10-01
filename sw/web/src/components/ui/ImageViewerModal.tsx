/*
  파일명: /components/ui/ImageViewerModal.tsx
  기능: 이미지 뷰어 모달
  책임: 이미지를 전체 화면으로 띄우고, 마우스 휠로 자유 확대·축소, 확대 중에는 끌어서 이동한다.
*/ // ------------------------------

"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Button from "./Button";
import BlurDissolve from "./BlurDissolve";
import { Z_INDEX } from "@/constants/zIndex";
import { lockBodyScroll, unlockBodyScroll } from "@/lib/scrollLock";
import { useWheelPaging } from "@/hooks/useWheelPaging";

const MIN_SCALE = 1;
const MAX_SCALE = 10;
const WHEEL_STEP = 1.35;

interface ImageViewerModalProps {
  src: string;
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
  /** 그림이 그린 순간을 적은 한 줄. 넘기지 않으면 아무것도 그리지 않는다 */
  caption?: string | null;
  /** 넘길 이전·다음 그림이 있을 때 ‹ › 버튼과 최소 배율 가로 밀기가 켜진다 */
  onPrev?: () => void;
  onNext?: () => void;
  /** 캡션에 강조 렌더를 쓸 때 넘긴다 — 장면 해설의 대사·강조 서식을 전체보기에도 유지한다 */
  renderCaption?: (caption: string) => ReactNode;
}

export default function ImageViewerModal({
  src,
  alt = "Image",
  isOpen,
  onClose,
  caption,
  onPrev,
  onNext,
  renderCaption,
}: ImageViewerModalProps) {
  // scale은 transform-origin이 중앙인 상태의 배율, x·y는 그 중앙 기준 이동량
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
  /* 그림을 클릭해야 줌 모드에 든다 — 평시 휠은 장면 넘기기, 줌 모드에서만 휠이 배율을 바꾼다 */
  const [zoomMode, setZoomMode] = useState(false);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; vx: number; vy: number } | null>(null);
  const moved = useRef(false);
  const frameRef = useRef<HTMLDivElement>(null);

  /* 열 때와 그림이 바뀔 때 1배로 돌린다 — 렌더 중 조정이라 이펙트 없이 잡는다 */
  const [openedWith, setOpenedWith] = useState<string | null>(null);
  const sessionKey = isOpen ? src : null;
  if (sessionKey !== openedWith) {
    setOpenedWith(sessionKey);
    setView({ scale: 1, x: 0, y: 0 });
    setZoomMode(false);
  }

  /* Esc는 캡처 단계에서 먼저 잡는다 — 아래 깔린 모달(document 버블 단계)까지 같이 닫히지 않게 */
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      /* 줌 모드에서는 창을 닫기 전에 모드부터 빠진다 */
      if (zoomMode) { setZoomMode(false); setView({ scale: 1, x: 0, y: 0 }); return; }
      onClose();
    };
    document.addEventListener("keydown", onKeyDown, true);
    lockBodyScroll();
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      unlockBodyScroll();
    };
  }, [isOpen, onClose, zoomMode]);

  /* 평시 휠은 장면 넘기기 — 넘길 그림이 있고 줌 모드가 아닐 때만 */
  useWheelPaging(frameRef, { onPrev, onNext, enabled: isOpen && !zoomMode && Boolean(onPrev || onNext) });

  /* 휠 확대는 커서가 가리킨 지점을 고정해 배율을 바꾼다 — 줌 모드에서만, React onWheel은 수동형이라 네이티브로 단다 */
  useEffect(() => {
    const frame = frameRef.current;
    if (!isOpen || !frame || !zoomMode) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = frame.getBoundingClientRect();
      const cx = e.clientX - (rect.left + rect.width / 2);
      const cy = e.clientY - (rect.top + rect.height / 2);
      const factor = e.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP;
      setView((v) => {
        const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
        if (scale === MIN_SCALE) return { scale: MIN_SCALE, x: 0, y: 0 };
        const k = scale / v.scale;
        return { scale, x: cx - (cx - v.x) * k, y: cy - (cy - v.y) * k };
      });
    };
    frame.addEventListener("wheel", onWheel, { passive: false });
    return () => frame.removeEventListener("wheel", onWheel);
  }, [isOpen, zoomMode]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      style={{ zIndex: Z_INDEX.top }}
      onClick={() => {
        if (moved.current) { moved.current = false; return; }
        onClose();
      }}
    >
      <Button
        unstyled
        onClick={onClose}
        className="absolute top-4 end-4 p-2 text-white/50 hover:text-white"
      >
        <X size={32} />
      </Button>

      {/* 넘길 그림이 있는 뷰어에서는 양끝 ‹ › 버튼이 붙는다 — 배경 클릭 닫기와 분리한다 */}
      {onPrev && (
        <Button unstyled aria-label="이전" onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute start-3 top-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-black/60 p-2 text-white/80 hover:border-white hover:text-white">
          <ChevronLeft size={28} />
        </Button>
      )}
      {onNext && (
        <Button unstyled aria-label="다음" onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute end-3 top-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-black/60 p-2 text-white/80 hover:border-white hover:text-white">
          <ChevronRight size={28} />
        </Button>
      )}

      {/* 그림을 누르면 줌 모드가 켜지고 다시 누르면 꺼진다(배율도 1배로). 더블클릭은 모드를 끄며 1배 복귀 */}
      <div
        ref={frameRef}
        className={`relative flex max-h-[97vh] max-w-[97vw] flex-col items-center justify-center gap-3 overflow-hidden p-1 outline-none ${view.scale > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : zoomMode ? "cursor-zoom-out" : "cursor-zoom-in"}`}
        style={{ touchAction: "none" }}
        onClick={(event) => {
          event.stopPropagation();
          if (moved.current) { moved.current = false; return; }
          if (event.target instanceof HTMLElement && event.target.closest("[data-wheel-pass], button, a")) return;
          if (zoomMode) { setZoomMode(false); setView({ scale: 1, x: 0, y: 0 }); }
          else setZoomMode(true);
        }}
        onDoubleClick={() => { setView({ scale: 1, x: 0, y: 0 }); setZoomMode(false); }}
        onPointerDown={(event) => {
          moved.current = false;
          if (!event.isPrimary || event.button !== 0) return;
          drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, vx: view.x, vy: view.y };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start || start.id !== event.pointerId) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (!moved.current && Math.hypot(dx, dy) < 5) return;
          moved.current = true;
          if (view.scale > 1) { setDragging(true); setView((v) => ({ ...v, x: start.vx + dx, y: start.vy + dy })); }
        }}
        onPointerUp={(event) => {
          const start = drag.current;
          if (start?.id !== event.pointerId) return;
          drag.current = null;
          setDragging(false);
          event.currentTarget.releasePointerCapture(event.pointerId);
          /* 최소 배율에서는 가로 밀기가 그림 넘기기다 — 끌기로 닫기가 켜지지 않게 moved를 세운다 */
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (view.scale <= MIN_SCALE && (onPrev || onNext) && Math.abs(dx) >= 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
            moved.current = true;
            if (dx < 0) onNext?.(); else onPrev?.();
          }
        }}
        onPointerCancel={() => { drag.current = null; setDragging(false); moved.current = true; }}
        onLostPointerCapture={() => { drag.current = null; setDragging(false); }}
        onDragStart={(event) => event.preventDefault()}
      >
        {/* 상대 상자가 그림 폭·높이에 맞춰지므로 캡션은 그림 위에 깔린다 — 장면 뷰어 자막과 같은 처리.
            캡션은 배율을 따르지 않게 변형 span 밖에 둔다 */}
        <BlurDissolve key={src} className="relative flex items-center justify-center">
          <span
            className={`block select-none ${dragging ? "" : "motion-safe:transition-transform motion-safe:duration-150"}`}
            style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
          >
            <Image
              src={src}
              alt={alt}
              width={1200}
              height={800}
              unoptimized
              draggable={false}
              className="h-[93vh] w-auto max-w-[95vw] rounded-lg object-contain shadow-2xl"
            />
          </span>
          {/* 설명이 있는 그림에만 붙는다. 없으면 자리도 차지하지 않는다 */}
          {caption ? (
            <div data-wheel-pass className="absolute inset-x-0 bottom-0 max-h-[45%] overflow-y-auto overscroll-contain rounded-b-lg bg-gradient-to-t from-black/90 via-black/65 to-transparent px-4 pb-3 pt-10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <p className="mx-auto w-full max-w-3xl whitespace-pre-line break-keep text-center text-lg leading-relaxed text-white [overflow-wrap:anywhere] md:text-balance md:text-2xl md:leading-relaxed">
                {renderCaption ? renderCaption(caption) : caption}
              </p>
            </div>
          ) : null}
        </BlurDissolve>
      </div>
    </div>,
    document.body
  );
}
