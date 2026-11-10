import type { ReactNode } from 'react'
import { getTranslations } from 'next-intl/server'
import styles from './HomeIntroduction.module.css'

export default async function HomeShowcase({ children }: { children: ReactNode }) {
  const t = await getTranslations('home.landing')
  return <div className={`${styles.showcasePanel} ${styles.showcaseEditorial}`} data-home-showcase>
    <header className={styles.showcaseHeading}><p>{t('readingDescription')}</p></header>
    {children}
  </div>
}
