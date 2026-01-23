/*
  파일명: /app/reading/components/BookInfoWindow.tsx
  기능: 드래그 & 리사이즈 가능한 책 정보 창
  책임: 선택한 책의 정보를 표시하는 이동/크기조정 가능한 윈도우를 제공한다.
*/ // ------------------------------

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { X, Maximize2, Minimize2, Book } from "lucide-react";
import type { SelectedBook } from "../types";

interface Props {
  book: SelectedBook;
  onClose: () => void;
}

const DEFAULT_SIZE = { width: 320, height: 400 };
const DEFAULT_POSITION = { x: 40, y: 40 };
const MIN_SIZE = { width: 200, height: 200 };

export default function BookInfoWindow({ book, onClose }: Props) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [prevState, setPrevState] = useState({ size: DEFAULT_SIZE, position: DEFAULT_POSITION });
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [position, setPosition] = useState(DEFAULT_POSITION);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<string | null>(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const resizeStartRef = useRef({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // #region 드래그 핸들러
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (isMaximized) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, posX: position.x, posY: position.y };
  }, [isMaximized, position]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setPosition({ x: dragStartRef.current.posX + dx, y: dragStartRef.current.posY + dy });
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);
  // #endregion

  // #region 리사이즈 핸들러
  const handleResizeStart = useCallback((e: React.MouseEvent, corner: string) => {
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
  }, [isMaximized, size, position]);

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

      setSize({ width: newWidth, height: newHeight });
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => setIsResizing(null);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);
  // #endregion

  const handleMaximize = useCallback(() => {
    if (isMaximized) {
      setSize(prevState.size);
      setPosition(prevState.position);
      setIsMaximized(false);
    } else {
      setPrevState({ size, position });
      const parent = containerRef.current?.parentElement;
      if (parent) {
        setSize({ width: parent.clientWidth - 40, height: parent.clientHeight - 40 });
        setPosition({ x: 20, y: 20 });
      }
      setIsMaximized(true);
    }
  }, [isMaximized, size, position, prevState]);

  const resizeHandleClass = "absolute bg-transparent hover:bg-accent/30";

  return (
    <div
      ref={containerRef}
      className="absolute z-10"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
      }}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-[#1a1f27] shadow-2xl">
        {/* 헤더 (드래그 핸들) */}
        <div
          onMouseDown={handleDragStart}
          className={`flex h-10 shrink-0 items-center justify-between border-b border-border bg-secondary px-3 ${
            isMaximized ? "cursor-default" : "cursor-move"
          }`}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            <Book className="size-4 text-accent" />
            <span className="max-w-[180px] truncate">{book.title}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleMaximize}
              className="flex size-6 items-center justify-center rounded hover:bg-white/10"
              title={isMaximized ? "복원" : "최대화"}
            >
              {isMaximized ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="flex size-6 items-center justify-center rounded hover:bg-white/10"
              title="닫기"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4 flex justify-center">
            {book.thumbnail ? (
              <img src={book.thumbnail} alt={book.title} className="h-48 rounded-lg shadow-lg" />
            ) : (
              <div className="flex h-48 w-32 items-center justify-center rounded-lg bg-white/10">
                <Book className="size-12 text-text-secondary" />
              </div>
            )}
          </div>

          <h3 className="mb-2 text-center text-lg font-semibold">{book.title}</h3>
          {book.author && <p className="mb-4 text-center text-sm text-text-secondary">{book.author}</p>}

          <div className="space-y-2 text-sm">
            {book.publisher && (
              <div className="flex justify-between">
                <span className="text-text-secondary">출판사</span>
                <span>{book.publisher}</span>
              </div>
            )}
            {book.publishDate && (
              <div className="flex justify-between">
                <span className="text-text-secondary">출판일</span>
                <span>{book.publishDate}</span>
              </div>
            )}
          </div>

          {book.description && (
            <div className="mt-4">
              <p className="mb-1 text-xs font-medium text-text-secondary">설명</p>
              <p className="text-sm leading-relaxed text-text-primary">{book.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* 리사이즈 핸들 (최대화 상태가 아닐 때만) */}
      {!isMaximized && (
        <>
          {/* 모서리 */}
          <div onMouseDown={(e) => handleResizeStart(e, "nw")} className={`${resizeHandleClass} -start-1 -top-1 size-3 cursor-nw-resize`} />
          <div onMouseDown={(e) => handleResizeStart(e, "ne")} className={`${resizeHandleClass} -end-1 -top-1 size-3 cursor-ne-resize`} />
          <div onMouseDown={(e) => handleResizeStart(e, "sw")} className={`${resizeHandleClass} -bottom-1 -start-1 size-3 cursor-sw-resize`} />
          <div onMouseDown={(e) => handleResizeStart(e, "se")} className={`${resizeHandleClass} -bottom-1 -end-1 size-3 cursor-se-resize`} />
          {/* 변 */}
          <div onMouseDown={(e) => handleResizeStart(e, "n")} className={`${resizeHandleClass} -top-1 start-2 end-2 h-2 cursor-n-resize`} />
          <div onMouseDown={(e) => handleResizeStart(e, "s")} className={`${resizeHandleClass} -bottom-1 start-2 end-2 h-2 cursor-s-resize`} />
          <div onMouseDown={(e) => handleResizeStart(e, "w")} className={`${resizeHandleClass} -start-1 top-2 bottom-2 w-2 cursor-w-resize`} />
          <div onMouseDown={(e) => handleResizeStart(e, "e")} className={`${resizeHandleClass} -end-1 top-2 bottom-2 w-2 cursor-e-resize`} />
        </>
      )}
    </div>
  );
}
