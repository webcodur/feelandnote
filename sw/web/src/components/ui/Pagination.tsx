/*
  파일명: /components/ui/Pagination.tsx
  기능: 페이지네이션 컴포넌트
  책임: 페이지 번호와 이동 버튼을 표시한다.
*/ // ------------------------------

"use client";

import { useState } from "react";

// #region 상수
const PAGE_GROUP_SIZE = 5;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const STYLES = {
  navButton: "h-8 px-2 flex items-center justify-center rounded-md bg-white/5 text-text-secondary hover:text-text-primary hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-sm font-medium select-none",
  pageButton: "h-8 px-2 flex items-center justify-center rounded-md bg-white/5 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/10 select-none",
  pageButtonActive: "h-8 px-2 flex items-center justify-center rounded-md text-sm font-medium bg-white/15 text-text-primary select-none",
  input: "h-8 px-2 bg-bg-secondary border border-border rounded-md text-text-primary text-sm focus:border-white/30 focus:outline-none",
  goButton: "h-8 px-3 bg-white/10 text-text-primary rounded-md text-sm font-medium hover:bg-white/15 disabled:opacity-30 disabled:cursor-not-allowed",
} as const;
// #endregion

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  showPageSizeSelector?: boolean;
}

// 현재 페이지가 속한 그룹의 페이지 번호들 생성
function getPageGroup(currentPage: number, totalPages: number): number[] {
  const groupIndex = Math.floor((currentPage - 1) / PAGE_GROUP_SIZE);
  const startPage = groupIndex * PAGE_GROUP_SIZE + 1;
  const endPage = Math.min(startPage + PAGE_GROUP_SIZE - 1, totalPages);

  return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  showPageSizeSelector = false,
}: PaginationProps) {
  const [inputValue, setInputValue] = useState("");
  const showSelector = showPageSizeSelector && pageSize && onPageSizeChange;

  if (totalPages <= 1 && !showSelector) return null;

  const pages = getPageGroup(currentPage, totalPages);
  const currentGroupStart = pages[0];
  const currentGroupEnd = pages[pages.length - 1];

  // 이동 가능 여부
  const canGoFirst = currentPage > 1;
  const canGoPrevGroup = currentGroupStart > 1;
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const canGoNextGroup = currentGroupEnd < totalPages;
  const canGoLast = currentPage < totalPages;

  // 이동 핸들러
  const goFirst = () => onPageChange(1);
  const goPrevGroup = () => onPageChange(Math.max(1, currentGroupStart - PAGE_GROUP_SIZE));
  const goPrev = () => onPageChange(currentPage - 1);
  const goNext = () => onPageChange(currentPage + 1);
  const goNextGroup = () => onPageChange(Math.min(totalPages, currentGroupEnd + 1));
  const goLast = () => onPageChange(totalPages);

  const handleGoToPage = () => {
    const page = parseInt(inputValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      onPageChange(page);
      setInputValue("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleGoToPage();
  };

  return (
    <nav className="flex items-center justify-center gap-4 flex-wrap" aria-label="페이지네이션">
      {/* 페이지 사이즈 선택 */}
      {showSelector && (
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className={`${STYLES.input} w-20 cursor-pointer`}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>{size}개</option>
          ))}
        </select>
      )}

      {/* 페이지 네비게이션 */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* 첫 페이지 */}
          <button
            onClick={goFirst}
            disabled={!canGoFirst}
            className={STYLES.navButton}
            aria-label="첫 페이지"
            title="첫 페이지"
          >
            «
          </button>

          {/* 이전 그룹 (5페이지) */}
          <button
            onClick={goPrevGroup}
            disabled={!canGoPrevGroup}
            className={STYLES.navButton}
            aria-label="이전 5페이지"
            title="이전 5페이지"
          >
            ‹‹
          </button>

          {/* 이전 페이지 */}
          <button
            onClick={goPrev}
            disabled={!canGoPrev}
            className={STYLES.navButton}
            aria-label="이전 페이지"
            title="이전 페이지"
          >
            ‹
          </button>

          {/* 페이지 번호들 */}
          <div className="flex items-center gap-0.5 mx-1">
            {pages.map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={page === currentPage ? STYLES.pageButtonActive : STYLES.pageButton}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            ))}
          </div>

          {/* 다음 페이지 */}
          <button
            onClick={goNext}
            disabled={!canGoNext}
            className={STYLES.navButton}
            aria-label="다음 페이지"
            title="다음 페이지"
          >
            ›
          </button>

          {/* 다음 그룹 (5페이지) */}
          <button
            onClick={goNextGroup}
            disabled={!canGoNextGroup}
            className={STYLES.navButton}
            aria-label="다음 5페이지"
            title="다음 5페이지"
          >
            ››
          </button>

          {/* 마지막 페이지 */}
          <button
            onClick={goLast}
            disabled={!canGoLast}
            className={STYLES.navButton}
            aria-label="마지막 페이지"
            title="마지막 페이지"
          >
            »
          </button>
        </div>
      )}

      {/* 페이지 직접 이동 */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={totalPages}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`1-${totalPages}`}
            className={`${STYLES.input} w-16 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
          />
          <button
            onClick={handleGoToPage}
            disabled={!inputValue}
            className={STYLES.goButton}
          >
            이동
          </button>
        </div>
      )}
    </nav>
  );
}
