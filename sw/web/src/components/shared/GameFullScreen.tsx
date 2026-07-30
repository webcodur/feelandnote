/*
  파일명: components/shared/GameFullScreen.tsx
  기능: 게임 전체화면 래퍼
  책임: 전체화면 진입/해제, ESC 키 처리, 페이드인 전환. Portal로 body에 렌더링.

  레이아웃 구조 (portal 내부):
    fixed 컨테이너
      ├─ [Layer 0] 배경 — absolute inset-0, pointer-events-none
      └─ [Layer 1] UI — absolute inset-0, flex-col (header / content / footer)
    DOM 순서로 UI가 배경 위에 렌더링됨. z-index 불필요.
*/
"use client";

import { useState, useCallback, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ChevronRight } from "lucide-react";
import { Z_INDEX } from "@/constants/zIndex";

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface GameFullScreenProps {
  children: React.ReactNode | ((opts: { enterFullScreen: () => void; exitFullScreen: () => void; isFullScreen: boolean }) => React.ReactNode);
  title?: string;
  breadcrumbs?: BreadcrumbItem[];
  footerExtra?: React.ReactNode;
  onExitFullScreen?: () => void;
  onHome?: () => void;
  /** 전체화면 뒷배경 (콘텐츠 뒤에 렌더링) */
  background?: React.ReactNode;
  /** 페이지 진입 시 바로 전체화면 */
  initialFullScreen?: boolean;
  /** 대사 자막 영역을 위해 콘텐츠 아래 여백을 확보할지 여부 */
  reserveSubtitleSpace?: boolean;
  /** i18n: "나가기" */
  exitLabel?: string;
  /** i18n: "나가기 (ESC)" */
  exitEscLabel?: string;
}

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function GameFullScreen({ children, title, breadcrumbs, footerExtra, onExitFullScreen, onHome, background, initialFullScreen, reserveSubtitleSpace = true, exitLabel = "나가기", exitEscLabel = "나가기 (ESC)" }: GameFullScreenProps) {
  const isMounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [isFullScreen, setIsFullScreen] = useState(initialFullScreen ?? false);
  const [visible, setVisible] = useState(false);

  const enterFullScreen = useCallback(() => setIsFullScreen(true), []);
  const exitFullScreen = useCallback(() => {
    setVisible(false);
    onExitFullScreen?.();
    setTimeout(() => {
      setIsFullScreen(false);
      // 탈출 후 탭 위치로 스크롤
      requestAnimationFrame(() => {
        document.getElementById("arena-tabs")?.scrollIntoView({ block: "start" });
      });
    }, 300);
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
    ? children({ enterFullScreen, exitFullScreen, isFullScreen })
    : children;

  if (!isFullScreen || !isMounted) {
    return <div className="relative">{rendered}</div>;
  }

  return createPortal(
    <div
      className="fixed inset-0 bg-bg-main transition-opacity duration-200 ease-out"
      style={{ zIndex: Z_INDEX.top, opacity: visible ? 1 : 0, isolation: "isolate" }}
    >
      {/* ── Layer 0: 배경 ── */}
      {background && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
          {background}
        </div>
      )}

      {/* ── Layer 1: UI ── */}
      <div className="absolute inset-0 flex flex-col" style={{ zIndex: 1 }}>
        {/* 헤더 */}
        <div className="shrink-0 flex items-center px-4 py-2 bg-bg-main border-b border-white/10">
          <nav className="flex items-center gap-1.5 min-w-0">
            <button
              onClick={() => {
                exitFullScreen();
                if (initialFullScreen && onHome) onHome();
              }}
              className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-text-secondary hover:text-text-primary text-xs font-serif transition-colors shrink-0"
              title={exitEscLabel}
            >
              {exitLabel}
            </button>
            {onHome && breadcrumbs && breadcrumbs.length > 0 ? (
              breadcrumbs.map((item, i) => {
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <span key={i} className="flex items-center gap-1.5 min-w-0">
                    <ChevronRight size={12} className="text-white/15 shrink-0" />
                    {isLast ? (
                      <span className="text-xs font-serif text-accent/80 truncate">{item.label}</span>
                    ) : (
                      <button
                        onClick={item.onClick ?? onHome}
                        className="text-xs font-serif font-bold text-text-secondary hover:text-text-primary transition-colors truncate"
                      >
                        {item.label}
                      </button>
                    )}
                  </span>
                );
              })
            ) : title ? (
              <>
                <ChevronRight size={12} className="text-white/15 shrink-0" />
                <span className="text-xs font-serif text-accent/80 truncate">{title}</span>
              </>
            ) : null}
          </nav>
        </div>

        {/* 콘텐츠 — 기본은 대사 자막 영역을 확보하며, 자막이 없는 게임은 여백을 해제할 수 있다 */}
        <div className={`flex-1 overflow-y-auto px-3 py-2 sm:px-4 md:px-6 lg:px-8 flex flex-col min-h-0 ${reserveSubtitleSpace ? "pb-28" : "pb-3 sm:pb-4"}`}>
          {rendered}
        </div>

        {/* 푸터 */}
        {footerExtra && (
          <div className="shrink-0 flex items-center justify-center px-4 py-2 bg-bg-main border-t border-white/10">
            {footerExtra}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
