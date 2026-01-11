export const CELEB_CATEGORIES = [
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

export type CelebCategory = (typeof CELEB_CATEGORIES)[number]['value']

export const getCelebCategoryLabel = (value: string | null): string => {
  if (!value) return '미분류'
  const category = CELEB_CATEGORIES.find((c) => c.value === value)
  return category?.label ?? value
}
