'use client'

import type { CSSProperties, KeyboardEvent } from 'react'
import { useTranslations } from 'next-intl'
import { BookOpen, Globe2, PenLine, UserRound, type LucideIcon } from 'lucide-react'
import HomeMediaSymbol from './HomeMediaSymbol'
import type { ContentType } from '@/types/database'
import type { HomeGraphBranch, HomeGraphBranchKey, HomeGraphMode } from './types'
import styles from './HomeMediaTabs.module.css'

const RELATION_ICONS: Partial<Record<HomeGraphBranchKey, LucideIcon>> = {
  read: BookOpen, appearance: UserRound, authored: PenLine, affiliation: Globe2,
}
const MEDIA_TYPES: Partial<Record<HomeGraphBranchKey, ContentType>> = {
  BOOK: 'BOOK', MUSIC: 'MUSIC', VIDEO: 'VIDEO', GAME: 'GAME',
}

export default function HomeMediaTabs({ branches, value, panelId, onChange, mode = 'appreciations' }: {
  branches: HomeGraphBranch[]; value: HomeGraphBranchKey; panelId: string; onChange: (branch: HomeGraphBranch) => void; mode?: HomeGraphMode
}) {
  const t = useTranslations('home.landing.graph')
  function navigate(event: KeyboardEvent<HTMLButtonElement>, branch: HomeGraphBranch) {
    const available = branches.filter(item => item.items.length)
    const index = available.findIndex(item => item.key === branch.key)
    const positions: { [key: string]: number } = { ArrowRight: (index + 1) % available.length, ArrowLeft: (index - 1 + available.length) % available.length, Home: 0, End: available.length - 1 }
    const next = available[positions[event.key]]
    if (!next) return
    event.preventDefault()
    onChange(next)
    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-media-mode="${next.key}"]`)?.focus({ preventScroll: true })
  }
  return <div className={styles.tabs} role="tablist" aria-label={t(mode === 'books' ? 'bookNavigation' : 'mediaNavigation')}
    style={{ '--home-tab-count': branches.length } as CSSProperties} data-tab-count={branches.length} data-book-tabs={mode === 'books' ? true : undefined}>
    {branches.map(branch => {
      const Icon = RELATION_ICONS[branch.key]
      const mediaType = MEDIA_TYPES[branch.key]
      const disabled = !branch.items.length
      const label = t(`branches.${branch.key}.title`)
      const description = mode === 'books' ? `${label} · ${t(`branches.${branch.key}.meaning`)}` : label
      return <button key={branch.key} type="button" role="tab" id={`${panelId}-tab-${branch.key}`}
      data-media-mode={branch.key} aria-selected={value === branch.key} aria-controls={panelId}
      data-book-tab={mode === 'books' ? branch.key : undefined}
      aria-label={disabled ? `${description} · ${t('emptyBranch')}` : description} title={disabled ? t('emptyBranch') : description}
      tabIndex={value === branch.key ? 0 : -1} disabled={disabled}
      onClick={() => onChange(branch)} onKeyDown={event => navigate(event, branch)}>
      <span className={styles.symbol}>{Icon ? <Icon size={20} strokeWidth={1.5} aria-hidden /> : mediaType && <HomeMediaSymbol type={mediaType} />}</span>
      <span className={styles.label}>{label}</span>
      {value === branch.key && <span className={styles.indicator} />}
    </button>})}
  </div>
}
