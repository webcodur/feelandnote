'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CornerDownLeft,
} from 'lucide-react'

// #region 상수
const PAGE_GROUP_SIZE = 5

const STYLES = {
  container: 'flex items-center justify-center gap-2 py-4',
  group: 'flex items-center bg-bg-card border border-border rounded-lg',
  btn: 'h-8 w-8 flex items-center justify-center text-text-secondary hover:text-accent hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed first:rounded-l-lg last:rounded-r-lg',
  divider: 'w-px h-4 bg-border',
  numContainer: 'flex items-center gap-1',
  numBtn: 'h-8 min-w-[2rem] px-2 flex items-center justify-center rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-white/5',
  numBtnActive: 'h-8 min-w-[2rem] px-2 flex items-center justify-center rounded-lg text-sm font-bold bg-accent text-white',
  statusBtn: 'h-8 px-3 flex items-center gap-1.5 rounded-lg bg-bg-card border border-border hover:border-accent/50 text-sm cursor-pointer',
  inputWrapper: 'h-8 flex items-center bg-bg-card border border-accent/50 rounded-lg overflow-hidden',
  input: 'h-full w-12 bg-transparent text-center text-sm font-medium text-accent focus:outline-none placeholder:text-text-secondary px-1',
  submitBtn: 'h-full w-7 flex items-center justify-center bg-accent/20 text-accent hover:bg-accent/30',
} as const
// #endregion

interface PaginationProps {
  page: number
  totalPages: number
  /** 함수 형태 또는 baseHref + params 형태로 URL 생성 */
  href?: (page: number) => string
  /** baseHref와 params를 사용한 URL 생성 (서버 컴포넌트 호환) */
  baseHref?: string
  /** URL 쿼리 파라미터 (page 제외) */
  params?: Record<string, string | undefined>
  onChange?: (page: number) => void
  className?: string
}

// 현재 페이지가 속한 그룹의 페이지 번호들 생성
function getPageGroup(currentPage: number, totalPages: number): number[] {
  const groupIndex = Math.floor((currentPage - 1) / PAGE_GROUP_SIZE)
  const startPage = groupIndex * PAGE_GROUP_SIZE + 1
  const endPage = Math.min(startPage + PAGE_GROUP_SIZE - 1, totalPages)
  return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)
}

export default function Pagination({
  page,
  totalPages,
  href,
  baseHref,
  params,
  onChange,
  className = '',
}: PaginationProps) {
  const [isInputMode, setIsInputMode] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // baseHref와 params로 URL 생성하는 함수
  const getHref = (targetPage: number): string | undefined => {
    if (href) return href(targetPage)
    if (baseHref) {
      const sp = new URLSearchParams()
      if (targetPage > 1) sp.set('page', String(targetPage))
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          if (value) sp.set(key, value)
        })
      }
      const qs = sp.toString()
      return `${baseHref}${qs ? `?${qs}` : ''}`
    }
    return undefined
  }

  const pages = getPageGroup(page, totalPages)
  const currentGroupStart = pages[0]
  const currentGroupEnd = pages[pages.length - 1]

  useEffect(() => {
    if (isInputMode && inputRef.current) {
      inputRef.current.focus()
      setInputValue('')
    }
  }, [isInputMode])

  if (totalPages <= 1) return null

  const canGoPrevGroup = currentGroupStart > 1
  const canGoPrev = page > 1
  const canGoNext = page < totalPages
  const canGoNextGroup = currentGroupEnd < totalPages

  const navigate = (targetPage: number) => {
    onChange?.(targetPage)
    setIsInputMode(false)
  }

  const handleManualSubmit = () => {
    const targetPage = parseInt(inputValue, 10)
    if (!isNaN(targetPage) && targetPage >= 1 && targetPage <= totalPages) {
      navigate(targetPage)
    }
    setIsInputMode(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleManualSubmit()
    if (e.key === 'Escape') setIsInputMode(false)
  }

  // 버튼 렌더링 헬퍼
  const NavButton = ({
    targetPage,
    disabled,
    children,
    title,
    isFirst,
    isLast,
  }: {
    targetPage: number
    disabled: boolean
    children: React.ReactNode
    title: string
    isFirst?: boolean
    isLast?: boolean
  }) => {
    const className = `${STYLES.btn} ${isFirst ? 'rounded-l-lg' : ''} ${isLast ? 'rounded-r-lg' : ''}`
    const linkHref = getHref(targetPage)

    if (disabled) {
      return <span className={className}>{children}</span>
    }

    if (linkHref) {
      return (
        <Link href={linkHref} className={className} title={title}>
          {children}
        </Link>
      )
    }

    return (
      <button onClick={() => navigate(targetPage)} className={className} title={title}>
        {children}
      </button>
    )
  }

  // 페이지 번호 버튼 렌더링
  const PageButton = ({ pageNum }: { pageNum: number }) => {
    const isActive = pageNum === page
    const className = isActive ? STYLES.numBtnActive : STYLES.numBtn
    const linkHref = getHref(pageNum)

    if (isActive) {
      return <span className={className}>{pageNum}</span>
    }

    if (linkHref) {
      return (
        <Link href={linkHref} className={className}>
          {pageNum}
        </Link>
      )
    }

    return (
      <button onClick={() => navigate(pageNum)} className={className}>
        {pageNum}
      </button>
    )
  }

  return (
    <nav className={`${STYLES.container} ${className}`} aria-label="페이지네이션">
      {/* Left Controls */}
      <div className={STYLES.group}>
        <NavButton
          targetPage={Math.max(1, currentGroupStart - PAGE_GROUP_SIZE)}
          disabled={!canGoPrevGroup}
          title="이전 5페이지"
          isFirst
        >
          <ChevronsLeft size={14} />
        </NavButton>
        <div className={STYLES.divider} />
        <NavButton targetPage={page - 1} disabled={!canGoPrev} title="이전" isLast>
          <ChevronLeft size={14} />
        </NavButton>
      </div>

      {/* Page Numbers */}
      <div className={STYLES.numContainer}>
        {pages.map((p) => (
          <PageButton key={p} pageNum={p} />
        ))}
      </div>

      {/* Center: Status / Input (링크 모드가 아닐 때만 직접 입력 지원) */}
      {!href && !baseHref && (
        <div className="mx-2">
          {isInputMode ? (
            <div className={STYLES.inputWrapper}>
              <input
                ref={inputRef}
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => setTimeout(() => setIsInputMode(false), 150)}
                className={STYLES.input}
                placeholder={`${page}`}
              />
              <button
                onClick={handleManualSubmit}
                className={STYLES.submitBtn}
                onMouseDown={(e) => e.preventDefault()}
              >
                <CornerDownLeft size={12} />
              </button>
            </div>
          ) : (
            <button onClick={() => setIsInputMode(true)} className={STYLES.statusBtn}>
              <span className="text-text-secondary">{page}</span>
              <span className="text-text-secondary/50">/</span>
              <span className="text-text-secondary/70">{totalPages}</span>
            </button>
          )}
        </div>
      )}

      {/* Right Controls */}
      <div className={STYLES.group}>
        <NavButton targetPage={page + 1} disabled={!canGoNext} title="다음" isFirst>
          <ChevronRight size={14} />
        </NavButton>
        <div className={STYLES.divider} />
        <NavButton
          targetPage={Math.min(totalPages, currentGroupEnd + 1)}
          disabled={!canGoNextGroup}
          title="다음 5페이지"
          isLast
        >
          <ChevronsRight size={14} />
        </NavButton>
      </div>
    </nav>
  )
}
