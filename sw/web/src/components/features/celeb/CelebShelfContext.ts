'use client'

import { createContext, useContext } from 'react'
import type { ShelfCategoryOption } from '@/components/shared/ShelfCategoryTabs/ShelfCategoryTabs'

export const CELEB_SHELF_EXPLORE_KEYS = ['appeared', 'authored', 'profession', 'faction'] as const
export type CelebShelfExploreKey = typeof CELEB_SHELF_EXPLORE_KEYS[number]

/** 책장 모듈이 받은 인물 탐색 분류의 책 수. null은 아직 받지 않은 분류다. */
export interface CelebShelfExploreState {
  counts: Record<CelebShelfExploreKey, number | null>
  choices: ShelfCategoryOption[]
}

export interface CelebShelfControl {
  category: string
  choice?: string
  select: (key: string) => void
  selectChoice: (key: string) => void
  reportExplore: (state: CelebShelfExploreState) => void
}

export const CelebShelfContext = createContext<CelebShelfControl | null>(null)

/** 인물 상세의 통합 책장 안에서만 값이 있다. 그 밖의 화면은 각 모듈이 자체 선택기를 쓴다. */
export const useCelebShelfControl = () => useContext(CelebShelfContext)
