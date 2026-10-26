import type { ContentType } from '@/types/database'

export type HomeGraphMode = 'appreciations' | 'books'
export type HomeGraphBranchKey = ContentType | 'read' | 'appearance' | 'authored' | 'affiliation'

export interface HomeGraphPerson {
  id: string
  slug: string
  name: string
  avatarUrl: string | null
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
