'use client'

import { ReactNode, useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface AccordionProps {
  title: string | ReactNode
  children: ReactNode
  defaultOpen?: boolean
  className?: string
}

export default function Accordion({ title, children, defaultOpen = false, className = '' }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={`bg-bg-card border border-border rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 cursor-pointer hover:bg-white/5"
      >
        <div className="flex items-center">
          {typeof title === 'string' ? (
            <h2 className="flex-1 text-base font-semibold text-text-primary">{title}</h2>
          ) : (
            <div className="flex-1">{title}</div>
          )}
          <ChevronDown
            className={`flex-shrink-0 w-4 h-4 text-text-secondary transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="px-4 pb-4 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}
