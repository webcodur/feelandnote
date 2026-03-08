/*
  파일명: /components/shared/HubNav.tsx
  기능: 허브 페이지 서브페이지 네비게이터
  책임: 드롭다운으로 서브페이지 목록을 보여주고 선택 시 이동한다.
*/ // ------------------------------

"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "@/i18n/navigation";
import { ChevronDown } from "lucide-react";

export interface HubNavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface HubNavProps {
  items: HubNavItem[];
  placeholder?: string;
}

export default function HubNav({ items, placeholder = "바로가기" }: HubNavProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-accent/20 bg-accent/5 text-sm font-medium text-accent hover:bg-accent/10 transition-colors"
      >
        {placeholder}
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 min-w-[200px] py-1 rounded-lg border border-accent/20 bg-bg-main shadow-lg z-50">
          {items.map((item) => (
            <button
              key={item.href}
              onClick={() => {
                router.push(item.href);
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:text-accent hover:bg-accent/5 transition-colors text-left"
            >
              {item.icon && (
                <span className="text-accent/60 shrink-0">{item.icon}</span>
              )}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
