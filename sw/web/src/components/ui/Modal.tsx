/*
  파일명: /components/ui/Modal.tsx
  기능: 모달 컴포넌트
  책임: Portal을 사용한 오버레이 모달 UI를 제공한다.
*/ // ------------------------------

"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, type LucideIcon } from "lucide-react";
import AnimatedHeight from "./AnimatedHeight";
import { Z_INDEX } from "@/constants/zIndex";

import ClassicalBox from "@/components/ui/ClassicalBox";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  icon?: LucideIcon;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  /** 커스텀 z-index (게임 전체화면 등 상위 모달 위에 표시할 때) */
  zIndex?: number;
}

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-4xl",
};

export default function Modal({
  isOpen,
  onClose,
  children,
  title,
  icon: Icon,
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = true,
  zIndex,
}: ModalProps) {
  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOverlayClick = () => {
    if (closeOnOverlayClick) onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center px-4 py-8 bg-black/60 backdrop-blur-md animate-modal-overlay"
      style={{ zIndex: zIndex ?? Z_INDEX.modal }}
      onClick={handleOverlayClick}
    >
      <ClassicalBox
        hover={false}
        className={`w-full ${SIZE_CLASSES[size]} max-h-[calc(100dvh-4rem)] rounded-lg animate-modal-content`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* 우상단 플로팅 닫기 버튼 — 스크롤 영역 밖 */}
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-2 top-2 z-[70] w-8 h-8 rounded-full flex items-center justify-center hover:text-text-primary hover:bg-white/10 bg-bg-card/50 backdrop-blur-sm sm:right-4 sm:top-4"
          >
            <X size={20} />
          </button>
        )}

        {/* 스크롤 영역 */}
        <div className="overflow-y-auto max-h-[inherit] rounded-lg">
          {/* 헤더 - title이 있을 때만 렌더링 */}
          {title && (
            <div className="relative flex items-center justify-center px-3 py-3 border-b border-border">
              <div className="flex items-center gap-1.5">
                {Icon && <Icon size={16} className="text-accent" />}
                <h2 className="text-base sm:text-lg text-text-primary">{title}</h2>
              </div>
            </div>
          )}

          {/* 본문 */}
          <AnimatedHeight>{children}</AnimatedHeight>
        </div>
      </ClassicalBox>
    </div>
  );

  // Portal로 body에 렌더링
  if (typeof window === "undefined") return null;
  return createPortal(modalContent, document.body);
}

// 모달 내부 섹션 컴포넌트
export function ModalBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`p-3 ${className}`}>{children}</div>;
}

export function ModalFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex gap-3 p-3 border-t border-border ${className}`}>
      {children}
    </div>
  );
}
