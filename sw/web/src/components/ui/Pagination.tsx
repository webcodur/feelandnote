/*
  파일명: /components/ui/Pagination.tsx
  기능: 페이지네이션 컴포넌트
  책임: 페이지 번호와 이동 버튼을 표시한다.
*/ // ------------------------------

"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import Button from "@/components/ui/Button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

function generatePageNumbers(
  currentPage: number,
  totalPages: number,
  siblingCount: number
): (number | "ellipsis")[] {
  const totalNumbers = siblingCount * 2 + 3; // siblings + current + first + last
  const totalBlocks = totalNumbers + 2; // + 2 ellipsis

  if (totalPages <= totalBlocks) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

  const showLeftEllipsis = leftSiblingIndex > 2;
  const showRightEllipsis = rightSiblingIndex < totalPages - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    const leftItemCount = 3 + 2 * siblingCount;
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1);
    return [...leftRange, "ellipsis", totalPages];
  }

  if (showLeftEllipsis && !showRightEllipsis) {
    const rightItemCount = 3 + 2 * siblingCount;
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => totalPages - rightItemCount + i + 1
    );
    return [1, "ellipsis", ...rightRange];
  }

  const middleRange = Array.from(
    { length: rightSiblingIndex - leftSiblingIndex + 1 },
    (_, i) => leftSiblingIndex + i
  );
  return [1, "ellipsis", ...middleRange, "ellipsis", totalPages];
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = generatePageNumbers(currentPage, totalPages, siblingCount);

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="페이지네이션">
      {/* 이전 버튼 */}
      <Button
        unstyled
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
        aria-label="이전 페이지"
      >
        <ChevronLeft size={18} />
      </Button>

      {/* 페이지 번호 */}
      {pages.map((page, index) => {
        if (page === "ellipsis") {
          return (
            <span
              key={`ellipsis-${index}`}
              className="w-9 h-9 flex items-center justify-center text-text-secondary"
            >
              <MoreHorizontal size={16} />
            </span>
          );
        }

        const isActive = page === currentPage;
        return (
          <Button
            unstyled
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-9 h-9 rounded-lg text-sm font-medium ${
              isActive
                ? "bg-accent/20 text-accent"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            {page}
          </Button>
        );
      })}

      {/* 다음 버튼 */}
      <Button
        unstyled
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-secondary"
        aria-label="다음 페이지"
      >
        <ChevronRight size={18} />
      </Button>
    </nav>
  );
}
