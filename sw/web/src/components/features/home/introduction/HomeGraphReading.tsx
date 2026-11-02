'use client'

import { useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeftRight, ArrowUpRight, ChevronLeft, ChevronRight, Globe2, Maximize2 } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import ContentReadingBody from '@/components/shared/ContentReading/ContentReadingBody'
import { contentSourceHref } from '@/components/shared/ContentReading/contentReadingData'
import { useClippedText } from '@/hooks/useClippedText'
import ContentTextModal from '@/components/ui/ContentTextModal'
import ContentCoverLink from '@/components/shared/ContentCoverLink'
import HomeWorkCover from './HomeWorkCover'
import HomeMediaPreview from './HomeMediaPreview'
import type { HomeGraphBranch, HomeGraphItem, HomeGraphMode, HomeGraphPerson } from './types'
import styles from './HomeGraphReading.module.css'

export default function HomeGraphReading({ person, branch, item, mode = 'appreciations', reviewItem, introduction, introductionSourceUrl, onNext, onPrevious }: {
  person: HomeGraphPerson; branch: HomeGraphBranch; item: HomeGraphItem; mode?: HomeGraphMode;
  reviewItem?: HomeGraphItem; introduction?: string | null; introductionSourceUrl?: string | null; onNext?: () => void; onPrevious?: () => void
}) {
  const t = useTranslations('home.landing.graph')
  const tReview = useTranslations('content.reviewModal')
  const [expanded, setExpanded] = useState(false)
  const [showIntroduction, setShowIntroduction] = useState(false)
  const mediaId = useId()
  const bookMode = mode === 'books'
  const appreciation = branch.key === 'read' || ['BOOK', 'MUSIC', 'VIDEO', 'GAME'].includes(branch.key)
  const reviewText = reviewItem?.text?.trim() || (appreciation ? item.text?.trim() : null)
  const introText = introduction?.trim() || null
  const review = !!reviewText && !showIntroduction
  const activeText = review ? reviewText : introText
  const tone = review ? 'review' : 'intro'
  const previewText = activeText || (showIntroduction ? t('noDescription') : !bookMode && !item.relatedLabel ? t(appreciation ? 'noAppreciation' : 'noDescription') : null)
  const { ref: textRef, isClipped } = useClippedText<HTMLDivElement>(previewText)
  const source = contentSourceHref(review ? reviewItem?.sourceUrl ?? item.sourceUrl : introductionSourceUrl)
  const canExpand = !!activeText && isClipped
  const openFullText = () => { if (!window.getSelection()?.toString()) setExpanded(true) }
  const readingId = `${mediaId}-text`
  const position = branch.items.findIndex(value => value.id === item.id) + 1
  return <article className={`${styles.reading} ${bookMode ? styles.bookReading : ''}`} data-graph-reading data-reading-mode={review ? 'review' : 'intro'} aria-live="polite" aria-atomic="true">
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
            {item.creator && <p className={styles.creator}>{item.creator}</p>}
            <div className={styles.workControls} data-home-work-controls>
              {onNext && <div className={styles.workPager} role="group" aria-label={t('workNavigation')} data-home-work-pager>
                {onPrevious && <button type="button" className={styles.nextWork} data-previous-work onClick={onPrevious}
                  aria-label={t(bookMode ? 'previousBook' : 'previousWork')} title={t(bookMode ? 'previousBook' : 'previousWork')}>
                  <ChevronLeft size={18} aria-hidden />
                </button>}
                <span className={styles.workPosition} aria-hidden="true">{position}<span>/</span>{branch.items.length}</span>
                <button type="button" className={styles.nextWork} data-next-work onClick={onNext}
                  aria-label={t(bookMode ? 'nextBook' : 'nextWork')}
                  title={`${t(bookMode ? 'nextBook' : 'nextWork')} · ${position}/${branch.items.length}`}>
                  <ChevronRight size={18} aria-hidden />
                </button>
              </div>}
              <button type="button" className={styles.textToggle} data-home-reading-toggle aria-controls={readingId}
                aria-label={t(!review && reviewText ? 'showReviewBackground' : 'showBookIntroduction')}
                title={t(!review && reviewText ? 'showReviewBackground' : 'showBookIntroduction')}
                aria-pressed={!review} onClick={() => setShowIntroduction(value => reviewText ? !value : true)}>
                <ArrowLeftRight size={18} aria-hidden />
              </button>
              {activeText && <button type="button" className={styles.textToggle} data-home-text-expand
                aria-haspopup="dialog" aria-expanded={expanded} aria-label={t('readFull')} title={t('readFull')}
                onClick={() => setExpanded(true)}>
                <Maximize2 size={18} aria-hidden />
              </button>}
              {item.type !== 'BOOK' && <HomeMediaPreview item={item} />}
            </div>
          </div>
        </div>
        {bookMode && branch.key === 'affiliation' && item.relatedLabel && <aside className={styles.bookRelation} data-home-book-context aria-label={item.relatedLabel}>
          {item.relatedHref ? <Link href={item.relatedHref} className={styles.topicLink} aria-label={t('openAffiliation', { name: item.relatedLabel })}>
            <Globe2 size={16} aria-hidden /><span>{item.relatedLabel}</span><ArrowUpRight size={15} aria-hidden />
          </Link> : <p className={styles.topicLink}><Globe2 size={16} aria-hidden /><span>{item.relatedLabel}</span></p>}
          {item.relatedDescription && <p className={styles.affiliationDescription}>{item.relatedDescription}</p>}
        </aside>}
        {!bookMode && item.relatedLabel && <p className={styles.relation}>{person.name}<span>→</span>
          {item.relatedHref ? <Link href={item.relatedHref} aria-label={branch.key === 'affiliation' ? t('openAffiliation', { name: item.relatedLabel }) : undefined}>{item.relatedLabel}</Link> : item.relatedLabel}
          <span>→</span>{item.title}</p>}
        {previewText && <div ref={textRef} id={readingId} data-home-reading-preview
          data-home-reading-expandable={canExpand || undefined}
          role={canExpand ? 'presentation' : undefined}
          onClick={canExpand ? event => { if (!(event.target as HTMLElement).closest('a')) openFullText() } : undefined}
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
