/*
  파일명: /components/ui/Modal.tsx
  기능: 모달 컴포넌트
  책임: Portal을 사용한 오버레이 모달 UI를 제공한다.
*/ // ------------------------------

"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, type LucideIcon } from "lucide-react";
import Button from "./Button";
import AnimatedHeight from "./AnimatedHeight";
import { Z_INDEX } from "@/constants/zIndex";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  icon?: LucideIcon;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
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
  closeOnOverlayClick = false,
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
      className="fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-modal-overlay"
      style={{ zIndex: Z_INDEX.modal }}
      onClick={handleOverlayClick}
    >
      <div
        className={`w-full ${SIZE_CLASSES[size]} bg-bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-modal-content`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        {(title || showCloseButton) && (
          <div className="relative flex items-center justify-center px-6 py-5 border-b border-border">
            {/* 타이틀 (중앙) */}
            {title && (
              <div className="flex items-center gap-2">
                {Icon && <Icon size={18} className="text-accent" />}
                <h2 className="text-lg font-bold text-text-primary">{title}</h2>
              </div>
            )}
            {/* 닫기 버튼 (우측 고정) */}
            {showCloseButton && (
              <Button
                unstyled
                onClick={onClose}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-white/5"
              >
                <X size={18} />
              </Button>
            )}
          </div>
        )}
        {/* 본문 */}
        <AnimatedHeight>{children}</AnimatedHeight>
      </div>
    </div>
  );

  // Portal로 body에 렌더링
  if (typeof window === "undefined") return null;
  return createPortal(modalContent, document.body);
}

// 모달 내부 섹션 컴포넌트
export function ModalBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

export function ModalFooter({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex gap-3 p-6 border-t border-border ${className}`}>
      {children}
    </div>
  );
}
