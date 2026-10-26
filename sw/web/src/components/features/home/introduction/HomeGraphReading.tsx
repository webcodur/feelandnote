'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowRight, ArrowUpRight, ChevronRight, ExternalLink } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import Modal, { ModalBody } from '@/components/ui/Modal'
import HomeWorkCover from './HomeWorkCover'
import { useClippedText } from '@/hooks/useClippedText'
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
  const { ref, isClipped } = useClippedText<HTMLDivElement>(item.text)
  const appreciation = branch.key === 'read' || ['BOOK', 'MUSIC', 'VIDEO', 'GAME'].includes(branch.key)
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
        <div ref={ref} className={`${styles.readingText} ${isClipped ? 'clip-fade-end' : ''}`} data-appreciation={appreciation && !!item.text}>
          {item.text && <p>{item.text}</p>}
          {!item.text && !item.relatedLabel && <p>{t(appreciation ? 'noAppreciation' : 'noDescription')}</p>}
        </div>
        <div className={styles.readingLinks}>
          {isClipped && <button type="button" className={styles.textLink} onClick={() => setExpanded(true)} aria-haspopup="dialog">{t('readFull')}<ArrowUpRight size={14} aria-hidden /></button>}
          {source && <a href={source} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} aria-hidden />{t('source')}</a>}
          <Link href={`/content/${item.id}`}>{t('workLink')}<ArrowRight size={15} aria-hidden /></Link>
          {item.relatedHref && <Link href={item.relatedHref}>{t('relatedBooks', { name: item.relatedLabel ?? '' })}<ArrowRight size={15} aria-hidden /></Link>}
        </div>
      </div>
    </div>
    <Modal isOpen={expanded} onClose={() => setExpanded(false)} title={item.title} size="full" animateHeight={false} fadeClippedEnd>
      <ModalBody>
        <p className={`whitespace-pre-line text-base leading-relaxed ${appreciation ? 'text-review' : 'text-text-primary'}`}>{item.text}</p>
        {source && <a className={styles.textLink} href={source} target="_blank" rel="noopener noreferrer">{t('source')} ↗</a>}
      </ModalBody>
    </Modal>
  </article>
}
