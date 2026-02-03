/*
  파일명: /components/ui/Pagination.tsx
  기능: 페이지네이션 컴포넌트
  책임: 페이지 번호와 이동 버튼을 표시한다.
*/ // ------------------------------

"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, CornerDownLeft, Edit2 } from "lucide-react";

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
  // Container: Glassmorphism with subtle gradient border effect
  container: "flex flex-col gap-3 p-3 rounded-2xl border border-white/10 bg-gradient-to-b from-black/80 to-black/60 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] w-fit mx-auto min-w-[280px] ring-1 ring-white/5",
  
  // Segmented Control Group
  group: "flex items-center bg-white/5 rounded-lg p-0.5 border border-white/5 shadow-inner",
  
  // Segmented Button
  segmentBtn: "h-8 w-8 flex items-center justify-center text-text-secondary hover:text-accent hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed first:rounded-l-md last:rounded-r-md active:scale-90",
  divider: "w-px h-3 bg-white/10 shadow-[0.5px_0_0_rgba(255,255,255,0.05)]",
  
  // Page Numbers
  numContainer: "flex items-center justify-center gap-1.5 px-1",
  numBtn: "h-8 min-w-[2rem] px-2 flex items-center justify-center rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-white/10 select-none",
  // Active Page: Golden Gradient
  numBtnActive: "h-8 min-w-[2rem] px-2 flex items-center justify-center rounded-lg text-sm font-bold bg-gradient-to-br from-accent via-[#f59e0b] to-[#b45309] text-black shadow-[0_0_15px_rgba(212,175,55,0.3)] select-none scale-105 ring-1 ring-accent/50",
  
  // Center Status / Input
  statusBtn: "group relative h-8 px-2 flex items-center justify-center gap-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-accent/30 min-w-[70px] cursor-pointer overflow-hidden",
  inputWrapper: "h-8 flex items-center bg-black/60 border border-accent/50 rounded-lg overflow-hidden w-[70px] shadow-[0_0_10px_rgba(212,175,55,0.1)]",
  input: "h-full w-full bg-transparent text-center text-sm font-bold text-accent focus:outline-none placeholder:text-accent/30 px-1",
  submitBtn: "h-full w-8 flex items-center justify-center bg-accent/20 text-accent hover:bg-accent/40 border-l border-accent/20",
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
  showPageSizeSelector = false, // Not used in compact mode
}: PaginationProps) {
  const [isInputMode, setIsInputMode] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const pages = getPageGroup(currentPage, totalPages);
  const currentGroupStart = pages[0];
  const currentGroupEnd = pages[pages.length - 1];

  // Auto-focus and select text when mode changes
  useEffect(() => {
    if (isInputMode && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select(); // Auto-select active text for quick replacement
      setInputValue("");
    }
  }, [isInputMode]);

  if (totalPages <= 1) return null;

  // Navigation Logic
  const canGoFirst = currentPage > 1;
  const canGoPrevGroup = currentGroupStart > 1;
  const canGoPrev = currentPage > 1;
  const canGoNext = currentPage < totalPages;
  const canGoNextGroup = currentGroupEnd < totalPages;
  const canGoLast = currentPage < totalPages;

  const navigate = (page: number) => {
    onPageChange(page);
    setIsInputMode(false);
  };

  const handleManualSubmit = () => {
    const page = parseInt(inputValue, 10);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      navigate(page);
    } else {
      setIsInputMode(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleManualSubmit();
    if (e.key === "Escape") setIsInputMode(false);
  };

  return (
    <nav className={STYLES.container} aria-label="페이지네이션">
      
      {/* Top Row: Controller Bar */}
      <div className="flex items-center justify-between w-full gap-4">
        {/* Left Controls */}
        <div className={STYLES.group}>
          <button onClick={() => navigate(1)} disabled={!canGoFirst} className={STYLES.segmentBtn} title="처음">
            <TripleChevronLeft size={14} />
          </button>
          <div className={STYLES.divider} />
          <button onClick={() => navigate(Math.max(1, currentGroupStart - PAGE_GROUP_SIZE))} disabled={!canGoPrevGroup} className={STYLES.segmentBtn} title="-5">
            <ChevronsLeft size={14} />
          </button>
          <div className={STYLES.divider} />
          <button onClick={() => navigate(currentPage - 1)} disabled={!canGoPrev} className={STYLES.segmentBtn} title="이전">
            <ChevronLeft size={14} />
          </button>
        </div>

        {/* Center: Status / Input */}
        <div className="flex-1 flex justify-center min-w-[70px]">
          {isInputMode ? (
            <div className={STYLES.inputWrapper}>
              <input
                ref={inputRef}
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => setIsInputMode(false), 200)} // Delay so button click registers
                className={STYLES.input}
                placeholder={`${currentPage}`}
              />
              <button 
                onClick={handleManualSubmit} 
                className={STYLES.submitBtn}
                onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
              >
                <CornerDownLeft size={12} />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsInputMode(true)}
              className={STYLES.statusBtn}
              title="페이지 직접 입력"
            >
              <span className="text-text-secondary font-cinzel text-xs">PAGE</span>
              <span className="text-accent font-bold text-sm tracking-wide">{currentPage}</span>
              <span className="text-white/20 text-xs">/</span>
              <span className="text-text-secondary text-xs">{totalPages}</span>
              
              {/* Hover Edit Icon hint - Instant appearance */}
              <Edit2 size={10} className="text-accent/50 opacity-0 group-hover:opacity-100 absolute right-1.5 top-1.5" />
            </button>
          )}
        </div>

        {/* Right Controls */}
        <div className={STYLES.group}>
          <button onClick={() => navigate(currentPage + 1)} disabled={!canGoNext} className={STYLES.segmentBtn} title="다음">
            <ChevronRight size={14} />
          </button>
          <div className={STYLES.divider} />
          <button onClick={() => navigate(Math.min(totalPages, currentGroupEnd + 1))} disabled={!canGoNextGroup} className={STYLES.segmentBtn} title="+5">
            <ChevronsRight size={14} />
          </button>
          <div className={STYLES.divider} />
          <button onClick={() => navigate(totalPages)} disabled={!canGoLast} className={STYLES.segmentBtn} title="마지막">
            <TripleChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Bottom Row: Page Numbers */}
      <div className={STYLES.numContainer}>
        {pages.map((page) => (
          <button
            key={page}
            onClick={() => navigate(page)}
            className={page === currentPage ? STYLES.numBtnActive : STYLES.numBtn}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {page}
          </button>
        ))}
      </div>

    </nav>
  );
}
