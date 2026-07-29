'use client'

import { useEffect, useId, useRef } from 'react'
import { Search, X } from 'lucide-react'

export default function FactionSearchField({
  value,
  onChange,
  label,
  placeholder,
  resultText,
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder: string
  resultText: string
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return

      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return

      event.preventDefault()
      inputRef.current?.focus()
    }

    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  const clear = () => {
    onChange('')
    inputRef.current?.focus()
  }

  return (
    <search className={`block min-w-0 ${className}`}>
      <label htmlFor={inputId} className="sr-only">{label}</label>
      <div className="flex h-10 min-w-0 items-center rounded-lg border border-border bg-bg-card focus-within:border-accent focus-within:ring-1 focus-within:ring-accent/30">
        <Search className="ml-3 h-4 w-4 shrink-0 text-text-secondary" aria-hidden="true" />
        <input
          id={inputId}
          ref={inputRef}
          type="text"
          role="searchbox"
          aria-label={label}
          aria-keyshortcuts="/"
          value={value}
          onChange={event => onChange(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Escape' && value) {
              event.preventDefault()
              clear()
            }
          }}
          placeholder={placeholder}
          className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm text-text-primary outline-none placeholder:text-text-secondary"
        />
        <span
          aria-live="polite"
          className="shrink-0 border-l border-border px-2.5 text-xs tabular-nums text-text-secondary"
        >
          {resultText}
        </span>
        {value && (
          <button
            type="button"
            onClick={clear}
            aria-label="검색어 지우기"
            title="검색어 지우기 (Esc)"
            className="mr-1.5 rounded-md p-1.5 text-text-secondary hover:bg-white/5 hover:text-text-primary"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
        {!value && (
          <kbd className="mr-2 hidden rounded border border-border bg-bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-text-secondary sm:inline">
            /
          </kbd>
        )}
      </div>
    </search>
  )
}
