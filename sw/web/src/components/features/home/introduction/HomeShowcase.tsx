'use client'

import { useId, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import styles from './HomeIntroduction.module.css'

export default function HomeShowcase({ appreciations, books }: { appreciations: ReactNode; books: ReactNode }) {
  const t = useTranslations('home.landing')
  const id = useId()
  const [selected, setSelected] = useState('appreciations')
  const panels = [
    { key: 'appreciations', label: t('navAppreciations'), title: t('appreciationsTitle'), description: t('appreciationsDescription'), content: appreciations },
    { key: 'books', label: t('navReading'), title: t('readingTitle'), description: t('readingDescription'), content: books },
  ]

  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const positions: Record<string, number> = { ArrowRight: (index + 1) % panels.length, ArrowLeft: (index - 1 + panels.length) % panels.length, Home: 0, End: panels.length - 1 }
    const next = positions[event.key]
    if (next === undefined) return
    event.preventDefault()
    setSelected(panels[next].key)
    event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus()
  }

  return <div className={styles.showcase} data-home-showcase>
    <div className={styles.showcaseTabs} role="tablist" aria-label={t('navShowcase')}>
      {panels.map((panel, index) => <button key={panel.key} type="button" role="tab" id={`${id}-${panel.key}-tab`}
        aria-selected={selected === panel.key} aria-controls={`${id}-${panel.key}-panel`} tabIndex={selected === panel.key ? 0 : -1}
        onClick={() => setSelected(panel.key)} onKeyDown={event => navigate(event, index)}>{panel.label}</button>)}
    </div>
    {panels.map(panel => <div key={panel.key} id={`${id}-${panel.key}-panel`} role="tabpanel" aria-labelledby={`${id}-${panel.key}-tab`}
      hidden={selected !== panel.key} className={styles.showcasePanel} tabIndex={0}>
      <header className={styles.showcaseHeading}><h3>{panel.title}</h3><p>{panel.description}</p></header>
      {panel.content}
    </div>)}
  </div>
}
