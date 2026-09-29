/*
  파일명: /components/ui/ImageViewerModal.tsx
  기능: 이미지 뷰어 모달
  책임: 이미지를 전체 화면으로 띄우고, 마우스 휠로 자유 확대·축소, 확대 중에는 끌어서 이동한다.
*/ // ------------------------------

"use client";

import Image from "next/image";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Button from "./Button";
import BlurDissolve from "./BlurDissolve";
import { Z_INDEX } from "@/constants/zIndex";

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
}

export default function ImageViewerModal({
  src,
  alt = "Image",
  isOpen,
  onClose,
  caption,
}: ImageViewerModalProps) {
  // scale은 transform-origin이 중앙인 상태의 배율, x·y는 그 중앙 기준 이동량
  const [view, setView] = useState({ scale: 1, x: 0, y: 0 });
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
  }

  /* Esc는 캡처 단계에서 먼저 잡는다 — 아래 깔린 모달(document 버블 단계)까지 같이 닫히지 않게 */
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      onClose();
    };
    document.addEventListener("keydown", onKeyDown, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  /* 휠 확대는 커서가 가리킨 지점을 고정해 배율을 바꾼다 — React onWheel은 수동형이라 네이티브로 단다 */
  useEffect(() => {
    const frame = frameRef.current;
    if (!isOpen || !frame) return;
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
  }, [isOpen]);

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

      {/* 끌기가 없던 클릭은 닫기다 — 바깥 배경 클릭과 같은 취급. 더블클릭은 1배 복귀 */}
      <div
        ref={frameRef}
        className={`relative flex max-h-[90vh] max-w-[90vw] flex-col items-center justify-center gap-3 overflow-hidden p-4 outline-none ${view.scale > 1 ? (dragging ? "cursor-grabbing" : "cursor-grab") : "cursor-zoom-out"}`}
        style={{ touchAction: "none" }}
        onDoubleClick={() => setView({ scale: 1, x: 0, y: 0 })}
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
          if (drag.current?.id !== event.pointerId) return;
          drag.current = null;
          setDragging(false);
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => { drag.current = null; setDragging(false); moved.current = true; }}
        onLostPointerCapture={() => { drag.current = null; setDragging(false); }}
        onDragStart={(event) => event.preventDefault()}
      >
        <BlurDissolve key={src} className="flex items-center justify-center">
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
              className="max-h-[78vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
          </span>
        </BlurDissolve>
        {/* 설명이 있는 그림에만 붙는다. 없으면 자리도 차지하지 않는다 */}
        {caption ? (
          <p className="max-w-[46rem] text-center text-sm leading-relaxed text-white/70">
            {caption}
          </p>
        ) : null}
      </div>
    </div>,
    document.body
  );
}
