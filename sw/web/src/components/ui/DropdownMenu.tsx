/*
  파일명: /components/ui/DropdownMenu.tsx
  기능: 드롭다운 메뉴 컴포넌트
  책임: 더보기 버튼 클릭 시 액션 목록을 표시한다.
*/ // ------------------------------

"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical } from "lucide-react";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";

export interface DropdownMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "default" | "danger";
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  className?: string;
  buttonClassName?: string;
  iconSize?: number;
}

export default function DropdownMenu({
  items,
  className = "",
  buttonClassName = "",
  iconSize = 16,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <Button
        unstyled
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-white/10 ${buttonClassName}`}
      >
        <MoreVertical size={iconSize} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 min-w-[120px] py-1 bg-bg-card border border-border rounded-lg shadow-xl" style={{ zIndex: Z_INDEX.dropdown }}>
          {items.map((item, index) => (
            <Button
              unstyled
              key={index}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                item.onClick();
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${
                item.variant === "danger"
                  ? "text-red-400 hover:bg-red-400/10"
                  : "text-text-primary hover:bg-white/5"
              }`}
            >
              <span className={item.variant === "danger" ? "text-red-400" : "text-text-primary"}>
                {item.icon}
              </span>
              {item.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
