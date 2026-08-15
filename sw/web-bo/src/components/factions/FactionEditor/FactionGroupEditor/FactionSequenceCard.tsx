import type { ReactNode } from 'react'

type Props = {
  id: string
  numberLabel: string
  type: 'cluster' | 'scene'
  title: string
  meta?: ReactNode
  actions?: ReactNode
  children?: ReactNode
  expanded?: boolean
  dimmed?: boolean
  contentClassName?: string
}

/** 그룹과 개별 장면이 공유하는 편집 타임라인 카드 골격. */
export function FactionSequenceCard({
  id,
  numberLabel,
  type,
  title,
  meta,
  actions,
  children,
  expanded = true,
  dimmed = false,
  contentClassName = 'p-3',
}: Props) {
  const typeClass = type === 'scene'
    ? 'border-cyan-200 bg-cyan-400 text-cyan-950 shadow-[0_0_0_1px_rgba(34,211,238,0.2)]'
    : 'border-amber-200 bg-amber-400 text-amber-950 shadow-[0_0_0_1px_rgba(251,191,36,0.2)]'

  return (
    <article
      id={id}
      data-faction-sequence-card={type}
      data-sequence-number={numberLabel}
      className={`scroll-mt-24 rounded-lg border border-border bg-bg-card shadow-sm ${dimmed ? 'opacity-45 saturate-50' : ''}`}
    >
      <header className={`flex min-h-12 items-center gap-2 border-border/70 bg-bg-main/55 px-3 py-2 ${expanded ? 'rounded-t-lg border-b' : 'rounded-lg'}`}>
        <span className={`shrink-0 rounded-md border px-2.5 py-1 font-mono text-xs font-black tabular-nums ${typeClass}`}>
          {numberLabel}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-text-primary" title={title}>{title}</div>
          {meta ? <div className="mt-0.5 truncate text-[10px] font-medium text-text-tertiary">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </header>
      {expanded ? <div className={contentClassName}>{children}</div> : null}
    </article>
  )
}

export const sequenceCardIconButtonClass = 'flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-secondary hover:border-text-tertiary hover:bg-bg-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
