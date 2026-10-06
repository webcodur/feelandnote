import type { CelebProfession, ContentType } from '../types'
import { CELEB_PROFESSIONS } from './celeb-professions'

export interface ExplorePresetItem<T = string> {
  value: T
  label: string // English (Main)
  sub: string   // Korean (Sub)
}

export const EXPLORE_PROFESSION_PRESETS: ExplorePresetItem<CelebProfession>[] = CELEB_PROFESSIONS
  .filter(({ value }) => value !== 'other')
  .map(({ value, label, label_en }) => ({ value, label: label_en, sub: label }))

export const EXPLORE_NATIONALITY_PRESETS: ExplorePresetItem<string>[] = [
  { value: 'KR', label: 'South Korea', sub: '대한민국' },
  { value: 'US', label: 'USA', sub: '미국' },
  { value: 'GB', label: 'UK', sub: '영국' },
  { value: 'FR', label: 'France', sub: '프랑스' },
  { value: 'DE', label: 'Germany', sub: '독일' },
]

export const EXPLORE_CONTENT_PRESETS: ExplorePresetItem<ContentType>[] = [
  { value: 'BOOK', label: 'Books', sub: '도서' },
  { value: 'VIDEO', label: 'Videos', sub: '영상' },
  { value: 'GAME', label: 'Games', sub: '게임' },
  { value: 'MUSIC', label: 'Music', sub: '음악' },
]
