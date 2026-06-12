/*
  파일명: /app/reading/components/ReadingWorkspace/useSidebarResize.ts
  기능: 사이드바 리사이즈 & 토글 훅
  책임: 좌우 사이드바 너비 조절·저장과 열림 상태를 관리한다.
*/ // ------------------------------

"use client";

import { useState, useEffect, useRef } from "react";

const SIDEBAR_STORAGE_KEY = "reading_sidebar_widths";
const DEFAULT_LEFT_WIDTH = 224; // w-56 = 14rem = 224px
const DEFAULT_RIGHT_WIDTH = 320; // w-80 = 20rem = 320px
const MIN_SIDEBAR_WIDTH = 180;
const MAX_SIDEBAR_WIDTH = 400;

export function useSidebarResize() {
  const [leftWidth, setLeftWidth] = useState(DEFAULT_LEFT_WIDTH);
  const [rightWidth, setRightWidth] = useState(DEFAULT_RIGHT_WIDTH);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  const resizeStartRef = useRef({ x: 0, width: 0 });

  // 사이드바 너비 로드
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved) {
      try {
        const { left, right } = JSON.parse(saved);
        if (left) setLeftWidth(left);
        if (right) setRightWidth(right);
      } catch { /* ignore */ }
    }
  }, []);

  // 사이드바 너비 저장
  useEffect(() => {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, JSON.stringify({ left: leftWidth, right: rightWidth }));
  }, [leftWidth, rightWidth]);

  // 좌측 리사이즈 핸들러
  useEffect(() => {
    if (!isResizingLeft) return;
    const handleMove = (e: MouseEvent) => {
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, resizeStartRef.current.width + (e.clientX - resizeStartRef.current.x)));
      setLeftWidth(newWidth);
    };
    const handleUp = () => setIsResizingLeft(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isResizingLeft]);

  // 우측 리사이즈 핸들러
  useEffect(() => {
    if (!isResizingRight) return;
    const handleMove = (e: MouseEvent) => {
      const newWidth = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, resizeStartRef.current.width - (e.clientX - resizeStartRef.current.x)));
      setRightWidth(newWidth);
    };
    const handleUp = () => setIsResizingRight(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isResizingRight]);

  const handleLeftResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartRef.current = { x: e.clientX, width: leftWidth };
    setIsResizingLeft(true);
  };

  const handleRightResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartRef.current = { x: e.clientX, width: rightWidth };
    setIsResizingRight(true);
  };

  return {
    leftWidth,
    rightWidth,
    isLeftSidebarOpen,
    setIsLeftSidebarOpen,
    isRightSidebarOpen,
    setIsRightSidebarOpen,
    handleLeftResizeStart,
    handleRightResizeStart,
  };
}
