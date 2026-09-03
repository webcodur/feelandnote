/*
  파일명: /components/shared/filters/FilterChipDropdown.tsx
  기능: 데스크톱용 드롭다운 필터 칩 컴포넌트
  책임: 필터 선택 UI 제공 (드롭다운 방식)
*/
"use client";

import { useState, useRef, useEffect, useLayoutEffect, useCallback, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";
import { FILTER_DROPDOWN_STYLES } from "@/constants/filterStyles";

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
  icon?: ReactNode;
}

interface FilterChipDropdownProps {
  label: string;
  value: string;
  isActive: boolean;
  isLoading?: boolean;
  options: FilterOption[];
  currentValue: string;
  onSelect: (value: string) => void;
  icon?: ReactNode;
}

export default function FilterChipDropdown({
  label,
  value,
  isActive,
  isLoading = false,
  options,
  currentValue,
  onSelect,
  icon,
}: FilterChipDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  // body 포털에 실어 보낼 월드 테마 변수(accent 계열). 스코프 밖 전역은 금색이다.
  const [themeVars, setThemeVars] = useState<CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 드롭다운 위치 계산 (fixed 포지션이므로 뷰포트 기준)
  const updateDropdownPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
    });
  }, []);

  // 외부 클릭 시 닫기
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // 열릴 때 위치 업데이트 + 스크롤/리사이즈 대응
  useEffect(() => {
    if (!isOpen) return;
    updateDropdownPosition();
    window.addEventListener("scroll", updateDropdownPosition, true);
    window.addEventListener("resize", updateDropdownPosition);
    return () => {
      window.removeEventListener("scroll", updateDropdownPosition, true);
      window.removeEventListener("resize", updateDropdownPosition);
    };
  }, [isOpen, updateDropdownPosition]);

  // 패널 폭을 가장 긴 행에 맞춰 고정한다. w-max만으로는 w-full 행이
  // 늘어나지 않고 각자 내용폭만 차지해 행마다 줄이 어긋난다.
  // 페인트 전 고정해 폭이 뛰는 깜빡임을 막는다.
  useLayoutEffect(() => {
    if (!isOpen || !dropdownRef.current) return;
    const panel = dropdownRef.current;
    panel.style.width = "";
    const rows = Array.from(
      panel.querySelectorAll<HTMLElement>("[data-dropdown-option]"),
    );
    const widest = rows.reduce((max, row) => Math.max(max, row.scrollWidth), 0);
    if (widest > 0) {
      panel.style.width = `${Math.min(widest, window.innerWidth - 32)}px`;
    }
  }, [isOpen, options]);

  const handleSelect = (optValue: string) => {
    onSelect(optValue);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      updateDropdownPosition();
      // 스코프 안에 포털하면 isolation 쌓임 맥락에 갇혀 스티키 헤더 뒤에 깔린다.
      // body 포털을 유지하고 accent 변수만 복사해 패널에 직접 실는다.
      const scope = containerRef.current.closest("[data-world-material]");
      if (scope) {
        const computed = getComputedStyle(scope);
        const accent = computed.getPropertyValue("--color-accent").trim();
        const accentRgb = computed.getPropertyValue("--color-accent-rgb").trim();
        setThemeVars({
          ...(accent ? { "--color-accent": accent } : {}),
          ...(accentRgb ? { "--color-accent-rgb": accentRgb } : {}),
        } as CSSProperties);
      } else {
        setThemeVars({});
      }
    }
    setIsOpen(!isOpen);
  };

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        unstyled
        onClick={handleToggle}
        disabled={isLoading}
        aria-label={`${label}: ${value}`}
        aria-expanded={isOpen}
        title={`${label}: ${value}`}
        className={`
          flex items-center justify-center rounded-md border transition-none
          bg-white/5 whitespace-nowrap overflow-hidden
          ${isActive ? 'border-accent shadow-[0_0_10px_rgba(var(--color-accent-rgb,_212,_175,_55),0.2)]' : 'border-accent/20 hover:border-accent/40'}
        `}
      >
        <div className="flex items-stretch justify-center w-full min-h-[2.5rem]">
          {/* 타이틀 섹션 */}
          <div className={`flex items-center justify-center border-r border-accent/10 bg-black/40 ${icon ? 'px-2.5' : 'flex-[0.35] px-3'}`}>
            {icon ? (
              <span className={isActive ? 'text-accent' : ' opacity-70'}>{icon}</span>
            ) : (
              <span className={`text-[10px] uppercase font-sans font-bold tracking-wider leading-none text-center ${isActive ? 'text-accent opacity-100' : ' opacity-70'}`}>
                {label}
              </span>
            )}
          </div>

          {/* 값 섹션 */}
          <div className={`${icon ? 'flex-1' : 'flex-[0.65]'} flex items-center justify-center px-3 ${isOpen ? 'bg-accent/10' : 'bg-white/[0.02]'}`}>
            <span className={`text-sm font-sans font-bold truncate ${isActive ? 'text-accent' : 'text-text-primary'} ${isOpen ? 'underline underline-offset-2 decoration-accent/50' : ''}`}>
              {value}
            </span>
          </div>
        </div>
      </Button>

      {isOpen && typeof document !== "undefined" && createPortal(
        <div
          ref={dropdownRef}
          role="menu"
          aria-label={label}
          className="fixed w-max min-w-[160px] max-w-[calc(100vw-2rem)] max-h-[320px] overflow-y-auto bg-black/95 backdrop-blur-xl border border-accent/30 rounded-md shadow-2xl"
          style={{ top: dropdownPos.top, left: dropdownPos.left, zIndex: Z_INDEX.dropdown, ...themeVars }}
        >
          {/* 이 드롭다운이 무엇인지 최상단에서 밝힌다 */}
          <div aria-hidden className="border-b border-accent/10 bg-accent/10 px-4 py-2 text-center text-xs font-sans font-bold uppercase tracking-wider text-accent">
            {label}
          </div>
          {options.map(({ value: optValue, label: optLabel, count, icon: optIcon }) => {
            const isSelected = currentValue === optValue;
            const isDisabled = count !== undefined && count === 0;

            return (
              <button
                key={optValue}
                data-dropdown-option
                onClick={() => !isDisabled && handleSelect(optValue)}
                disabled={isDisabled}
                className={`${FILTER_DROPDOWN_STYLES.item.base} ${
                  isSelected ? "bg-accent/20 text-accent font-bold" : "text-text-secondary hover:bg-accent/5 hover:text-text-primary"
                } ${isDisabled ? FILTER_DROPDOWN_STYLES.item.disabled : ""}`}
              >
                <span className="font-sans flex items-center gap-2">
                  {optIcon && <span className="flex-shrink-0 w-4 text-center">{optIcon}</span>}
                  {optLabel}
                </span>
                {count !== undefined && <span className={`text-xs ${isSelected ? 'text-accent/70' : ''}`}>{count}</span>}
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
