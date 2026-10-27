'use client'

import useMediaQuery from '@/hooks/useMediaQuery'
import { useId, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { ArrowRight, BookOpen, Globe2, PenLine, UserRound, type LucideIcon } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import CelebAvatarImage from '@/components/ui/CelebAvatarImage'
import HomeWorkCover from './HomeWorkCover'
import HomePersonName, { type HomePersonNavigation } from './HomePersonName'
import type { HomeGraphBranchKey, HomeGraphData } from './types'
import styles from './HomeReadingList.module.css'

const RELATION_ICONS: Partial<Record<HomeGraphBranchKey, LucideIcon>> = {
  read: BookOpen, appearance: UserRound, authored: PenLine, affiliation: Globe2,
}

export default function HomeReadingList({ data, onNavigate }: { data: HomeGraphData; onNavigate?: HomePersonNavigation }) {
  const t = useTranslations('home.landing.graph')
  const { person, branches } = data
  const id = useId()
  const [selected, setSelected] = useState(branches[0].key)
  const [direction, setDirection] = useState(1)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const current = branches.find(branch => branch.key === selected) ?? branches[0]

  function select(key: HomeGraphBranchKey) {
    setDirection(branches.findIndex(branch => branch.key === key) >= branches.findIndex(branch => branch.key === selected) ? 1 : -1)
    setSelected(key)
  }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const positions: { [key: string]: number } = { ArrowDown: (index + 1) % branches.length, ArrowRight: (index + 1) % branches.length, ArrowUp: (index - 1 + branches.length) % branches.length, ArrowLeft: (index - 1 + branches.length) % branches.length, Home: 0, End: branches.length - 1 }
    const next = branches[positions[event.key]]
    if (!next) return
    event.preventDefault()
    select(next.key)
    event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`[data-book-tab="${next.key}"]`)?.focus({ preventScroll: true })
  }

  return <div className={styles.container} data-home-reading-list aria-label={t('relatedBooks', { name: person.name })}>
    <div className={styles.layout}>
      <div className={styles.person}>
        <HomePersonName person={person} onNavigate={onNavigate} title={person.title} portrait={<Link href={`/celeb/${person.slug}`} className={styles.portrait} aria-label={`${person.name} · ${t('personLink')}`}>{person.avatarUrl && <CelebAvatarImage src={person.avatarUrl} alt="" className="object-contain object-bottom" sizes="(min-width: 800px) 160px, 64px" />}</Link>} />
      </div>
      <div className={styles.shelf}>
        <div className={styles.relations} role="tablist" aria-orientation="vertical" aria-label={t('bookNavigation')}>
          {branches.map((branch, index) => {
            const Icon = RELATION_ICONS[branch.key] ?? BookOpen
            return <button key={branch.key} id={`${id}-${branch.key}`} type="button" role="tab" data-book-tab={branch.key}
              aria-label={t(`branches.${branch.key}.meaning`)}
              aria-selected={selected === branch.key} aria-controls={`${id}-books`} tabIndex={selected === branch.key ? 0 : -1}
              onClick={() => select(branch.key)} onKeyDown={event => navigate(event, index)}>
              <Icon size={17} strokeWidth={1.5} aria-hidden />
              <span><span className={styles.fullMeaning}>{t(`branches.${branch.key}.meaning`)}</span><span className={styles.shortMeaning}>{t(`branches.${branch.key}.shortTitle`)}</span></span><ArrowRight size={14} aria-hidden className={styles.relationArrow} />
              {selected === branch.key && <motion.span className={styles.indicator} layoutId={`${id}-active-relation`} transition={{ duration: reduced ? 0 : .22 }} />}
            </button>
          })}
        </div>
        <div className={styles.bookStage} id={`${id}-books`} role="tabpanel" tabIndex={0} aria-labelledby={`${id}-${selected}`} data-book-relation={selected}>
          <AnimatePresence initial={false} mode="wait" custom={direction}>
            <motion.ul key={current.key} className={styles.books} custom={direction} data-book-items={current.key}
              variants={{ enter: (value: number) => ({ opacity: 0, y: value * 12 }), center: { opacity: 1, y: 0 }, exit: (value: number) => ({ opacity: 0, y: -value * 12 }) }}
              initial="enter" animate="center" exit="exit" transition={{ duration: reduced ? 0 : .17 }}>
              {current.items.map((item, index) => <motion.li key={item.id}
                initial={{ opacity: 0, rotateY: reduced ? 0 : -10, x: reduced ? 0 : 8 }} animate={{ opacity: 1, rotateY: 0, x: 0 }}
                transition={{ duration: reduced ? 0 : .25, delay: reduced ? 0 : index * .05 }}>
                <Link href={`/content/${item.id}`} className={styles.book} aria-label={t('openWork', { title: item.title })}>
                  <span className={styles.cover}><HomeWorkCover item={item} /></span>
                  <span className={styles.bookInfo}><strong>{item.title}</strong>{item.creator && <span>{item.creator}</span>}</span>
                  <ArrowRight size={14} aria-hidden className={styles.bookArrow} />
                </Link>
                {item.relatedHref && item.relatedLabel && <Link href={item.relatedHref} className={styles.affiliation}
                  aria-label={t('openAffiliation', { name: item.relatedLabel })}>
                  <Globe2 size={16} aria-hidden /><span>{item.relatedLabel}</span>
                  <span className={styles.affiliationAction}>{t('viewAffiliation')}<ArrowRight size={14} aria-hidden /></span>
                </Link>}
              </motion.li>)}
            </motion.ul>
          </AnimatePresence>
        </div>
      </div>
    </div>
  </div>
}
