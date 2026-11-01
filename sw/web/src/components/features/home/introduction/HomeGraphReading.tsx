'use client'

import { useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowLeftRight, ArrowUpRight, ChevronLeft, ChevronRight, Globe2 } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import ContentReadingText from '@/components/ui/ContentReadingText'
import FormattedText from '@/components/ui/FormattedText'
import { useClippedText } from '@/hooks/useClippedText'
import ContentTextModal from '@/components/ui/ContentTextModal'
import ContentCoverLink from '@/components/shared/ContentCoverLink'
import HomeWorkCover from './HomeWorkCover'
import HomeMediaPreview from './HomeMediaPreview'
import type { HomeGraphBranch, HomeGraphItem, HomeGraphMode, HomeGraphPerson } from './types'
import styles from './HomeGraphReading.module.css'

function sourceHref(value: string | null) {
  if (!value) return null
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) ? url.href : null }
  catch { return null }
}

export default function HomeGraphReading({ person, branch, item, mode = 'appreciations', reviewItem, introduction, onNext, onPrevious }: {
  person: HomeGraphPerson; branch: HomeGraphBranch; item: HomeGraphItem; mode?: HomeGraphMode;
  reviewItem?: HomeGraphItem; introduction?: string | null; onNext?: () => void; onPrevious?: () => void
}) {
  const t = useTranslations('home.landing.graph')
  const [expanded, setExpanded] = useState(false)
  const [showIntroduction, setShowIntroduction] = useState(false)
  const mediaId = useId()
  const bookMode = mode === 'books'
  const appreciation = branch.key === 'read' || ['BOOK', 'MUSIC', 'VIDEO', 'GAME'].includes(branch.key)
  const reviewText = reviewItem?.text?.trim() || (appreciation ? item.text?.trim() : null)
  const introText = introduction?.trim() || (!appreciation ? item.text?.trim() : null)
  const review = !!reviewText && (!introText || !showIntroduction)
  const activeText = review ? reviewText : introText
  const canSwitch = item.type === 'BOOK' && !!reviewText && !!introText
  const tone = review ? 'review' : introText && item.type === 'BOOK' ? 'intro' : 'primary'
  const previewText = activeText || (!bookMode && !item.relatedLabel ? t(appreciation ? 'noAppreciation' : 'noDescription') : null)
  const { ref: textRef, isClipped } = useClippedText<HTMLDivElement>(previewText)
  const source = review ? sourceHref(reviewItem?.sourceUrl ?? item.sourceUrl) : null
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
              {canSwitch && <button type="button" className={styles.textToggle} data-home-reading-toggle aria-controls={readingId}
                aria-label={t(review ? 'showBookIntroduction' : 'showReviewBackground')}
                title={t(review ? 'showBookIntroduction' : 'showReviewBackground')}
                aria-pressed={!review} onClick={() => setShowIntroduction(value => !value)}>
                <ArrowLeftRight size={15} aria-hidden />{t(review ? 'introShort' : 'reviewShort')}
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
          className={`${styles.readingText} ${review ? styles.reviewText : tone === 'intro' ? styles.introText : ''} ${isClipped ? 'clip-fade-end' : ''}`}>
          {review && source ? <><a href={source} target="_blank" rel="noopener noreferrer" className={styles.reviewSource} data-home-review-source
            aria-label={`${t('reviewBackground')} · ${t('source')}`}>{t('reviewBackground')}</a>: </>
            : <span className={styles.readingLabel}>{t(review || (!introText && appreciation) ? 'reviewBackground' : 'bookIntroduction')}: </span>}
          <ContentReadingText text={previewText} tone={tone} className={styles.inlineText}
            onClick={activeText && isClipped ? () => setExpanded(true) : undefined} clickLabel={t('readFull')}>
            <FormattedText text={previewText} />
          </ContentReadingText>
        </div>}
      </div>
    </div>
    <ContentTextModal isOpen={expanded} onClose={() => setExpanded(false)} title={item.title}
      text={activeText ?? ''} tone={tone}
      source={source ? { href: source, label: t('source') } : undefined} />
  </article>
}
