'use client'

import useMediaQuery from '@/hooks/useMediaQuery'
import { useId, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import HomeMediaSymbol from './HomeMediaSymbol'
import type { HomeGraphBranch, HomeGraphBranchKey } from './types'
import styles from './HomeMediaTabs.module.css'

export default function HomeMediaTabs({ branches, value, panelId, onChange }: {
  branches: HomeGraphBranch[]; value: HomeGraphBranchKey; panelId: string; onChange: (branch: HomeGraphBranch) => void
}) {
  const t = useTranslations('home.landing.graph')
  const id = useId()
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
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
  return <div className={styles.tabs} role="tablist" aria-label={t('mediaNavigation')}>
    {branches.map(branch => <button key={branch.key} type="button" role="tab" id={`${panelId}-tab-${branch.key}`}
      data-media-mode={branch.key} aria-selected={value === branch.key} aria-controls={panelId}
      aria-label={t(`branches.${branch.key}.title`)} title={t(`branches.${branch.key}.title`)}
      tabIndex={value === branch.key ? 0 : -1} disabled={!branch.items.length}
      onClick={() => onChange(branch)} onKeyDown={event => navigate(event, branch)}>
      {branch.items[0] && <span className={styles.symbol}><HomeMediaSymbol type={branch.items[0].type} /></span>}
      {value === branch.key && <motion.span className={styles.indicator} layoutId={`${id}-indicator`} transition={{ duration: reduced ? 0 : .22 }} />}
    </button>)}
  </div>
}
