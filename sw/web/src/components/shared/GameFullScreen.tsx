/*
  파일명: components/shared/GameFullScreen.tsx
  기능: 게임 전체화면 래퍼
  책임: 전체화면 진입/해제, ESC 키 처리, 페이드인 전환. Portal로 body에 렌더링.
*/
"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Minimize2, Home, ChevronRight } from "lucide-react";
import { Z_INDEX } from "@/constants/zIndex";

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface GameFullScreenProps {
  children: React.ReactNode | ((opts: { enterFullScreen: () => void; isFullScreen: boolean }) => React.ReactNode);
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  footerExtra?: React.ReactNode;
  onExitFullScreen?: () => void;
  onHome?: () => void;
}

export default function GameFullScreen({ children, title, breadcrumbs, footerExtra, onExitFullScreen, onHome }: GameFullScreenProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [visible, setVisible] = useState(false);

  const enterFullScreen = useCallback(() => setIsFullScreen(true), []);
  const exitFullScreen = useCallback(() => {
    setVisible(false);
    onExitFullScreen?.();
    // 페이드아웃 후 언마운트
    setTimeout(() => setIsFullScreen(false), 300);
  }, [onExitFullScreen]);

  // 마운트 후 페이드인
  useEffect(() => {
    if (!isFullScreen) return;
    requestAnimationFrame(() => setVisible(true));
  }, [isFullScreen]);

  useEffect(() => {
    if (!isFullScreen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitFullScreen();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [isFullScreen, exitFullScreen]);

  const rendered = typeof children === "function"
    ? children({ enterFullScreen, isFullScreen })
    : children;

  if (!isFullScreen) {
    return <div className="relative">{rendered}</div>;
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-bg-main flex flex-col transition-opacity duration-500 ease-out"
      style={{ zIndex: Z_INDEX.top, opacity: visible ? 1 : 0 }}
    >
      {/* 헤더 — breadcrumb */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-black/80 backdrop-blur-sm border-b border-white/10">
        <nav className="flex items-center gap-1.5 min-w-0">
          {/* 홈 pill: 아이콘 + 첫 breadcrumb을 하나의 버튼으로 */}
          {onHome && breadcrumbs && breadcrumbs.length > 0 ? (
            <>
              <button
                onClick={breadcrumbs[0].onClick ?? onHome}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors shrink-0"
                title="메인화면"
              >
                <Home size={13} />
                <span className="text-xs font-serif font-bold">{breadcrumbs[0].label}</span>
              </button>
              {breadcrumbs.slice(1).map((item, i) => {
                const isLast = i === breadcrumbs.length - 2;
                return (
                  <span key={i} className="flex items-center gap-1 min-w-0">
                    <ChevronRight size={12} className="text-white/15 shrink-0" />
                    {isLast ? (
                      <span className="text-xs font-serif text-accent/80 truncate">{item.label}</span>
                    ) : (
                      <button
                        onClick={item.onClick}
                        className="text-xs font-serif text-white/40 hover:text-white/70 truncate transition-colors"
                      >
                        {item.label}
                      </button>
                    )}
                  </span>
                );
              })}
            </>
          ) : onHome ? (
            <button
              onClick={onHome}
              className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors shrink-0"
              title="메인화면"
            >
              <Home size={14} />
            </button>
          ) : title ? (
            <span className="text-xs font-serif text-accent/80 truncate">{title}</span>
          ) : null}
        </nav>
        <button
          onClick={exitFullScreen}
          className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors shrink-0"
          title="전체화면 해제 (ESC)"
        >
          <Minimize2 size={16} />
        </button>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8 flex flex-col justify-center">
        {rendered}
      </div>

      {/* 푸터 */}
      {footerExtra && (
        <div className="shrink-0 flex items-center justify-center px-4 py-2 bg-black/80 backdrop-blur-sm border-t border-white/10">
          {footerExtra}
        </div>
      )}
    </div>,
    document.body
  );
}
