/*
  파일명: /components/shared/filters/FilterModal.tsx
  기능: 모바일용 필터 선택 모달
  책임: 필터 옵션을 모달 형태로 제공
*/
"use client";

import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { NeoCheckIcon } from "@/components/ui/icons/neo-pantheon";
import { FILTER_BOTTOMSHEET_STYLES } from "@/constants/filterStyles";
import type { FilterOption } from "./FilterChipDropdown";

interface FilterModalProps {
  title: string;
  isOpen: boolean;
  current: string;
  options: FilterOption[];
  onClose: () => void;
  onChange: (value: string) => void;
}

export default function FilterModal({
  title,
  isOpen,
  current,
  options,
  onClose,
  onChange,
}: FilterModalProps) {
  const handleSelect = (value: string) => {
    onChange(value);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm" closeOnOverlayClick>
      <div className="p-4 space-y-2">
        {options.map(({ value, label, count }) => {
          const isActive = current === value;
          const isDisabled = count !== undefined && count === 0;
          return (
            <Button
              key={value}
              type="button"
              unstyled
              onClick={() => !isDisabled && handleSelect(value)}
              disabled={isDisabled}
              className={`${FILTER_BOTTOMSHEET_STYLES.base} ${isActive ? FILTER_BOTTOMSHEET_STYLES.active : FILTER_BOTTOMSHEET_STYLES.inactive} ${FILTER_BOTTOMSHEET_STYLES.disabled}`}
            >
              <span className="flex-1 text-left text-sm font-medium">{label}</span>
              {count !== undefined && <span className="text-xs text-text-tertiary">{count}</span>}
              {isActive && <NeoCheckIcon size={18} />}
            </Button>
          );
        })}
      </div>
    </Modal>
  );
}
