import type { ContentType } from '@/types/database'

export type HomeGraphMode = 'appreciations' | 'books'
export type HomePersonNavigation = (direction: -1 | 1) => void
export type HomeGraphBranchKey = ContentType | 'read' | 'appearance' | 'authored' | 'affiliation'

export interface HomeGraphPerson {
  id: string
  slug: string
  name: string
  avatarUrl: string | null
  photoUrl?: string | null
  title: string | null
}

export interface HomeGraphItem {
  id: string
  title: string
  creator: string | null
  thumbnailUrl: string | null
  type: ContentType
  text: string | null
  sourceUrl: string | null
  relatedHref?: string
  relatedLabel?: string
  relatedDescription?: string | null
  relatedGroup?: string | null
}

export interface HomeGraphBranch {
  key: HomeGraphBranchKey
  count: number
  items: HomeGraphItem[]
}

export interface HomeGraphData {
  person: HomeGraphPerson
  branches: HomeGraphBranch[]
}
