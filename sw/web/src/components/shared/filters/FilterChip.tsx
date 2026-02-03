/*
  파일명: /components/shared/filters/FilterChip.tsx
  기능: 모바일용 필터 칩 버튼 컴포넌트
  책임: 필터 모달을 열기 위한 트리거 버튼
*/
"use client";

import type { ReactNode } from "react";
import Button from "@/components/ui/Button";
import { FILTER_CHIP_STYLES } from "@/constants/filterStyles";

interface FilterChipProps {
  label: string;
  value: string;
  isActive: boolean;
  isLoading?: boolean;
  onClick: () => void;
  className?: string;
  icon?: ReactNode;
}

export default function FilterChip({
  label,
  value,
  isActive,
  isLoading = false,
  onClick,
  className = "",
  icon,
}: FilterChipProps) {
  return (
    <Button
      type="button"
      unstyled
      onClick={onClick}
      disabled={isLoading}
      className={`
        flex items-center justify-center ${FILTER_CHIP_STYLES.base} 
        bg-white/5 whitespace-nowrap overflow-hidden !p-0
        ${isActive ? 'border-accent shadow-[0_0_10px_rgba(212,175,55,0.1)]' : 'border-accent/25'}
        ${className}
      `}
    >
      <div className="flex items-stretch justify-center w-full min-h-[2.1rem]">
        {/* 타이틀 섹션 */}
        <div className={`flex items-center justify-center border-r border-accent/10 bg-black/20 ${icon ? 'px-2' : 'flex-[0.35] px-1'}`}>
          {icon ? (
            <span className={isActive ? 'text-accent opacity-90' : 'text-text-tertiary opacity-60'}>{icon}</span>
          ) : (
            <span className={`text-[9px] uppercase font-sans font-bold tracking-wide leading-none text-center ${isActive ? 'text-accent opacity-90' : 'text-text-tertiary opacity-60'}`}>
              {label}
            </span>
          )}
        </div>

        {/* 값 섹션 */}
        <div className={`${icon ? 'flex-1' : 'flex-[0.65]'} flex items-center justify-center px-2.5 bg-white/[0.02]`}>
          <span className={`text-[11px] font-sans font-bold truncate ${isActive ? 'text-accent' : 'text-text-primary'}`}>
            {value}
          </span>
        </div>
      </div>
    </Button>
  );
}
