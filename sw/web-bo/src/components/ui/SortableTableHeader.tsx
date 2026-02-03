'use client'

import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

interface SortableTableHeaderProps {
  column: string
  label: string
  className?: string
  align?: 'start' | 'center' | 'end'
}

export default function SortableTableHeader({ column, label, className = '', align = 'start' }: SortableTableHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const currentSort = searchParams.get('sort')
  const currentOrder = searchParams.get('sortOrder') || 'desc'
  const isActive = currentSort === column

  const handleClick = () => {
    const params = new URLSearchParams(searchParams.toString())

    // 같은 컬럼 클릭 시 정렬 방향 토글
    if (isActive) {
      params.set('sortOrder', currentOrder === 'asc' ? 'desc' : 'asc')
    } else {
      params.set('sort', column)
      params.set('sortOrder', 'desc')
    }

    // 정렬 변경 시 첫 페이지로
    params.set('page', '1')

    router.push(`${pathname}?${params.toString()}`)
  }

  const alignClass = {
    start: 'text-start',
    center: 'text-center',
    end: 'text-end',
  }[align]

  return (
    <th
      className={`px-3 md:px-4 py-3 text-xs md:text-sm font-medium text-text-secondary cursor-pointer hover:text-text-primary hover:bg-white/5 select-none ${alignClass} ${className}`}
      onClick={handleClick}
    >
      <span className="inline-flex items-center gap-1 whitespace-nowrap">
        {label}
        {isActive ? (
          currentOrder === 'asc' ? (
            <ChevronUp className="w-3.5 h-3.5 text-accent" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-accent" />
          )
        ) : (
          <ChevronsUpDown className="w-3.5 h-3.5 opacity-30" />
        )}
      </span>
    </th>
  )
}
