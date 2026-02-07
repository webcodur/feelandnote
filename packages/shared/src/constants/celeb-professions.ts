// 셀럽 직업 분류 상수
import type { CelebProfession } from '../types'

export interface ProfessionOption {
  value: CelebProfession
  label: string
}

export const CELEB_PROFESSIONS: readonly ProfessionOption[] = [
  { value: 'leader', label: '지도자' },
  { value: 'politician', label: '정치인' },
  { value: 'commander', label: '지휘관' },
  { value: 'entrepreneur', label: '기업가' },
  { value: 'investor', label: '투자자' },
  { value: 'scientist', label: '과학자' },
  { value: 'humanities_scholar', label: '인문학자' },
  { value: 'social_scientist', label: '사회과학자' },
  { value: 'director', label: '감독' },
  { value: 'musician', label: '음악인' },
  { value: 'visual_artist', label: '미술인' },
  { value: 'author', label: '작가' },
  { value: 'actor', label: '배우' },
  { value: 'influencer', label: '인플루엔서' },
  { value: 'athlete', label: '스포츠인' },
] as const

// 필터용 (전체 포함)
export const CELEB_PROFESSION_FILTERS = [
  { value: 'all' as const, label: '전체' },
  ...CELEB_PROFESSIONS,
] as const

// 유틸 함수
export const getCelebProfessionLabel = (value: string | null | undefined): string => {
  if (!value) return '미분류'
  const normalized = value.toLowerCase()
  const profession = CELEB_PROFESSIONS.find((p) => p.value.toLowerCase() === normalized)
  
  return profession?.label ?? value
}

export const getCelebProfession = (value: string | null | undefined): ProfessionOption | null => {
  if (!value) return null
  return CELEB_PROFESSIONS.find((p) => p.value === value) ?? null
}
