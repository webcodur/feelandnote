/*
  파일명: /app/reading/components/SectionWindow/useWindowControls.ts
  기능: 윈도우 조작 훅
  책임: 섹션 윈도우의 드래그·리사이즈·최대화 상태와 핸들러를 제공한다.
*/ // ------------------------------

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { Section } from "../../types";

const MIN_SIZE = { width: 200, height: 150 };

interface Params {
  position: Section["position"];
  size: Section["size"];
  onUpdate: (updates: Partial<Section>) => void;
}

export function useWindowControls({ position, size, onUpdate }: Params) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [prevState, setPrevState] = useState({ size, position });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // #region 드래그 핸들러
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (isMaximized) return;
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
    },
    [isMaximized, position]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      onUpdate({
        position: { x: dragStartRef.current.posX + dx, y: dragStartRef.current.posY + dy },
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, onUpdate]);
  // #endregion

  // #region 리사이즈 핸들러
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, corner: string) => {
      if (isMaximized) return;
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(corner);
      resizeStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height,
        posX: position.x,
        posY: position.y,
      };
    },
    [isMaximized, size, position]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - resizeStartRef.current.x;
      const dy = e.clientY - resizeStartRef.current.y;
      const { width, height, posX, posY } = resizeStartRef.current;

      let newWidth = width;
      let newHeight = height;
      let newX = posX;
      let newY = posY;

      if (isResizing.includes("e")) newWidth = Math.max(MIN_SIZE.width, width + dx);
      if (isResizing.includes("w")) {
        newWidth = Math.max(MIN_SIZE.width, width - dx);
        newX = posX + (width - newWidth);
      }
      if (isResizing.includes("s")) newHeight = Math.max(MIN_SIZE.height, height + dy);
      if (isResizing.includes("n")) {
        newHeight = Math.max(MIN_SIZE.height, height - dy);
        newY = posY + (height - newHeight);
      }

      onUpdate({
        size: { width: newWidth, height: newHeight },
        position: { x: newX, y: newY },
      });
    };

    const handleMouseUp = () => setIsResizing(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, onUpdate]);
  // #endregion

  // #region 최대화
  const handleMaximize = useCallback(() => {
    if (isMaximized) {
      onUpdate({ size: prevState.size, position: prevState.position });
      setIsMaximized(false);
    } else {
      setPrevState({ size, position });
      const parent = containerRef.current?.parentElement;
      if (parent) {
        onUpdate({
          size: { width: parent.clientWidth - 40, height: parent.clientHeight - 40 },
          position: { x: 20, y: 20 },
        });
      }
      setIsMaximized(true);
    }
  }, [isMaximized, size, position, prevState, onUpdate]);
  // #endregion

  return { containerRef, isMaximized, handleDragStart, handleResizeStart, handleMaximize };
}
