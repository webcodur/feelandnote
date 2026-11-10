import type { ContentType } from '@/types/database'
import type { BookIntroductionAttribution } from '@/lib/utils/book-description'
import type { ProfessionBookCategory } from '@feelandnote/shared/constants/profession-books'
import type { HOME_GRAPH_RELATIONS } from './config'

export type HomePersonNavigation = (direction: -1 | 1) => void
export type HomeGraphBranchKey = ContentType | typeof HOME_GRAPH_RELATIONS[number]

export interface HomeGraphPerson {
  id: string
  slug: string
  name: string
  avatarUrl: string | null
  photoUrl?: string | null
  title: string | null
  nationality?: string | null
}

export interface HomeGraphItem {
  id: string
  title: string
  creator: string | null
  thumbnailUrl: string | null
  type: ContentType
  text: string | null
  sourceUrl: string | null
  introductionAttribution?: BookIntroductionAttribution | null
  originalLanguage?: boolean
  relatedHref?: string
  relatedLabel?: string
  relatedDescription?: string | null
  relatedGroup?: string | null
  professionCategory?: ProfessionBookCategory
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
