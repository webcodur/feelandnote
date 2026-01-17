'use client'

import { ReactNode, useState, useRef, useEffect } from 'react'
import { MoreHorizontal, LucideIcon } from 'lucide-react'
import { createPortal } from 'react-dom'

interface ActionItem {
  key: string
  label: string
  icon?: LucideIcon
  variant?: 'default' | 'danger'
  onClick: () => void
  disabled?: boolean
}

interface ActionDropdownProps {
  items: ActionItem[]
  trigger?: ReactNode
  align?: 'start' | 'end'
}

export default function ActionDropdown({
  items,
  trigger,
  align = 'end',
}: ActionDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    const handleScroll = () => {
      if (isOpen) setIsOpen(false)
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      window.addEventListener('scroll', handleScroll, true)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen])

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const dropdownWidth = 160

      setPosition({
        top: rect.bottom + 4,
        left:
          align === 'end'
            ? rect.right - dropdownWidth
            : rect.left,
      })
    }

    setIsOpen(!isOpen)
  }

  const handleItemClick = (item: ActionItem) => {
    if (item.disabled) return
    item.onClick()
    setIsOpen(false)
  }

  const dropdown = isOpen && (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
      }}
      className="w-40 bg-bg-card border border-border rounded-xl shadow-xl py-1 z-[700] animate-fade-in"
    >
      {items.map((item) => {
        const Icon = item.icon
        const isDanger = item.variant === 'danger'

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => handleItemClick(item)}
            disabled={item.disabled}
            className={`
              w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left
              ${isDanger ? 'text-red-400 hover:bg-red-500/10' : 'text-text-primary hover:bg-white/5'}
              ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            {Icon && <Icon className="w-4 h-4" />}
            {item.label}
          </button>
        )
      })}
    </div>
  )

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleToggle}
        className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5"
      >
        {trigger || <MoreHorizontal className="w-4 h-4" />}
      </button>
      {typeof window !== 'undefined' && createPortal(dropdown, document.body)}
    </>
  )
}
