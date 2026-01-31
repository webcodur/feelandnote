/*
  파일명: /components/ui/Popover.tsx
  기능: 범용 팝오버 컴포넌트
  책임: 클릭 시 팝오버 UI를 표시하고 외부 클릭 시 닫는다.
*/ // ------------------------------
"use client";

import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { Z_INDEX } from "@/constants/zIndex";

type PopoverPosition = "top" | "bottom" | "left" | "right";

interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  position?: PopoverPosition;
  align?: "start" | "center" | "end";
  className?: string;
  contentClassName?: string;
  onOpenChange?: (isOpen: boolean) => void;
}

const positionStyles: Record<PopoverPosition, string> = {
  top: "bottom-full mb-2",
  bottom: "top-full mt-2",
  left: "right-full mr-2",
  right: "left-full ml-2",
};

const alignStyles: Record<PopoverPosition, Record<"start" | "center" | "end", string>> = {
  top: { start: "left-0", center: "left-1/2 -translate-x-1/2", end: "right-0" },
  bottom: { start: "left-0", center: "left-1/2 -translate-x-1/2", end: "right-0" },
  left: { start: "top-0", center: "top-1/2 -translate-y-1/2", end: "bottom-0" },
  right: { start: "top-0", center: "top-1/2 -translate-y-1/2", end: "bottom-0" },
};

export default function Popover({
  trigger,
  children,
  position = "bottom",
  align = "start",
  className = "",
  contentClassName = "",
  onOpenChange,
}: PopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const handleOpenChange = useCallback((open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  }, [onOpenChange]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        handleOpenChange(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, handleOpenChange]);

  return (
    <div ref={popoverRef} className={`relative ${className}`}>
      <div
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleOpenChange(!isOpen);
        }}
        className="cursor-pointer"
      >
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`absolute ${positionStyles[position]} ${alignStyles[position][align]} min-w-[200px] bg-bg-card border border-border rounded-xl shadow-xl ${contentClassName}`}
          style={{ zIndex: Z_INDEX.popover }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
