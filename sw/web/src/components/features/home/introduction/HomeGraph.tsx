'use client'

import { useId, useLayoutEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { PROFESSION_BOOK_CATEGORIES } from '@feelandnote/shared/constants/profession-books'
import ShelfCategoryTabs from '@/components/shared/ShelfCategoryTabs/ShelfCategoryTabs'
import { SHELF_CATEGORY_ICONS } from '@/components/shared/ShelfCategoryTabs/shelfCategoryIcons'
import { HomeGraphRoot } from './HomeGraphNode'
import HomeGraphReading from './HomeGraphReading'
import { useHomeReadingContent } from './useHomeReadingContent'
import { HOME_GRAPH_MEDIA, HOME_GRAPH_RELATIONS } from './config'
import type { HomeGraphData, HomeGraphItem, HomeGraphBranch, HomeGraphBranchKey, HomePersonNavigation } from './types'
import styles from './HomeGraph.module.css'

const BRANCH_ICONS = { ...SHELF_CATEGORY_ICONS, appearance: SHELF_CATEGORY_ICONS.appeared, affiliation: SHELF_CATEGORY_ICONS.theme }

type Selection = { key: HomeGraphBranchKey; item: HomeGraphItem; choice?: string }

/** 직군은 읽기 목적, 주제는 주제 이름이 하위 선택이다. */
const choiceOf = (branch: HomeGraphBranch, item: HomeGraphItem) => branch.key === 'profession' ? item.professionCategory
  : branch.key === 'affiliation' ? item.relatedLabel : undefined

function branchChoices(branch: HomeGraphBranch | undefined): string[] {
  if (branch?.key === 'profession') return [...PROFESSION_BOOK_CATEGORIES]
  if (branch?.key === 'affiliation') return [...new Set(branch.items.flatMap(item => item.relatedLabel ?? []))]
  return []
}

function branchItems(branch: HomeGraphBranch | undefined, choice?: string) {
  return branch && choice ? branch.items.filter(item => choiceOf(branch, item) === choice) : branch?.items ?? []
}

function firstSelection(branch: HomeGraphBranch): Selection | null {
  const choice = branchChoices(branch).find(key => branch.items.some(item => choiceOf(branch, item) === key))
  const item = branchItems(branch, choice)[0]
  return item ? { key: branch.key, item, choice } : null
}

export default function HomeGraph({ data, onNavigate }: { data: HomeGraphData; onNavigate?: HomePersonNavigation }) {
  const t = useTranslations('home.landing.graph')
  const id = useId()
  const [selection, setSelection] = useState<Selection | null>(() => {
    const branch = data.branches.find(value => value.items.length)
    return branch ? firstSelection(branch) : null
  })
  const panelRef = useRef<HTMLDivElement>(null)
  const focusWorkDirection = useRef<-1 | 1 | null>(null)
  const selectedBranch = data.branches.find(branch => branch.key === selection?.key)
  const items = branchItems(selectedBranch, selection?.choice)
  const panelId = `${id}-reading`
  const readingContent = useHomeReadingContent(data, selection?.key, selection?.item)

  useLayoutEffect(() => {
    if (!focusWorkDirection.current) return
    const panel = panelRef.current
    const selector = focusWorkDirection.current === -1 ? '[data-previous-work]' : '[data-next-work]'
    if (document.activeElement === document.body || panel?.contains(document.activeElement)) panel?.querySelector<HTMLButtonElement>(selector)?.focus({ preventScroll: true })
    focusWorkDirection.current = null
  }, [selection?.key, selection?.item.id])

  function openBranch(key: string) {
    const branch = data.branches.find(value => value.key === key)
    const next = branch && key !== selection?.key ? firstSelection(branch) : null
    if (!next) return
    focusWorkDirection.current = null
    setSelection(next)
  }

  function openChoice(choice: string) {
    const item = branchItems(selectedBranch, choice)[0]
    if (!selection || !item || choice === selection.choice) return
    setSelection({ ...selection, item, choice })
  }

  function moveWork(direction: -1 | 1) {
    if (!selection || items.length < 2) return
    const index = items.findIndex(item => item.id === selection.item.id)
    focusWorkDirection.current = direction
    setSelection({ ...selection, item: items[(index + direction + items.length) % items.length] })
  }

  const option = (key: HomeGraphBranchKey) => {
    const branch = data.branches.find(value => value.key === key)
    const label = t(`branches.${key}.title`)
    const count = branch?.items.length ?? 0
    return { key, label, icon: BRANCH_ICONS[key], count, disabled: !count, description: count ? `${label} · ${t(`branches.${key}.meaning`)}` : `${label} · ${t('emptyBranch')}` }
  }
  const direct = (HOME_GRAPH_MEDIA as readonly string[]).includes(selection?.key ?? '')
  const choiceKeys = branchChoices(selectedBranch)
  const branchChoiceRow = selectedBranch && choiceKeys.length ? {
    label: t(`branches.${selectedBranch.key}.title`), value: selection?.choice, onChange: openChoice,
    options: choiceKeys.map(key => {
      const count = branchItems(selectedBranch, key).length
      return { key, label: selectedBranch.key === 'profession' ? t(`professionChoices.${key}`) : key, count, disabled: !count }
    }),
  } : undefined

  return <div className={styles.container} data-home-scene>
    <div className={styles.graph} data-home-graph aria-label={t('graphLabel', { name: data.person.name })}>
      <HomeGraphRoot person={data.person} onNavigate={onNavigate} />
      {selection && selectedBranch && <div className={styles.selectedView}>
        <div className={styles.categories}>
          <ShelfCategoryTabs panelId={panelId} value={selection.key} onChange={openBranch} choices={branchChoiceRow} rows={[
            { key: 'direct', label: t('directRow'), icon: SHELF_CATEGORY_ICONS.direct, options: HOME_GRAPH_MEDIA.map(option) },
            { key: 'explore', label: t('exploreRow'), icon: SHELF_CATEGORY_ICONS.explore, options: HOME_GRAPH_RELATIONS.map(option) },
          ]} />
        </div>
        <div ref={panelRef} className={styles.readingPanel} id={panelId} role="tabpanel" aria-labelledby={`${panelId}-tab-${selection.key}`} tabIndex={0} data-book-relation={selection.key}>
          <div key={`${selection.key}-${selection.choice ?? ''}-${selection.item.id}`} data-media-reading={selection.key} data-work-id={selection.item.id}>
            <HomeGraphReading category={{ icon: BRANCH_ICONS[selection.key], row: t(direct ? 'directRow' : 'exploreRow'), name: t(`branches.${selection.key}.title`) }} branch={selectedBranch} items={items} item={selection.item}
              {...readingContent} onNext={items.length > 1 ? () => moveWork(1) : undefined}
              onPrevious={items.length > 1 ? () => moveWork(-1) : undefined} />
          </div>
        </div>
      </div>}
    </div>
  </div>
}
