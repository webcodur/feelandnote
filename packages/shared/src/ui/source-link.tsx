'use client'

import React, { useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { parseSourceUrls } from '../lib/source-links'

export interface SourceListProps {
  sources: string[]
  layer: number
  onClose: () => void
}

export interface SourceLinkProps {
  sourceUrl: string | null | undefined
  children: ReactNode
  className?: string
  style?: CSSProperties
  title?: string
  'aria-label'?: string
}

export default function SourceLink({ sourceUrl, children, className = '', style, title, 'aria-label': ariaLabel, renderSources, baseLayer }: SourceLinkProps & {
  renderSources: (props: SourceListProps) => ReactNode
  baseLayer: number
}) {
  const sources = parseSourceUrls(sourceUrl)
  const [open, setOpen] = useState(false)
  const [layer, setLayer] = useState(baseLayer + 1)
  const controlClass = `cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${className}`
  if (!sources.length) return null

  function openSources(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    let parent: HTMLElement | null = event.currentTarget
    let topLayer = baseLayer
    while (parent) {
      topLayer = Math.max(topLayer, Number.parseInt(getComputedStyle(parent).zIndex, 10) || 0)
      parent = parent.parentElement
    }
    setLayer(topLayer + 1)
    setOpen(true)
  }

  return <>
    {sources.length === 1 && <a href={sources[0]} target="_blank" rel="noopener noreferrer nofollow"
      onClick={event => event.stopPropagation()} className={controlClass} style={style} title={title} aria-label={ariaLabel}>
      {children}
    </a>}
    {sources.length > 1 && <button type="button" aria-haspopup="dialog" aria-expanded={open}
      onClick={openSources} className={controlClass} style={style} title={title} aria-label={ariaLabel}>
      {children}
    </button>}
    {open && renderSources({ sources, layer, onClose: () => setOpen(false) })}
  </>
}

export function SourceList({ sources }: Pick<SourceListProps, 'sources'>) {
  return <ol className="space-y-2">
    {sources.map(url => <li key={url}>
      <a href={url} target="_blank" rel="noopener noreferrer nofollow"
        className="flex min-h-11 items-start gap-3 rounded-lg border border-white/10 p-3 text-sm text-text-secondary hover:border-accent/50 hover:bg-accent/5 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{new URL(url).hostname}</span>
          <span className="mt-1 block break-all text-xs text-text-tertiary">{url}</span>
        </span>
        <span className="shrink-0" aria-hidden>↗</span>
      </a>
    </li>)}
  </ol>
}
