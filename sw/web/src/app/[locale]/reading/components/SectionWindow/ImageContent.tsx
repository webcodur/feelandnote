/*
  파일명: /app/reading/components/SectionWindow/ImageContent.tsx
  기능: 이미지 섹션 콘텐츠
  책임: 붙여넣은 이미지를 팬·줌으로 표시한다.
*/ // ------------------------------

"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Image } from "lucide-react";

export default function ImageContent({ imageUrl }: { imageUrl: string | null }) {
  const t = useTranslations("reading.section");
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, startX: 0, startY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const MIN_SCALE = 0.5;
  const MAX_SCALE = 3;

  // #region 드래그 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imageUrl) return;
    e.preventDefault();
    setIsPanning(true);
    panStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      startX: offset.x,
      startY: offset.y,
    };
  };

  useEffect(() => {
    if (!isPanning) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setOffset({
        x: panStartRef.current.startX + dx,
        y: panStartRef.current.startY + dy,
      });
    };

    const handleMouseUp = () => setIsPanning(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isPanning]);
  // #endregion

  // passive: false로 네이티브 이벤트 리스너 등록 (preventDefault 작동을 위해)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      setScale((prev) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev + delta)));
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`flex h-full items-center justify-center overflow-hidden ${imageUrl ? "cursor-grab active:cursor-grabbing" : ""}`}
      onMouseDown={handleMouseDown}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={t("pastedImage")}
          className="rounded-lg object-contain transition-transform duration-75"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center"
          }}
          draggable={false}
        />
      ) : (
        <div className="text-center text-text-secondary">
          <Image className="mx-auto mb-2 size-8 opacity-50" />
          <p className="text-xs">{t("imagePaste")}</p>
          <p className="mt-1 text-[10px]">{t("imageHint")}</p>
        </div>
      )}
    </div>
  );
}
