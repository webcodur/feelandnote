'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface FilterOption {
  value: string
  label: string
  count?: number
  icon?: LucideIcon
}

interface FilterChipsProps {
  options: FilterOption[]
  value?: string
  onChange?: (value: string) => void
  href?: (value: string) => string
  className?: string
}

export default function FilterChips({
  options,
  value,
  onChange,
  href,
  className = '',
}: FilterChipsProps) {
  const renderChip = (option: FilterOption) => {
    const isActive = value === option.value
    const Icon = option.icon
    const content = (
      <>
        {Icon && <Icon className="w-3.5 h-3.5" />}
        {option.label}
        {option.count !== undefined && (
          <span className={isActive ? 'text-white/70' : 'text-text-secondary'}>
            ({option.count})
          </span>
        )}
      </>
    )

    const baseStyles = `inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors`
    const activeStyles = isActive
      ? 'bg-accent text-white'
      : 'bg-bg-card text-text-secondary hover:text-text-primary hover:bg-white/5'

    if (href) {
      return (
        <Link
          key={option.value}
          href={href(option.value)}
          className={`${baseStyles} ${activeStyles}`}
        >
          {content}
        </Link>
      )
    }

    return (
      <button
        key={option.value}
        type="button"
        onClick={() => onChange?.(option.value)}
        className={`${baseStyles} ${activeStyles}`}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={`flex gap-2 flex-wrap ${className}`}>
      {options.map(renderChip)}
    </div>
  )
}
