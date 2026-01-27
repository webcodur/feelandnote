'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface CollapsibleSectionProps {
  title: string
  icon?: React.ReactNode
  count?: number
  children: React.ReactNode
  rightElement?: React.ReactNode
  defaultOpen?: boolean
}

export default function CollapsibleSection({
  title,
  icon,
  count,
  children,
  rightElement,
  defaultOpen = true,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1" /> {/* Spacer for centering */}
        <h2
          className="text-xl font-bold text-text-primary flex items-center justify-center gap-2 cursor-pointer py-2 hover:bg-bg-secondary/50 rounded-lg transition-colors select-none px-4"
          onClick={() => setIsOpen(!isOpen)}
        >
          {icon && <span className="text-accent">{icon}</span>}
          {title}
          {count !== undefined && (
            <span className="text-text-secondary text-lg font-normal">({count})</span>
          )}
          {isOpen ? (
            <ChevronDown className="w-5 h-5 text-text-tertiary" />
          ) : (
            <ChevronUp className="w-5 h-5 text-text-tertiary" />
          )}
        </h2>
        <div className="flex-1 flex justify-end">
          {rightElement}
        </div>
      </div>

      {isOpen && children}
    </div>
  )
}
