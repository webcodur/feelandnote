/*
  파일명: /components/ui/BottomSheet.tsx
  기능: 모바일 바텀 시트 컴포넌트
  책임: 화면 하단에서 슬라이드업되는 시트 UI를 제공한다.
*/ // ------------------------------

"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import Button from "./Button";
import { Z_INDEX } from "@/constants/zIndex";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
}

export default function BottomSheet({ isOpen, onClose, children, title }: BottomSheetProps) {
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

  const sheetContent = (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-bottomsheet-overlay"
      style={{ zIndex: Z_INDEX.modal }}
      onClick={onClose}
    >
      {/* 시트 컨테이너 */}
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[80vh] bg-bg-secondary border-t border-border rounded-t-2xl overflow-hidden animate-bottomsheet-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 드래그 핸들 */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-border rounded-full" />
        </div>

        {/* 헤더 */}
        {title && (
          <div className="relative flex items-center justify-center px-6 py-3 border-b border-border">
            <h2 className="text-base font-bold text-text-primary">{title}</h2>
            <Button
              unstyled
              onClick={onClose}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-white/5"
            >
              <X size={18} />
            </Button>
          </div>
        )}

        {/* 본문 */}
        <div className="overflow-y-auto scrollbar-thin" style={{ maxHeight: "calc(80vh - 80px)" }}>
          {children}
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") return null;
  return createPortal(sheetContent, document.body);
}
