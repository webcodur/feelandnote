'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRight, ChevronRight, ExternalLink } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import ClippedContentReadingText from '@/components/ui/ClippedContentReadingText'
import ContentTextModal from '@/components/ui/ContentTextModal'
import MediaEmbed from '@/components/features/content/MediaEmbed'
import HomeWorkCover from './HomeWorkCover'
import type { HomeGraphBranch, HomeGraphItem, HomeGraphPerson } from './types'
import styles from './HomeGraphReading.module.css'

function sourceHref(value: string | null) {
  if (!value) return null
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null }
  catch { return null }
}

export default function HomeGraphReading({ person, branch, item, onNext }: {
  person: HomeGraphPerson; branch: HomeGraphBranch; item: HomeGraphItem; onNext?: () => void
}) {
  const t = useTranslations('home.landing.graph')
  const [expanded, setExpanded] = useState(false)
  const appreciation = branch.key === 'read' || ['BOOK', 'MUSIC', 'VIDEO', 'GAME'].includes(branch.key)
  const review = appreciation && !!item.text
  const previewText = item.text || (!item.relatedLabel ? t(appreciation ? 'noAppreciation' : 'noDescription') : null)
  const source = sourceHref(item.sourceUrl)
  return <article className={styles.reading} data-graph-reading aria-live="polite" aria-atomic="true">
    <div className={styles.readingContent}>
      <div className={styles.readingBody}>
        <div className={styles.workHeading}>
          <Link href={`/content/${item.id}`} className={styles.cover} aria-label={t('openWork', { title: item.title })}>
            <HomeWorkCover item={item} />
          </Link>
          <div className={styles.workIdentity}>
            <div className={styles.titleRow}>
              <h3 className={styles.readingTitle}><Link href={`/content/${item.id}`}>{item.title}</Link></h3>
              {onNext && <button type="button" className={styles.nextWork} data-next-work onClick={onNext} aria-label={t('nextWork')} title={t('nextWork')}><ChevronRight size={22} aria-hidden /></button>}
            </div>
            {item.creator && <p className={styles.creator}>{item.creator}</p>}
          </div>
        </div>
        {item.relatedLabel && <p className={styles.relation}>{person.name}<span>→</span>{item.relatedLabel}<span>→</span>{item.title}</p>}
        <ClippedContentReadingText text={previewText} tone={review ? 'review' : 'primary'}
          className={`${styles.readingText} ${review ? styles.reviewText : ''}`}
          onClick={item.text ? () => setExpanded(true) : undefined} clickLabel={t('readFull')} />
        <div className={styles.readingLinks}>
          {source && <a href={source} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden />{t('source')}</a>}
          <Link href={`/content/${item.id}`}>{t('workLink')}<ArrowRight size={15} aria-hidden /></Link>
          {item.relatedHref && <Link href={item.relatedHref}>{t('relatedBooks', { name: item.relatedLabel ?? '' })}<ArrowRight size={15} aria-hidden /></Link>}
        </div>
        {item.type !== 'BOOK' && <div className={styles.media} data-home-work-media={item.type}>
          <MediaEmbed key={item.id} contentId={item.id} type={item.type} title={item.title} showImages />
        </div>}
      </div>
    </div>
    <ContentTextModal isOpen={expanded} onClose={() => setExpanded(false)} title={item.title}
      text={item.text ?? ''} tone={review ? 'review' : 'primary'}
      source={source ? { href: source, label: t('source') } : undefined} />
  </article>
}
