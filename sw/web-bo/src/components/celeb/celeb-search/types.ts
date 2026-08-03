import type { ReactNode } from 'react'

export interface CelebSearchItem {
  id?: string
  slug: string | null
  nickname: string | null
  nickname_en?: string | null
  avatar_url?: string | null
  portrait_url?: string | null
  profession?: string | null
}

export interface CelebSearchBarProps<T extends CelebSearchItem = CelebSearchItem> {
  name?: string
  placeholder?: string
  initialQuery?: string
  items?: T[]
  detailPathTemplate?: string
  maxResults?: number
  autoFocus?: boolean
  clearOnSelect?: boolean
  openOnFocus?: boolean
  className?: string
  inputClassName?: string
  emptyMessage?: string
  onSelect?: (item: T) => void
  renderSuggestionExtra?: (item: T) => ReactNode
}
