'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import type { HomeGraphPerson } from './types'
import styles from './HomePersonName.module.css'

export type HomePersonNavigation = (direction: -1 | 1) => void

export default function HomePersonName({ person, onNavigate }: { person: HomeGraphPerson; onNavigate?: HomePersonNavigation }) {
  const t = useTranslations('home.landing.graph')
  return <div className={styles.row}>
    {onNavigate && <button type="button" data-person-direction="-1" onClick={() => onNavigate(-1)} aria-label={t('previousPerson')}><ChevronLeft size={17} aria-hidden /></button>}
    <Link href={`/celeb/${person.slug}`} className={styles.name}><strong>{person.name}</strong></Link>
    {onNavigate && <button type="button" data-person-direction="1" onClick={() => onNavigate(1)} aria-label={t('nextPerson')}><ChevronRight size={17} aria-hidden /></button>}
  </div>
}
