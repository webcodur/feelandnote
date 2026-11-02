'use client'

import { useCallback, useMemo } from 'react'
import { useContentBrief } from '@/components/shared/ContentReading/useContentBrief'
import { resolveContentIntroduction } from '@/components/shared/ContentReading/contentReadingData'
import type { HomeGraphBranchKey, HomeGraphData, HomeGraphItem } from './types'

export function useHomeReadingContent(data: HomeGraphData, branchKey?: HomeGraphBranchKey, item?: HomeGraphItem) {
  const appreciation = branchKey === 'read' || ['BOOK', 'MUSIC', 'VIDEO', 'GAME'].includes(branchKey ?? '')
  const reviewItem = appreciation ? item : data.branches
    .filter(branch => branch.key === 'read' || branch.key === 'BOOK')
    .flatMap(branch => branch.items).find(value => value.id === item?.id)
  const storedIntro = !appreciation ? item?.text : null
  const ids = useMemo(() => [...new Set(data.branches.flatMap(branch => branch.items).map(value => value.id))], [data])
  const activeId = item?.id ?? null
  const isActive = useCallback((id: string) => id === activeId, [activeId])
  const intro = useContentBrief(ids, ids.indexOf(activeId ?? ''), activeId, isActive, !!item)
  const introduction = resolveContentIntroduction(intro.contentId === activeId && !intro.isLoading && !intro.hasError
    ? intro.brief
    : storedIntro ? { description: storedIntro, introductionAttribution: item?.introductionAttribution } : null)
  return {
    reviewItem,
    introduction: introduction.text,
    introductionSourceUrl: introduction.sourceUrl,
  }
}
