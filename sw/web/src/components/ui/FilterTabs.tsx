"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import Button from "./Button";
import BottomSheet from "./BottomSheet";
import {
  FILTER_BUTTON_STYLES,
  FILTER_CHIP_STYLES,
  FILTER_BOTTOMSHEET_STYLES,
} from "@/constants/filterStyles";

export interface FilterTabItem<T extends string = string> {
  value: T;
  label: string;
}

interface FilterTabsProps<T extends string> {
  items: FilterTabItem<T>[];
  activeValue: T;
  counts?: Partial<Record<T, number>>;
  onSelect: (value: T) => void;
  isLoading?: boolean;
  hideZeroCounts?: boolean;
  title?: string;
}

export default function FilterTabs<T extends string>({
  items,
  activeValue,
  counts,
  onSelect,
  isLoading,
  hideZeroCounts = false,
  title,
}: FilterTabsProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredValue, setHoveredValue] = useState<T | null>(null);
  const tabRefs = useRef<Map<T, HTMLButtonElement>>(new Map());
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0 });
  const activeItem = items.find((item) => item.value === activeValue);

  // 밑줄 위치 계산
  useEffect(() => {
    const targetValue = hoveredValue ?? activeValue;
    const el = tabRefs.current.get(targetValue);
    if (el) {
      setUnderlineStyle({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    }
  }, [activeValue, hoveredValue]);

  const handleSelect = (value: T) => {
    onSelect(value);
    setIsOpen(false);
  };

  return (
    <>
      {/* PC: 전체 필터 표시 */}
      <div className="hidden md:flex items-center gap-4 overflow-x-auto scrollbar-hide">
        {title && <span className={FILTER_BUTTON_STYLES.label}>{title}</span>}
        <div
          className={FILTER_BUTTON_STYLES.container}
          onMouseLeave={() => setHoveredValue(null)}
        >
          {items.map(({ value, label }) => {
            const isActive = activeValue === value;
            const isHovered = hoveredValue === value;
            const count = counts?.[value];
            const isDisabled = isLoading || (hideZeroCounts && count === 0);

            return (
              <button
                key={value}
                ref={(el) => { if (el) tabRefs.current.set(value, el); }}
                onClick={() => !isDisabled && onSelect(value)}
                onMouseEnter={() => !isDisabled && setHoveredValue(value)}
                disabled={isDisabled}
                className={`${FILTER_BUTTON_STYLES.base} transition-all duration-200 ${
                  isActive
                    ? FILTER_BUTTON_STYLES.active
                    : isHovered
                    ? "text-text-primary"
                    : FILTER_BUTTON_STYLES.inactive
                } ${FILTER_BUTTON_STYLES.disabled}`}
              >
                {label}
                {count !== undefined && (
                  <span className={isActive ? FILTER_BUTTON_STYLES.countActive : FILTER_BUTTON_STYLES.countInactive}>
                    {typeof count === "number" ? count.toLocaleString() : count}
                  </span>
                )}
              </button>
            );
          })}
          {/* 공유 밑줄 */}
          <div
            className={FILTER_BUTTON_STYLES.underline}
            style={{ left: underlineStyle.left, width: underlineStyle.width }}
          />
        </div>
      </div>

      {/* 모바일: 선택된 항목만 표시 + 클릭 시 모달 */}
      <div className="md:hidden flex items-center gap-2">
        {title && <span className={FILTER_BUTTON_STYLES.label}>{title}</span>}
        <Button
          unstyled
          onClick={() => setIsOpen(true)}
          disabled={isLoading}
          className={`${FILTER_CHIP_STYLES.base} ${FILTER_CHIP_STYLES.active}`}
        >
          {activeItem?.label}
          <ChevronDown size={14} />
        </Button>
      </div>

      {/* 모바일: 필터 선택 바텀시트 */}
      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title="필터 선택">
        <div className="p-4 space-y-2">
          {items.map(({ value, label }) => {
            const isActive = activeValue === value;
            const count = counts?.[value];
            const isDisabled = hideZeroCounts && count === 0;

            return (
              <Button
                unstyled
                key={value}
                onClick={() => !isDisabled && handleSelect(value)}
                disabled={isDisabled}
                className={`${FILTER_BOTTOMSHEET_STYLES.base} ${
                  isActive ? FILTER_BOTTOMSHEET_STYLES.active : FILTER_BOTTOMSHEET_STYLES.inactive
                } ${FILTER_BOTTOMSHEET_STYLES.disabled}`}
              >
                <span className="flex-1 text-left text-sm font-medium">{label}</span>
                {count !== undefined && (
                  <span className="text-xs text-text-tertiary">
                    {typeof count === "number" ? count.toLocaleString() : count}
                  </span>
                )}
                {isActive && <Check size={18} className="text-accent" />}
              </Button>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
