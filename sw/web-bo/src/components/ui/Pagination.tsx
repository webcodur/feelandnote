'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

interface PaginationProps {
  page: number
  totalPages: number
  href?: (page: number) => string
  onChange?: (page: number) => void
  className?: string
}

export default function Pagination({
  page,
  totalPages,
  href,
  onChange,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null

  const renderButton = (
    targetPage: number,
    children: React.ReactNode,
    disabled: boolean
  ) => {
    const baseStyles =
      'flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-lg text-sm'
    const enabledStyles = 'bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:border-accent/50'
    const disabledStyles = 'bg-bg-secondary text-text-secondary/50 cursor-not-allowed'

    if (disabled) {
      return (
        <span className={`${baseStyles} ${disabledStyles}`}>{children}</span>
      )
    }

    if (href) {
      return (
        <Link href={href(targetPage)} className={`${baseStyles} ${enabledStyles}`}>
          {children}
        </Link>
      )
    }

    return (
      <button
        type="button"
        onClick={() => onChange?.(targetPage)}
        className={`${baseStyles} ${enabledStyles}`}
      >
        {children}
      </button>
    )
  }

  // 페이지 번호 범위 계산
  const getPageNumbers = () => {
    const delta = 2
    const range: number[] = []
    const rangeWithDots: (number | 'dots')[] = []

    for (
      let i = Math.max(2, page - delta);
      i <= Math.min(totalPages - 1, page + delta);
      i++
    ) {
      range.push(i)
    }

    if (page - delta > 2) {
      rangeWithDots.push(1, 'dots')
    } else {
      for (let i = 1; i < Math.max(2, page - delta); i++) {
        rangeWithDots.push(i)
      }
    }

    rangeWithDots.push(...range)

    if (page + delta < totalPages - 1) {
      rangeWithDots.push('dots', totalPages)
    } else {
      for (let i = Math.min(totalPages - 1, page + delta) + 1; i <= totalPages; i++) {
        rangeWithDots.push(i)
      }
    }

    return rangeWithDots
  }

  const renderPageNumber = (item: number | 'dots', index: number) => {
    if (item === 'dots') {
      return (
        <span
          key={`dots-${index}`}
          className="flex items-center justify-center w-8 h-8 md:w-9 md:h-9 text-text-secondary text-sm"
        >
          ...
        </span>
      )
    }

    const isActive = item === page
    const baseStyles =
      'flex items-center justify-center w-8 h-8 md:w-9 md:h-9 rounded-lg text-xs md:text-sm font-medium'
    const activeStyles = isActive
      ? 'bg-accent text-white'
      : 'bg-bg-card border border-border text-text-secondary hover:text-text-primary hover:border-accent/50'

    if (isActive) {
      return (
        <span key={item} className={`${baseStyles} ${activeStyles}`}>
          {item}
        </span>
      )
    }

    if (href) {
      return (
        <Link key={item} href={href(item)} className={`${baseStyles} ${activeStyles}`}>
          {item}
        </Link>
      )
    }

    return (
      <button
        key={item}
        type="button"
        onClick={() => onChange?.(item)}
        className={`${baseStyles} ${activeStyles}`}
      >
        {item}
      </button>
    )
  }

  return (
    <div className={`flex items-center justify-center gap-0.5 md:gap-1 flex-wrap ${className}`}>
      {renderButton(1, <ChevronsLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />, page === 1)}
      {renderButton(page - 1, <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />, page === 1)}

      <div className="flex items-center gap-0.5 md:gap-1 mx-1 md:mx-2">
        {getPageNumbers().map(renderPageNumber)}
      </div>

      {renderButton(
        page + 1,
        <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />,
        page === totalPages
      )}
      {renderButton(
        totalPages,
        <ChevronsRight className="w-3.5 h-3.5 md:w-4 md:h-4" />,
        page === totalPages
      )}
    </div>
  )
}
