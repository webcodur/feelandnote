/*
  파일명: /components/features/archive/batchActions/BatchActionBar.tsx
  기능: 일괄 작업 액션 바
  책임: 선택된 콘텐츠에 대한 삭제, 카테고리 변경 등 일괄 작업을 제공한다.
*/ // ------------------------------
"use client";

import { useState, useRef, useEffect } from "react";
import { Trash2, CheckSquare, Square, X, FolderInput } from "lucide-react";
import Button from "@/components/ui/Button";
import { Z_INDEX } from "@/constants/zIndex";
import type { CategoryWithCount } from "@/types/database";

// #region 타입
interface BatchActionBarProps {
  selectedCount: number;
  totalCount: number;
  onDelete: () => void;
  onCategoryChange: (categoryId: string | null) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCancel: () => void;
  categories: CategoryWithCount[];
  isLoading?: boolean;
}
// #endregion

// #region 인라인 드롭다운 컴포넌트
function InlineDropdown({
  isOpen,
  onClose,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 min-w-[120px] bg-bg-card border border-border rounded-lg shadow-xl overflow-hidden"
      style={{ zIndex: Z_INDEX.dropdown }}
    >
      {children}
    </div>
  );
}

function DropdownItem({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      unstyled
      onClick={onClick}
      className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-white/5"
    >
      {children}
    </Button>
  );
}
// #endregion

export default function BatchActionBar({
  selectedCount,
  totalCount,
  onDelete,
  onCategoryChange,
  onSelectAll,
  onDeselectAll,
  onCancel,
  categories,
  isLoading = false,
}: BatchActionBarProps) {
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  const isAllSelected = selectedCount === totalCount && totalCount > 0;
  const hasSelection = selectedCount > 0;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-bg-card border-t border-border shadow-2xl"
      style={{ zIndex: Z_INDEX.modal - 1 }}
    >
      <div className="max-w-screen-xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          {/* 좌측: 선택 정보 & 전체 선택/해제 */}
          <div className="flex items-center gap-3">
            <Button
              onClick={isAllSelected ? onDeselectAll : onSelectAll}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm"
            >
              {isAllSelected ? <CheckSquare size={16} className="text-accent" /> : <Square size={16} />}
              <span>{isAllSelected ? "선택 해제" : "전체 선택"}</span>
            </Button>
            <div className="text-sm text-text-secondary">
              <span className="font-bold text-accent">{selectedCount}</span>
              <span className="text-text-tertiary">/{totalCount}</span>
              <span className="ml-1">선택됨</span>
            </div>
          </div>

          {/* 우측: 액션 버튼들 */}
          <div className="flex items-center gap-2">
            {/* 분류 이동 드롭다운 */}
            <div className="relative">
              <Button
                onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                disabled={!hasSelection || isLoading}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FolderInput size={16} />
                <span>분류 이동</span>
              </Button>
              <InlineDropdown isOpen={isCategoryOpen} onClose={() => setIsCategoryOpen(false)}>
                <div className="max-h-[200px] overflow-y-auto">
                  <DropdownItem
                    onClick={() => {
                      onCategoryChange(null);
                      setIsCategoryOpen(false);
                    }}
                  >
                    미분류
                  </DropdownItem>
                  {categories.map((cat) => (
                    <DropdownItem
                      key={cat.id}
                      onClick={() => {
                        onCategoryChange(cat.id);
                        setIsCategoryOpen(false);
                      }}
                    >
                      {cat.name}
                    </DropdownItem>
                  ))}
                </div>
              </InlineDropdown>
            </div>

            {/* 삭제 */}
            <Button
              onClick={onDelete}
              disabled={!hasSelection || isLoading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={16} />
              <span>삭제</span>
            </Button>

            {/* 취소 */}
            <Button
              onClick={onCancel}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary text-sm"
            >
              <X size={16} />
              <span>취소</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
