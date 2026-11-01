'use client'

import { useCallback, useMemo } from 'react'
import { useContentBrief } from '@/components/features/user/contentLibrary/expand/useContentBrief'
import { resolveContentIntroFullText } from '@/components/features/user/contentLibrary/expand/contentIntroText'
import type { HomeGraphBranchKey, HomeGraphData, HomeGraphItem } from './types'

export function useHomeReadingContent(data: HomeGraphData, branchKey?: HomeGraphBranchKey, item?: HomeGraphItem) {
  const appreciation = branchKey === 'read' || ['BOOK', 'MUSIC', 'VIDEO', 'GAME'].includes(branchKey ?? '')
  const reviewItem = appreciation ? item : data.branches
    .filter(branch => branch.key === 'read' || branch.key === 'BOOK')
    .flatMap(branch => branch.items).find(value => value.id === item?.id)
  const storedIntro = !appreciation ? item?.text : null
  const ids = useMemo(() => [...new Set(data.branches.flatMap(branch => branch.items)
    .filter(value => value.type === 'BOOK').map(value => value.id))], [data])
  const activeId = item?.id ?? null
  const isActive = useCallback((id: string) => id === activeId, [activeId])
  const intro = useContentBrief(ids, ids.indexOf(activeId ?? ''), activeId, isActive, item?.type === 'BOOK' && !storedIntro)
  return {
    reviewItem,
    introduction: storedIntro || (intro.contentId === activeId ? resolveContentIntroFullText(intro.brief) : null),
  }
}
