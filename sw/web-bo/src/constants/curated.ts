export const CURATOR_KIND_OPTIONS = [
  { value: 'university', label: '대학·교육기관' },
  { value: 'media', label: '언론·미디어' },
  { value: 'award', label: '시상 기관' },
  { value: 'organization', label: '기관·단체' },
  { value: 'community', label: '커뮤니티·투표' },
  { value: 'bookstore', label: '서점' },
  { value: 'library', label: '도서관' },
  { value: 'festival', label: '페스티벌' },
] as const

export const CURATOR_KINDS = CURATOR_KIND_OPTIONS.map((option) => option.value)

export function curatorKindLabel(kind: string): string {
  return CURATOR_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? kind
}
