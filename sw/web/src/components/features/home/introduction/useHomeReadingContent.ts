'use client'

import { useCallback, useMemo } from 'react'
import { useContentBrief } from '@/components/shared/ContentReading/useContentBrief'
import { resolveContentIntroduction } from '@/components/shared/ContentReading/contentReadingData'
import { HOME_GRAPH_MEDIA } from './config'
import type { HomeGraphBranchKey, HomeGraphData, HomeGraphItem } from './types'

export function useHomeReadingContent(data: HomeGraphData, branchKey?: HomeGraphBranchKey, item?: HomeGraphItem) {
  const appreciation = (HOME_GRAPH_MEDIA as readonly string[]).includes(branchKey ?? '')
  // 인물 탐색의 책도 그 인물이 직접 감상했으면 감상 배경을 함께 보여준다.
  const reviewItem = appreciation ? item : data.branches.find(branch => branch.key === 'BOOK')?.items.find(value => value.id === item?.id)
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
