/*
  파일명: /components/shared/content/AddContentPopover.tsx
  기능: 콘텐츠 추가 시 상태 선택 팝오버
  책임: Plus 버튼 클릭 시 "관심 등록"/"감상 등록" 선택 UI 제공
*/ // ------------------------------
"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Bookmark, Check, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";
import type { ContentStatus } from "@/types/database";

interface AddContentPopoverProps {
  onAdd: (status: ContentStatus) => void;
  isAdding?: boolean;
  isAdded?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export default function AddContentPopover({
  onAdd,
  isAdding = false,
  isAdded = false,
  size = "sm",
  className = "",
}: AddContentPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (status: ContentStatus) => {
    setIsOpen(false);
    onAdd(status);
  };

  const iconSize = size === "sm" ? 12 : 14;
  const buttonPadding = size === "sm" ? "p-1" : "p-1.5";

  // 추가 완료 상태
  if (isAdded) {
    return (
      <div className={`${buttonPadding} rounded-md bg-green-500/80 text-white ${className}`}>
        <Check size={iconSize} />
      </div>
    );
  }

  return (
    <div ref={popoverRef} className={`relative ${className}`}>
      <Button
        unstyled
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        disabled={isAdding}
        className={`${buttonPadding} rounded-md bg-accent/80 text-white hover:bg-accent`}
        title="기록관에 추가"
      >
        {isAdding ? <Loader2 size={iconSize} className="animate-spin" /> : <Plus size={iconSize} />}
      </Button>

      {isOpen && (
        <div
          className="absolute top-full right-0 mt-1 bg-bg-card border border-border rounded-lg shadow-xl overflow-hidden z-50 min-w-[120px]"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            unstyled
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSelect("WANT");
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-white/5"
          >
            <Bookmark size={14} className="text-yellow-500" />
            관심 등록
          </Button>
          <Button
            unstyled
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSelect("FINISHED");
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-white/5"
          >
            <Check size={14} className="text-green-500" />
            감상 등록
          </Button>
        </div>
      )}
    </div>
  );
}
