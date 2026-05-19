'use client'

import React, { useState } from 'react'

interface EditorPanelProps {
  title?: string
  icon?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
  collapsible?: boolean
  defaultExpanded?: boolean
  summaryNode?: React.ReactNode
}

export function EditorPanel({
  title,
  icon,
  children,
  className = '',
  contentClassName = 'p-3',
  collapsible = false,
  defaultExpanded = true,
  summaryNode,
}: EditorPanelProps) {
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className={`relative rounded-md border border-white/10 bg-bg-card shadow-md max-w-4xl transition-all ${!expanded ? 'h-[26px] overflow-hidden !mb-1' : 'mb-2.5 overflow-visible'} ${className}`}>
      
      {/* 맨 좌측 (아코디언 토글 및 접힘 상태 타이틀) */}
      <div className="absolute top-1 left-1 z-10 flex items-center gap-1 h-5">
        {collapsible && (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-text-secondary hover:text-text-primary w-5 h-5 flex items-center justify-center rounded bg-bg-main/40 hover:bg-bg-main/80 backdrop-blur-sm transition-colors focus:outline-none"
          >
            <span className={`text-[10px] transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}>▶</span>
          </button>
        )}
        {!expanded && title && (
          <span className="text-[11px] font-bold text-text-secondary select-none px-1">
            {title}
          </span>
        )}
      </div>

      {/* 맨 우측 (아이콘, 써머리 등 기존 도구들) */}
      <div className="absolute top-1 right-1 z-10 flex items-center justify-end gap-1 h-5">
        {summaryNode && (
          <div className="text-[10px] text-accent/90 font-bold px-1.5 flex items-center">
            {summaryNode}
          </div>
        )}
        {title && (
          <div className="relative flex items-center h-full" onMouseLeave={() => setOpen(false)}>
            {open && (
              <div className="absolute right-6 top-0 whitespace-nowrap bg-bg-main/90 backdrop-blur border border-border/60 shadow-md rounded px-2 py-0.5 text-[10px] font-bold text-accent mr-1 z-20 pointer-events-none">
                {title}
              </div>
            )}
            <button 
              type="button" 
              onClick={() => { if (!collapsible) setOpen(!open) }}
              onMouseEnter={() => setOpen(true)}
              className="text-text-dim hover:text-text-primary p-1 bg-bg-main/40 hover:bg-bg-main/80 rounded backdrop-blur-sm transition-colors focus:outline-none flex items-center justify-center w-5 h-5"
              title={title}
            >
              {icon ? (
                <span className="flex items-center [&>svg]:w-3.5 [&>svg]:h-3.5">{icon}</span>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01"/></svg>
              )}
            </button>
          </div>
        )}
      </div>

      <div className={`${contentClassName} ${title || summaryNode ? 'pr-12' : ''} ${collapsible ? 'pl-8' : ''} ${!expanded ? 'hidden' : ''}`}>
        {children}
      </div>
    </div>
  )
}
