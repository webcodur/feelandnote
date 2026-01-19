/*
  파일명: /components/shared/filters/FilterChip.tsx
  기능: 모바일용 필터 칩 버튼 컴포넌트
  책임: 필터 모달을 열기 위한 트리거 버튼
*/
"use client";

import Button from "@/components/ui/Button";
import { GreekChevronIcon } from "@/components/ui/icons/neo-pantheon";
import { FILTER_CHIP_STYLES } from "@/constants/filterStyles";

interface FilterChipProps {
  label: string;
  value: string;
  isActive: boolean;
  isLoading?: boolean;
  onClick: () => void;
}

export default function FilterChip({
  label,
  value,
  isActive,
  isLoading = false,
  onClick,
}: FilterChipProps) {
  return (
    <Button
      type="button"
      unstyled
      onClick={onClick}
      disabled={isLoading}
      className={`flex items-center gap-2 ${FILTER_CHIP_STYLES.base} ${isActive ? FILTER_CHIP_STYLES.active : FILTER_CHIP_STYLES.inactive} whitespace-nowrap`}
    >
      <span className="text-xs opacity-80 uppercase font-cinzel tracking-wider">{label}</span>
      <span className="text-sm font-bold">{value}</span>
      <GreekChevronIcon size={14} className={isActive ? "opacity-80" : "opacity-60"} />
    </Button>
  );
}
