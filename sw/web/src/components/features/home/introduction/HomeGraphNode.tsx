'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import CelebAvatarImage from '@/components/ui/CelebAvatarImage'
import BlurDissolve from '@/components/ui/BlurDissolve'
import type { HomeGraphPerson, HomePersonNavigation } from './types'
import styles from './HomeGraph.module.css'

const personSizes = '(min-width: 860px) 480px, 160px'
const loadedPersonImages = new Set<string>()

export function HomeGraphRoot({ person, onNavigate }: { person: HomeGraphPerson; onNavigate?: HomePersonNavigation }) {
  const t = useTranslations('home.landing.graph')
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null)
  const photo = person.photoUrl && person.photoUrl !== failedPhoto ? person.photoUrl : null
  return <div className={styles.root} data-graph-root>
    <Link href={`/celeb/${person.slug}`} className={`${styles.portraitStage} ${!photo && !person.avatarUrl ? styles.emptyPortrait : ''}`} data-graph-origin aria-label={`${person.name} · ${t('personLink')}`}>
      {photo && <div className={styles.imageLayer} data-person-image="portrait">
        <BlurDissolve key={photo} animateOnMount={!loadedPersonImages.has(photo)} className={styles.personImage}>
          <Image src={photo} alt="" width={480} height={600} sizes={personSizes} loading="lazy" unoptimized
            className={styles.photo} onLoad={() => loadedPersonImages.add(photo)} onError={() => setFailedPhoto(photo)} />
        </BlurDissolve>
      </div>}
      {person.avatarUrl && <div className={`${styles.imageLayer} ${photo ? styles.avatarLayer : ''}`} data-person-image="avatar">
        <BlurDissolve key={person.avatarUrl} animateOnMount={!loadedPersonImages.has(person.avatarUrl)} className={styles.personImage}>
          <CelebAvatarImage src={person.avatarUrl} alt="" width={480} height={600} className={styles.avatar} loading="lazy" sizes={personSizes}
            onLoad={() => loadedPersonImages.add(person.avatarUrl!)} />
        </BlurDissolve>
      </div>}
      {!person.avatarUrl && <span className={`${styles.initial} ${photo ? styles.compactInitial : ''}`}>{person.name.charAt(0)}</span>}
    </Link>
    <div className={styles.personCaption}>
      <div className={styles.personIdentity}>
        <Link href={`/celeb/${person.slug}`} className={styles.personName}>{person.name}</Link>
        {person.title && <p>{person.title}</p>}
      </div>
      {onNavigate && <div className={styles.personNavigation} role="group" aria-label={t('personNavigation')}>
        <button type="button" data-person-direction="-1" onClick={() => onNavigate(-1)} aria-label={t('previousPerson')}><ChevronLeft size={20} aria-hidden /></button>
        <button type="button" data-person-direction="1" onClick={() => onNavigate(1)} aria-label={t('nextPerson')}><ChevronRight size={20} aria-hidden /></button>
      </div>}
    </div>
  </div>
}
