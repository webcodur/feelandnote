import type { CelebProfession, ContentType } from '../types'

export interface ExplorePresetItem<T = string> {
  value: T
  label: string // English (Main)
  sub: string   // Korean (Sub)
}

export const EXPLORE_PROFESSION_PRESETS: ExplorePresetItem<CelebProfession>[] = [
  { value: 'leader', label: 'Leader', sub: '지도자' },
  { value: 'politician', label: 'Politician', sub: '정치인' },
  { value: 'commander', label: 'Commander', sub: '지휘관' },
  { value: 'entrepreneur', label: 'Entrepreneur', sub: '기업가' },
  { value: 'investor', label: 'Investor', sub: '투자자' },
  { value: 'scientist', label: 'Scientist', sub: '과학자' },
  { value: 'humanities_scholar', label: 'Humanities', sub: '인문학자' },
  { value: 'social_scientist', label: 'Social Scientist', sub: '사회과학자' },
  { value: 'artist', label: 'Artist', sub: '예술인' },
  { value: 'author', label: 'Author', sub: '작가' },
  { value: 'actor', label: 'Actor', sub: '배우' },
  { value: 'influencer', label: 'Influencer', sub: '인플루엔서' },
  { value: 'athlete', label: 'Athlete', sub: '스포츠인' },
]

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
