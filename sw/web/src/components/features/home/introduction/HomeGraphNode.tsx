'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import CelebAvatarImage from '@/components/ui/CelebAvatarImage'
import HomeMediaSymbol from './HomeMediaSymbol'
import HomePersonName, { type HomePersonNavigation } from './HomePersonName'
import { ArrowRight } from 'lucide-react'
import type { HomeGraphBranch, HomeGraphPerson } from './types'
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

interface BranchProps {
  branch: HomeGraphBranch
  index: number
  readingId: string
  onSelect: () => void
}

export function HomeGraphNode({ branch, index, readingId, onSelect }: BranchProps) {
  const t = useTranslations('home.landing.graph')
  const item = branch.items[0]
  const title = t(`branches.${branch.key}.title`)
  const reasonId = `${readingId}-${branch.key}-reason`
  return <button type="button" className={styles.branch}
    data-graph-branch data-position={index} data-home-media={branch.key} aria-controls={readingId}
    disabled={!item} onClick={onSelect} aria-label={t('selectMedia', { title })} aria-describedby={reasonId}>
    {item && <span className={styles.symbol} data-graph-target><HomeMediaSymbol type={item.type} /></span>}
    <span className={styles.branchHead}><strong>{title}</strong><ArrowRight size={14} aria-hidden className={styles.branchAction} /></span>
    <span id={reasonId} className={styles.branchReason}>{t(`branches.${branch.key}.reason`)}</span>
    {!item && <span className={styles.empty}>{t('emptyBranch')}</span>}
  </button>
}
