import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import styles from './HomeIntroduction.module.css'
import type { HomeGraphMode } from './types'

export default async function HomeShowcase({ mode, children }: { mode: HomeGraphMode; children: ReactNode }) {
  const t = await getTranslations('home.landing')
  return <div className={styles.showcasePanel} data-home-showcase={mode}>
    <header className={styles.showcaseHeading}><p>{t(mode === 'books' ? 'readingDescription' : 'appreciationsDescription')}</p></header>
    {children}
  </div>
}
