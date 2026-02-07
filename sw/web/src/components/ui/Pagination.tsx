/*
  파일명: /components/ui/Pagination.tsx
  기능: 페이지네이션 컴포넌트
  책임: 페이지 번호와 이동 버튼을 표시한다.
*/ // ------------------------------

"use client";

import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Send } from "lucide-react";

// #region 아이콘 컴포넌트
const TripleChevronLeft = ({ className, size = 16 }: { className?: string; size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m19 17-5-5 5-5" />
    <path d="m14 17-5-5 5-5" />
    <path d="m9 17-5-5 5-5" />
  </svg>
);

const TripleChevronRight = ({ className, size = 16 }: { className?: string; size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m5 17 5-5-5-5" />
    <path d="m10 17 5-5-5-5" />
    <path d="m15 17 5-5-5-5" />
  </svg>
);
// #endregion

// #region 상수
const PAGE_GROUP_SIZE = 5;

const STYLES = {
  // Container
  container: "flex flex-col gap-2 md:gap-3 p-2 md:p-3 rounded-2xl border border-white/10 bg-gradient-to-b from-black/80 to-black/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] w-fit mx-auto ring-1 ring-white/5",

  // Segmented Control Group
  group: "flex items-center bg-white/5 rounded-lg p-0.5 border border-white/5 shadow-inner",

  // Segmented Button
  segmentBtn: "h-7 w-7 md:h-8 md:w-8 flex items-center justify-center text-text-secondary/70 hover:text-accent hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed first:rounded-l-md last:rounded-r-md active:scale-90",
  divider: "w-px h-3 bg-white/10 shadow-[0.5px_0_0_rgba(255,255,255,0.05)]",

  // Page Numbers
  numContainer: "flex items-center justify-center gap-1 md:gap-1.5 px-1",
  numBtn: "h-7 min-w-[1.75rem] md:h-8 md:min-w-[2rem] px-1.5 md:px-2 flex items-center justify-center rounded-lg text-xs md:text-sm font-medium text-text-secondary bg-white/5 border border-white/5 hover:text-text-primary hover:bg-white/10 select-none disabled:text-text-secondary/20 disabled:cursor-not-allowed disabled:hover:bg-white/5",
  // Active Page: Golden Gradient
  numBtnActive: "h-7 min-w-[1.75rem] md:h-8 md:min-w-[2rem] px-1.5 md:px-2 flex items-center justify-center rounded-lg text-xs md:text-sm font-bold bg-gradient-to-br from-accent via-[#f59e0b] to-[#b45309] text-black shadow-[0_0_15px_rgba(212,175,55,0.3)] select-none scale-105 ring-1 ring-accent/50",

  // Center: Page Jump Input
  inputWrapper: "h-7 md:h-8 flex items-center bg-white/5 border border-white/5 focus-within:border-accent/40 rounded-lg overflow-hidden w-[60px] md:w-[72px]",
  input: "h-full w-full bg-transparent text-center text-xs md:text-sm font-bold text-accent focus:outline-none placeholder:text-text-secondary/30 px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
  submitBtn: "h-full w-7 md:w-8 flex items-center justify-center text-text-secondary/40 hover:text-accent shrink-0",
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

// 현재 페이지가 속한 그룹의 페이지 번호들 생성 (항상 5개)
function getPageGroup(currentPage: number): number[] {
  const groupIndex = Math.floor((currentPage - 1) / PAGE_GROUP_SIZE);
  const startPage = groupIndex * PAGE_GROUP_SIZE + 1;
  return Array.from({ length: PAGE_GROUP_SIZE }, (_, i) => startPage + i);
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  showPageSizeSelector = false, // Not used in compact mode
}: PaginationProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const pages = getPageGroup(currentPage);
  const currentGroupStart = pages[0];
  const currentGroupEnd = pages[pages.length - 1];

  // Navigation Logic
  const canGoFirst = currentPage > 1;
  const canGoPrevGroup = currentGroupStart > 1;
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const canGoNextGroup = currentGroupEnd < totalPages;
  const canGoLast = currentPage < totalPages;

  const navigate = (page: number) => onPageChange(page);

  const handleJump = () => {
    const page = parseInt(inputValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) navigate(page);
    setInputValue("");
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleJump();
    if (e.key === "Escape") { setInputValue(""); inputRef.current?.blur(); }
  };

  return (
    <nav className={STYLES.container} aria-label="페이지네이션">
      
      {/* Top Row: Controller Bar */}
      <div className="flex items-center justify-between w-full gap-2 md:gap-4">
        {/* Left Controls */}
        <div className={STYLES.group}>
          <button onClick={() => navigate(1)} disabled={!canGoFirst} className={`${STYLES.segmentBtn} hidden md:flex`} title="처음">
            <TripleChevronLeft size={16} />
          </button>
          <div className="hidden md:block">
            <div className={STYLES.divider} />
          </div>
          <button onClick={() => navigate(Math.max(1, currentGroupStart - PAGE_GROUP_SIZE))} disabled={!canGoPrevGroup} className={STYLES.segmentBtn} title="-5">
            <ChevronsLeft size={16} />
          </button>
          <div className={STYLES.divider} />
          <button onClick={() => navigate(currentPage - 1)} disabled={!canGoPrev} className={STYLES.segmentBtn} title="이전">
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* Center: Page Jump */}
        <div className={STYLES.inputWrapper}>
          <input
            ref={inputRef}
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            className={STYLES.input}
            placeholder="—"
          />
          <button onClick={handleJump} className={STYLES.submitBtn} title="이동">
            <Send size={11} />
          </button>
        </div>

        {/* Right Controls */}
        <div className={STYLES.group}>
          <button onClick={() => navigate(currentPage + 1)} disabled={!canGoNext} className={STYLES.segmentBtn} title="다음">
            <ChevronRight size={16} />
          </button>
          <div className={STYLES.divider} />
          <button onClick={() => navigate(Math.min(totalPages, currentGroupEnd + 1))} disabled={!canGoNextGroup} className={STYLES.segmentBtn} title="+5">
            <ChevronsRight size={16} />
          </button>
          <div className="hidden md:block">
            <div className={STYLES.divider} />
          </div>
          <button onClick={() => navigate(totalPages)} disabled={!canGoLast} className={`${STYLES.segmentBtn} hidden md:flex`} title="마지막">
            <TripleChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Bottom Row: Page Numbers + Total */}
      <div className="relative flex items-center justify-center w-full pe-10 md:pe-12">
        <div className={STYLES.numContainer}>
          {pages.map((page) => {
            const isDisabled = page > totalPages;
            return (
              <button
                key={page}
                onClick={() => navigate(page)}
                disabled={isDisabled}
                className={page === currentPage ? STYLES.numBtnActive : STYLES.numBtn}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </button>
            );
          })}
        </div>
        <span className="absolute right-1 text-text-secondary/70 text-[10px] md:text-xs font-medium tabular-nums">1 - {totalPages}</span>
      </div>

    </nav>
  );
}
