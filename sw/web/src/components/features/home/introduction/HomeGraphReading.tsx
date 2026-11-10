'use client'

import { useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeftRight, ArrowUpRight, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import ContentReadingBody from '@/components/shared/ContentReading/ContentReadingBody'
import { contentSourceHref } from '@/components/shared/ContentReading/contentReadingData'
import { useClippedText } from '@/hooks/useClippedText'
import ContentTextModal from '@/components/ui/ContentTextModal'
import ContentCoverLink from '@/components/shared/ContentCoverLink'
import HomeWorkCover from './HomeWorkCover'
import HomeMediaPreview from './HomeMediaPreview'
import { HOME_GRAPH_MEDIA } from './config'
import type { HomeGraphBranch, HomeGraphItem } from './types'
import styles from './HomeGraphReading.module.css'

export default function HomeGraphReading({ category, branch, items, item, reviewItem, introduction, introductionSourceUrl, onNext, onPrevious }: {
  category: { icon: LucideIcon; row: string; name: string }; branch: HomeGraphBranch; items: HomeGraphItem[]; item: HomeGraphItem;
  reviewItem?: HomeGraphItem; introduction?: string | null; introductionSourceUrl?: string | null; onNext?: () => void; onPrevious?: () => void
}) {
  const t = useTranslations('home.landing.graph')
  const tReview = useTranslations('content.reviewModal')
  const [expanded, setExpanded] = useState(false)
  const [showIntroduction, setShowIntroduction] = useState(false)
  const mediaId = useId()
  const appreciation = (HOME_GRAPH_MEDIA as readonly string[]).includes(branch.key)
  const book = item.type === 'BOOK'
  const reviewText = reviewItem?.text?.trim() || (appreciation ? item.text?.trim() : null)
  const introText = introduction?.trim() || null
  const review = !!reviewText && !showIntroduction
  const activeText = review ? reviewText : introText
  const tone = review ? 'review' : 'intro'
  const previewText = activeText || (showIntroduction ? t('noDescription') : appreciation ? t('noAppreciation') : null)
  const { ref: textRef, isClipped } = useClippedText<HTMLDivElement>(previewText)
  const source = contentSourceHref(review ? reviewItem?.sourceUrl ?? item.sourceUrl : introductionSourceUrl)
  const canExpand = !!activeText && isClipped
  const openFullText = () => { if (!window.getSelection()?.toString()) setExpanded(true) }
  const readingId = `${mediaId}-text`
  const position = items.findIndex(value => value.id === item.id) + 1
  return <article className={styles.reading} data-graph-reading data-reading-mode={review ? 'review' : 'intro'} aria-live="polite" aria-atomic="true">
    <div className={styles.readingContent}>
      <div className={styles.readingBody}>
        <div className={styles.workHeading}>
          <ContentCoverLink href={`/content/${item.id}`} title={item.title} imageSrc={item.thumbnailUrl} contentType={item.type} className={styles.cover}>
            <HomeWorkCover item={item} />
          </ContentCoverLink>
          <div className={styles.workIdentity}>
            <div className={styles.titleRow}>
              <h3 className={styles.readingTitle}><Link href={`/content/${item.id}`}>{item.title}</Link></h3>
            </div>
            <div className={styles.metaRow}>
              {item.creator && <p className={styles.creator}>{item.creator}</p>}
              <p className={styles.category} data-home-category><category.icon size={14} strokeWidth={1.75} aria-hidden /><span>{category.row}</span><strong>{category.name}</strong></p>
            </div>
            <div className={styles.workControls} data-home-work-controls>
              {onNext && <div className={styles.workPager} role="group" aria-label={t('workNavigation')} data-home-work-pager>
                {onPrevious && <button type="button" className={styles.nextWork} data-previous-work onClick={onPrevious}
                  aria-label={t(book ? 'previousBook' : 'previousWork')} title={t(book ? 'previousBook' : 'previousWork')}>
                  <ChevronLeft size={18} aria-hidden />
                </button>}
                <span className={styles.workPosition} aria-hidden="true">{position}<span>/</span>{items.length}</span>
                <button type="button" className={styles.nextWork} data-next-work onClick={onNext}
                  aria-label={t(book ? 'nextBook' : 'nextWork')}
                  title={`${t(book ? 'nextBook' : 'nextWork')} · ${position}/${items.length}`}>
                  <ChevronRight size={18} aria-hidden />
                </button>
              </div>}
              <button type="button" className={styles.textToggle} data-home-reading-toggle aria-controls={readingId}
                aria-label={t(!reviewText ? 'noAppreciation' : !review ? 'showReviewBackground' : 'showBookIntroduction')}
                title={t(!reviewText ? 'noAppreciation' : !review ? 'showReviewBackground' : 'showBookIntroduction')}
                disabled={!reviewText} aria-pressed={!review} onClick={() => setShowIntroduction(value => !value)}>
                <ArrowLeftRight size={18} aria-hidden />
              </button>
              {item.type !== 'BOOK' && <HomeMediaPreview item={item} />}
            </div>
          </div>
        </div>
        {branch.key === 'profession' && item.relatedDescription && <aside className={styles.bookRelation} data-home-book-context>
          <p className={styles.affiliationDescription}><span className={styles.contextLabel}>{t('selectionReason')}</span>: {item.relatedDescription}</p>
        </aside>}
        {branch.key === 'affiliation' && item.relatedLabel && <aside className={styles.bookRelation} data-home-book-context aria-label={item.relatedLabel}>
          {item.relatedDescription && <p className={styles.affiliationDescription}>{item.relatedDescription}</p>}
          {item.relatedHref && <Link href={item.relatedHref} className={styles.topicLink} aria-label={t('openAffiliation', { name: item.relatedLabel })}>
            <span>{t('viewAffiliation')}</span><ArrowUpRight size={15} aria-hidden />
          </Link>}
        </aside>}
        {previewText && <div ref={textRef} id={readingId} data-home-reading-preview
          data-home-reading-expandable={canExpand || undefined}
          tabIndex={canExpand ? 0 : undefined} aria-haspopup={canExpand ? 'dialog' : undefined}
          onClick={canExpand ? event => { if (!(event.target as HTMLElement).closest('a')) openFullText() } : undefined}
          onKeyDown={canExpand ? event => { if (event.target === event.currentTarget && event.key === 'Enter') setExpanded(true) } : undefined}
          className={`${styles.readingText} ${review ? styles.reviewText : tone === 'intro' ? styles.introText : ''} ${isClipped ? 'clip-fade-end' : ''}`}>
          {review && (reviewItem ?? item).originalLanguage && <p className="mb-2 text-xs text-text-secondary">{tReview('originalLanguage')}</p>}
          <ContentReadingBody kind={review ? 'review' : 'intro'} text={previewText}
            label={t(review || (!showIntroduction && !introText && appreciation) ? 'reviewBackground' : 'bookIntroduction')}
            sourceUrl={source} />
        </div>}
      </div>
    </div>
    <ContentTextModal isOpen={expanded} onClose={() => setExpanded(false)} title={item.title}
      readingLabel={t(review ? 'reviewBackground' : 'bookIntroduction')}
      text={activeText ?? ''} tone={tone}
      source={source ? { href: source, label: t('source') } : undefined} />
  </article>
}
