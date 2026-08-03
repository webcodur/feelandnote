import { getCelebProfessionLabel } from '@/constants/celebCategories'
import type { CelebSearchItem } from './types'

function normalize(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase()
}

export function matchesCelebQuery(item: CelebSearchItem, query: string): boolean {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return true

  return [item.nickname, item.nickname_en, item.slug]
    .some((value) => normalize(value).includes(normalizedQuery))
}

export function getCelebSecondaryText(item: CelebSearchItem): string {
  const parts: string[] = []
  if (item.slug) parts.push(item.slug)
  if (item.profession) parts.push(getCelebProfessionLabel(item.profession))
  return parts.length > 0 ? parts.join(' / ') : item.nickname_en || ''
}

export function buildCelebDetailHref(slug: string, template: string): string {
  const encodedSlug = encodeURIComponent(slug)
  return template.includes('[slug]')
    ? template.replace('[slug]', encodedSlug)
    : `${template.replace(/\/$/, '')}/${encodedSlug}`
}
