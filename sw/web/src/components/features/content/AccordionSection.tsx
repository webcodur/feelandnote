/*
  파일명: /components/features/content/AccordionSection.tsx
  기능: 아코디언 섹션 컴포넌트
  책임: 펼침/접힘 상태를 관리하고 부드러운 높이 애니메이션을 제공한다.
*/ // ------------------------------
"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import AnimatedHeight from "@/components/ui/AnimatedHeight";

interface AccordionSectionProps {
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  disabled?: boolean;
}

export default function AccordionSection({
  title,
  icon,
  badge,
  defaultOpen = true,
  children,
  className = "",
  headerClassName = "",
  disabled = false,
}: AccordionSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const handleToggle = () => {
    if (!disabled) setIsOpen((prev) => !prev);
  };

  return (
    <div className={`bg-bg-card border border-border rounded-xl overflow-hidden ${className}`}>
      {/* 헤더 */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full flex items-center justify-between p-4 text-start hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50 ${headerClassName}`}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-accent">{icon}</span>}
          <h3 className="font-semibold text-sm text-text-primary">{title}</h3>
          {badge}
        </div>
        <ChevronDown
          size={18}
          className={`text-text-secondary transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* 콘텐츠 */}
      <AnimatedHeight duration={200}>
        {isOpen && (
          <div className="px-4 pb-4 border-t border-border/50">
            {children}
          </div>
        )}
      </AnimatedHeight>
    </div>
  );
}
