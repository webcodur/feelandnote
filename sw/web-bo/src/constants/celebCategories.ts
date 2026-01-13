export const CELEB_PROFESSIONS = [
  { value: 'leader', label: '지도자' },
  { value: 'politician', label: '정치인' },
  { value: 'commander', label: '지휘관' },
  { value: 'entrepreneur', label: '기업가' },
  { value: 'investor', label: '투자자' },
  { value: 'scholar', label: '학자' },
  { value: 'artist', label: '예술인' },
  { value: 'author', label: '작가' },
  { value: 'actor', label: '배우' },
  { value: 'influencer', label: '인플루엔서' },
  { value: 'athlete', label: '스포츠인' },
] as const

export type CelebProfession = (typeof CELEB_PROFESSIONS)[number]['value']

export const getCelebProfessionLabel = (value: string | null): string => {
  if (!value) return '미분류'
  const profession = CELEB_PROFESSIONS.find((p) => p.value === value)
  return profession?.label ?? value
}

// 하위 호환성을 위한 별칭 (deprecated)
/** @deprecated CELEB_PROFESSIONS 사용 */
export const CELEB_CATEGORIES = CELEB_PROFESSIONS
/** @deprecated getCelebProfessionLabel 사용 */
export const getCelebCategoryLabel = getCelebProfessionLabel
