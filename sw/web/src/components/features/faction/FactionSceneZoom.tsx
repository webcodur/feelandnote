"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";

const SCALE = 2;
const clamp = (value: number) => Math.max(-(SCALE - 1) / 2, Math.min((SCALE - 1) / 2, value));

interface Props {
  children: ReactNode;
  zoomed: boolean;
  onZoomChange: (zoomed: boolean) => void;
}

/** 설명과 넘기기 위치를 유지한 채 그림만 확대한다. 이동량은 비율로 보관해 화면 회전에도 빈틈이 생기지 않는다. */
export default function FactionSceneZoom({ children, zoomed, onZoomChange }: Props) {
  const t = useTranslations("explore.hub.myth");
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ id: number; x: number; y: number; offset: typeof offset } | null>(null);
  const moved = useRef(false);

  useEffect(() => {
    if (!zoomed) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      onZoomChange(false);
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [zoomed, onZoomChange]);

  return (
    <button type="button" data-scene-zoom aria-pressed={zoomed}
      aria-label={t(zoomed ? "reduceImage" : "enlargeImage")}
      title={t(zoomed ? "zoomedImageHint" : "enlargeImage")}
      className={`group absolute inset-0 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent ${zoomed ? dragging ? "cursor-grabbing" : "cursor-grab" : "cursor-zoom-in"}`}
      style={{ touchAction: zoomed ? "none" : "pan-y" }}
      onClick={(event) => {
        if (moved.current && event.detail > 0) { moved.current = false; return; }
        moved.current = false;
        const rect = event.currentTarget.getBoundingClientRect();
        setOffset(zoomed || event.detail === 0 ? { x: 0, y: 0 } : {
          x: clamp((0.5 - (event.clientX - rect.left) / rect.width) * (SCALE - 1)),
          y: clamp((0.5 - (event.clientY - rect.top) / rect.height) * (SCALE - 1)),
        });
        onZoomChange(!zoomed);
      }}
      onPointerDown={(event) => {
        moved.current = false;
        if (!zoomed || !event.isPrimary || event.button !== 0) return;
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, offset };
        event.currentTarget.setPointerCapture(event.pointerId);
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (!start || start.id !== event.pointerId) return;
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (!moved.current && Math.hypot(dx, dy) < 5) return;
        moved.current = true;
        const rect = event.currentTarget.getBoundingClientRect();
        setOffset({ x: clamp(start.offset.x + dx / rect.width), y: clamp(start.offset.y + dy / rect.height) });
      }}
      onPointerUp={(event) => {
        if (drag.current?.id !== event.pointerId) return;
        drag.current = null;
        setDragging(false);
        event.currentTarget.releasePointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { drag.current = null; setDragging(false); moved.current = true; }}
      onLostPointerCapture={() => { drag.current = null; setDragging(false); }}
      onDragStart={(event) => event.preventDefault()}>
      <span data-scene-zoom-image className={`pointer-events-none absolute inset-0 select-none ${dragging ? "" : "motion-safe:transition-transform motion-safe:duration-200"}`}
        style={{ transform: zoomed ? `translate(${offset.x * 100}%, ${offset.y * 100}%) scale(${SCALE})` : "none" }}>
        {children}
      </span>
      <span aria-hidden className="pointer-events-none absolute inset-0 group-hover:ring-1 group-hover:ring-inset group-hover:ring-accent/60 group-focus-visible:ring-2 group-focus-visible:ring-inset group-focus-visible:ring-accent" />
      <span aria-hidden className="pointer-events-none absolute bottom-3 end-3 flex min-h-9 min-w-9 items-center justify-center gap-2 rounded-full border border-white/25 bg-black/75 px-2.5 text-xs text-white group-hover:border-accent group-hover:text-accent group-focus-visible:border-accent group-focus-visible:text-accent">
        {zoomed ? <><span>{t("zoomedImageHint")}</span><ZoomOut size={16} /></> : <ZoomIn size={16} />}
      </span>
    </button>
  );
}
