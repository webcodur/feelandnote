'use client'

import useMediaQuery from '@/hooks/useMediaQuery'
import { useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { HomeGraphNode, HomeGraphRoot } from './HomeGraphNode'
import HomeGraphReading from './HomeGraphReading'
import HomeMediaTabs from './HomeMediaTabs'
import type { HomePersonNavigation } from './HomePersonName'
import { useHomeGraphEdges } from './useHomeGraphEdges'
import type { HomeGraphData, HomeGraphItem, HomeGraphBranch, HomeGraphBranchKey } from './types'
import styles from './HomeGraph.module.css'

export default function HomeGraph({ data, onNavigate }: { data: HomeGraphData; onNavigate?: HomePersonNavigation }) {
  const t = useTranslations('home.landing.graph')
  const id = useId()
  const [selection, setSelection] = useState<{ key: HomeGraphBranchKey; item: HomeGraphItem } | null>(null)
  const [direction, setDirection] = useState(1)
  const modesRef = useRef<HTMLDivElement>(null)
  const reduced = useMediaQuery('(prefers-reduced-motion: reduce)')
  const { ref, geometry } = useHomeGraphEdges(!selection)
  const inView = useInView(ref, { once: true, amount: .2 })
  const selectedBranch = data.branches.find(branch => branch.key === selection?.key)
  const panelId = `${id}-reading`

  function openBranch(branch: HomeGraphBranch, fromGraph = false) {
    const item = branch.items[0]
    if (!item || branch.key === selection?.key) return
    const previous = data.branches.findIndex(value => value.key === selection?.key)
    setDirection(data.branches.indexOf(branch) >= previous ? 1 : -1)
    setSelection({ key: branch.key, item })
    if (fromGraph) requestAnimationFrame(() => modesRef.current?.querySelector<HTMLButtonElement>(`[data-media-mode="${branch.key}"]`)?.focus({ preventScroll: true }))
  }

  function backToGraph() {
    const key = selection?.key
    setSelection(null)
    requestAnimationFrame(() => ref.current?.querySelector<HTMLButtonElement>(`[data-home-media="${key}"]`)?.focus({ preventScroll: true }))
  }

  return <div className={styles.container} data-home-scene="appreciations">
    <div ref={ref} className={styles.graph} data-home-graph="appreciations" data-selected={!!selection} aria-label={t('graphLabel', { name: data.person.name })}>
      {!selection && <svg className={styles.edges} viewBox={`0 0 ${geometry.width} ${geometry.height}`} aria-hidden="true">
        {geometry.paths.map((path, index) => <motion.path key={index} d={path} data-position={index} className={styles.edge}
          initial={{ pathLength: reduced ? 1 : 0 }} animate={{ pathLength: reduced || inView ? 1 : 0 }}
          transition={{ duration: reduced ? 0 : 1.5, delay: reduced ? 0 : index * .12, ease: 'easeInOut' }} />)}
      </svg>}
      <HomeGraphRoot person={data.person} onNavigate={onNavigate} />
      {!selection && <div className={styles.branches}>{data.branches.map((branch, index) => <HomeGraphNode key={branch.key}
        branch={branch} index={index} readingId={panelId} onSelect={() => openBranch(branch, true)} />)}</div>}
      {!selection && <div id={panelId} hidden />}
      {selection && selectedBranch && <div className={styles.selectedView}>
        <button type="button" className={styles.backButton} onClick={backToGraph}><ArrowLeft size={16} aria-hidden />{t('backToMedia')}</button>
        <div ref={modesRef}><HomeMediaTabs branches={data.branches} value={selection.key} panelId={panelId} onChange={openBranch} /></div>
        {selectedBranch.items.length > 1 && <div className={styles.choices} role="group" aria-label={t('chooseWork')}>
          {selectedBranch.items.map((item, index) => <button key={item.id} type="button" aria-pressed={selection.item.id === item.id}
            onClick={() => { setDirection(index >= selectedBranch.items.findIndex(value => value.id === selection.item.id) ? 1 : -1); setSelection({ key: selectedBranch.key, item }) }}>{item.title}</button>)}
        </div>}
        <div className={styles.readingPanel} id={panelId} role="tabpanel" aria-labelledby={`${panelId}-tab-${selection.key}`} tabIndex={0}>
          <AnimatePresence initial={false} mode="wait" custom={direction}>
            <motion.div key={`${selection.key}-${selection.item.id}`} custom={direction} data-media-reading={selection.key} data-work-id={selection.item.id}
              variants={{ enter: (value: number) => ({ opacity: 0, x: value * 14 }), center: { opacity: 1, x: 0 }, exit: (value: number) => ({ opacity: 0, x: -value * 14 }) }}
              initial="enter" animate="center" exit="exit" transition={{ duration: reduced ? 0 : .16 }}>
              <HomeGraphReading person={data.person} branch={selectedBranch} item={selection.item} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>}
    </div>
  </div>
}
