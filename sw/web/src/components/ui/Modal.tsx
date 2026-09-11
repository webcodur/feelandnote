/*
  파일명: /components/ui/Modal.tsx
  기능: 모달 컴포넌트
  책임: Portal을 사용한 오버레이 모달 UI를 제공한다.
*/ // ------------------------------

"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import AnimatedHeight from "./AnimatedHeight";
import { Z_INDEX } from "@/constants/zIndex";
import { useClippedText } from "@/hooks/useClippedText";

import ClassicalBox from "@/components/ui/ClassicalBox";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  titleClassName?: string;
  titleStyle?: CSSProperties;
  stickyHeader?: boolean;
  icon?: LucideIcon;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  animateHeight?: boolean;
  /** 세로 상한. 기본은 화면을 거의 채운다. 읽기용 모달처럼 바깥 여백을 남겨 오버레이 클릭으로 닫기 쉽게 하려면 낮춘다 */
  maxHeightClassName?: string;
  /** 스크롤 영역 아래에 글이 더 남았을 때 끝을 흐린다. 읽기용 모달에서 켠다 */
  fadeClippedEnd?: boolean;
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
  titleClassName,
  titleStyle,
  stickyHeader = false,
  icon: Icon,
  size = "md",
  showCloseButton = true,
  closeOnOverlayClick = true,
  animateHeight = true,
  maxHeightClassName = "max-h-[calc(100dvh-4rem)]",
  fadeClippedEnd = false,
  zIndex,
}: ModalProps) {
  const t = useTranslations("shared.accessibility");
  const { ref: scrollRef, isClipped } = useClippedText<HTMLDivElement>(undefined, isOpen && fadeClippedEnd);

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
        className={`w-full ${SIZE_CLASSES[size]} ${maxHeightClassName} rounded-lg animate-modal-content`}
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
            aria-label={t("close")}
            className="absolute right-2 top-2 z-[70] flex h-8 w-8 items-center justify-center rounded-full border border-accent-dim/40 bg-bg-card/70 text-accent backdrop-blur-sm hover:bg-accent/10 hover:text-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 sm:right-4 sm:top-4"
          >
            <X size={20} />
          </button>
        )}

        {/* 스크롤 영역 */}
        <div
          ref={scrollRef}
          className={`overflow-y-auto max-h-[inherit] rounded-lg ${fadeClippedEnd && isClipped ? "clip-fade-end" : ""}`}
        >
          {/* 헤더 - title이 있을 때만 렌더링 */}
          {title && (
            <div className={`relative flex items-center justify-center border-b border-border px-3 py-3 ${stickyHeader ? "sticky top-0 z-30 bg-bg-card/95 backdrop-blur-sm" : ""}`}>
              <div className="flex items-center gap-1.5">
                {Icon && <Icon size={16} className="text-accent" />}
                <h2 className={`text-base sm:text-lg ${titleClassName ?? "text-text-primary"}`} style={titleStyle}>{title}</h2>
              </div>
            </div>
          )}

          {/* 본문 */}
          {animateHeight ? <AnimatedHeight independent>{children}</AnimatedHeight> : children}
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
