// 셀럽 직업 분류 상수
import type { CelebProfession } from '../types'

export interface ProfessionOption {
  value: CelebProfession
  label: string
  label_en: string
}

export const CELEB_PROFESSIONS: readonly ProfessionOption[] = [
  { value: 'leader', label: '지도자', label_en: 'Leader' },
  { value: 'politician', label: '정치인', label_en: 'Politician' },
  { value: 'commander', label: '지휘관', label_en: 'Commander' },
  { value: 'entrepreneur', label: '기업가', label_en: 'Entrepreneur' },
  { value: 'investor', label: '투자자', label_en: 'Investor' },
  { value: 'scientist', label: '과학자', label_en: 'Scientist' },
  { value: 'humanities_scholar', label: '인문학자', label_en: 'Humanities Scholar' },
  { value: 'social_scientist', label: '사회과학자', label_en: 'Social Scientist' },
  { value: 'director', label: '감독', label_en: 'Director' },
  { value: 'musician', label: '음악인', label_en: 'Musician' },
  { value: 'visual_artist', label: '미술인', label_en: 'Visual Artist' },
  { value: 'author', label: '작가', label_en: 'Author' },
  { value: 'actor', label: '배우', label_en: 'Actor' },
  { value: 'influencer', label: '인플루엔서', label_en: 'Influencer' },
  { value: 'athlete', label: '스포츠인', label_en: 'Athlete' },
] as const

// 필터용 (전체 포함)
export const CELEB_PROFESSION_FILTERS = [
  { value: 'all' as const, label: '전체', label_en: 'All' },
  ...CELEB_PROFESSIONS,
] as const

// 유틸 함수
export const getCelebProfessionLabel = (value: string | null | undefined, locale?: string): string => {
  if (!value) return locale === 'en' ? 'Uncategorized' : '미분류'
  const normalized = value.toLowerCase()
  const profession = CELEB_PROFESSIONS.find((p) => p.value.toLowerCase() === normalized)
  if (!profession) return value
  return locale === 'en' ? profession.label_en : profession.label
}

export const getCelebProfession = (value: string | null | undefined): ProfessionOption | null => {
  if (!value) return null
  return CELEB_PROFESSIONS.find((p) => p.value === value) ?? null
}
