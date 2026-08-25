import type { ReactNode } from 'react'

type Props = {
  id: string
  numberLabel: string
  title: string
  meta?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  expanded?: boolean
  dimmed?: boolean
  contentClassName?: string
}

/** 모든 장면이 공유하는 중립 편집 타임라인 카드 골격. */
export function FactionSequenceCard({
  id,
  numberLabel,
  title,
  meta,
  actions,
  children,
  expanded = true,
  dimmed = false,
  contentClassName = 'p-3',
}: Props) {
  return (
    <article
      id={id}
      data-faction-sequence-card
      data-sequence-number={numberLabel}
      className={`relative scroll-mt-24 rounded-lg border border-border bg-bg-card shadow-sm ${dimmed ? 'opacity-45 saturate-50' : ''}`}
    >
      <header className={`grid min-h-14 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-border bg-bg-main/95 px-3 py-2.5 shadow-[0_1px_0_rgba(255,255,255,0.025)] ${expanded ? 'sticky top-0 z-20 rounded-t-lg border-b backdrop-blur-md md:-top-5' : 'rounded-lg'}`}>
        <span className={sequenceNumberClass}>
          {numberLabel}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-black leading-tight tracking-[-0.01em] text-text-primary" title={title}>{title}</div>
          {meta ? <div className="mt-1 truncate text-[11px] font-semibold text-text-tertiary">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 border-l border-border/70 pl-3">{actions}</div> : null}
      </header>
      {expanded ? <div className={contentClassName}>{children}</div> : null}
    </article>
  )
}

export const sequenceNumberClass = 'flex h-9 min-w-12 shrink-0 items-center justify-center rounded-md border border-border bg-bg-secondary px-2.5 font-mono text-xs font-black tabular-nums text-text-primary shadow-sm'
export const sequenceCardIconButtonClass = 'flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-secondary hover:border-text-tertiary hover:bg-bg-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
