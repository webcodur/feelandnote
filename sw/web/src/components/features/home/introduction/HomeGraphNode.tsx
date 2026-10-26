'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import CelebAvatarImage from '@/components/ui/CelebAvatarImage'
import HomePersonName, { type HomePersonNavigation } from './HomePersonName'
import type { HomeGraphPerson } from './types'
import styles from './HomeGraph.module.css'

export function HomeGraphRoot({ person, onNavigate }: { person: HomeGraphPerson; onNavigate?: HomePersonNavigation }) {
  const t = useTranslations('home.landing.graph')
  return <div className={styles.root} data-graph-root>
    <HomePersonName person={person} onNavigate={onNavigate} portrait={<Link href={`/celeb/${person.slug}`} className={styles.portraitDisc} data-graph-origin aria-label={`${person.name} · ${t('personLink')}`}>
      {person.avatarUrl && <CelebAvatarImage src={person.avatarUrl} alt="" className="object-contain object-bottom" sizes="(min-width: 800px) 160px, 64px" />}
      {!person.avatarUrl && <span className={styles.initial}>{person.name.charAt(0)}</span>}
    </Link>} />
  </div>
}
