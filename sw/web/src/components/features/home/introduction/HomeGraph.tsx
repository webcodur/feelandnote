'use client'

import useMediaQuery from '@/hooks/useMediaQuery'
import { useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { HomeGraphRoot } from './HomeGraphNode'
import HomeGraphReading from './HomeGraphReading'
import HomeMediaTabs from './HomeMediaTabs'
import type { HomePersonNavigation } from './HomePersonName'
import type { HomeGraphData, HomeGraphItem, HomeGraphBranch, HomeGraphBranchKey } from './types'
import styles from './HomeGraph.module.css'

export default function HomeGraph({ data, onNavigate }: { data: HomeGraphData; onNavigate?: HomePersonNavigation }) {
  const t = useTranslations('home.landing.graph')
  const id = useId()
  const [selection, setSelection] = useState<{ key: HomeGraphBranchKey; item: HomeGraphItem } | null>(() => {
    const branch = data.branches.find(value => value.key === 'BOOK' && value.items.length) ?? data.branches.find(value => value.items.length)
    return branch ? { key: branch.key, item: branch.items[0] } : null
  })
  const [direction, setDirection] = useState(1)
  const panelRef = useRef<HTMLDivElement>(null)
  const focusNextWork = useRef(false)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const selectedBranch = data.branches.find(branch => branch.key === selection?.key)
  const panelId = `${id}-reading`

  function openBranch(branch: HomeGraphBranch) {
    const item = branch.items[0]
    if (!item || branch.key === selection?.key) return
    focusNextWork.current = false
    const previous = data.branches.findIndex(value => value.key === selection?.key)
    setDirection(data.branches.indexOf(branch) >= previous ? 1 : -1)
    setSelection({ key: branch.key, item })
  }

  function nextWork() {
    if (!selection || !selectedBranch || selectedBranch.items.length < 2) return
    const index = selectedBranch.items.findIndex(item => item.id === selection.item.id)
    focusNextWork.current = true
    setDirection(1)
    setSelection({ key: selectedBranch.key, item: selectedBranch.items[(index + 1) % selectedBranch.items.length] })
  }

  return <div className={styles.container} data-home-scene="appreciations">
    <div className={styles.graph} data-home-graph="appreciations" aria-label={t('graphLabel', { name: data.person.name })}>
      <HomeGraphRoot person={data.person} onNavigate={onNavigate} />
      {selection && selectedBranch && <div className={styles.selectedView}>
        <HomeMediaTabs branches={data.branches} value={selection.key} panelId={panelId} onChange={openBranch} />
        <div ref={panelRef} className={styles.readingPanel} id={panelId} role="tabpanel" aria-labelledby={`${panelId}-tab-${selection.key}`} tabIndex={0}>
          <AnimatePresence initial={false} mode="wait" custom={direction}>
            <motion.div key={`${selection.key}-${selection.item.id}`} custom={direction} data-media-reading={selection.key} data-work-id={selection.item.id}
              variants={{ enter: (value: number) => ({ opacity: 0, x: value * 14 }), center: { opacity: 1, x: 0 }, exit: (value: number) => ({ opacity: 0, x: -value * 14 }) }}
              initial="enter" animate="center" exit="exit" transition={{ duration: reduced ? 0 : .16 }}
              onAnimationComplete={definition => {
                if (definition !== 'center' || !focusNextWork.current) return
                const panel = panelRef.current
                if (document.activeElement === document.body || panel?.contains(document.activeElement)) panel?.querySelector<HTMLButtonElement>('[data-next-work]')?.focus({ preventScroll: true })
                focusNextWork.current = false
              }}>
              <HomeGraphReading person={data.person} branch={selectedBranch} item={selection.item} onNext={selectedBranch.items.length > 1 ? nextWork : undefined} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>}
    </div>
  </div>
}
