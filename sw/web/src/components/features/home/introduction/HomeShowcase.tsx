import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import styles from './HomeIntroduction.module.css'

export default async function HomeShowcase({ appreciations, books }: { appreciations: ReactNode; books: ReactNode }) {
  const t = await getTranslations('home.landing')
  const panels = [
    { key: 'appreciations', label: t('navAppreciations'), description: t('appreciationsDescription'), content: appreciations },
    { key: 'books', label: t('navReading'), description: t('readingDescription'), content: books },
  ]

  return <div className={styles.showcase} data-home-showcase>
    {panels.map(panel => <section key={panel.key} className={styles.showcasePanel} aria-labelledby={`home-${panel.key}-heading`}>
      <header className={styles.showcaseHeading}><h3 id={`home-${panel.key}-heading`}>{panel.label}</h3><p>{panel.description}</p></header>
      {panel.content}
    </section>)}
  </div>
}
