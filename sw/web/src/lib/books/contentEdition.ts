import type { ContentDetailData } from '@/actions/contents/getContentDetail'
import type { FigureBookEdition } from '@/actions/figure-books/figureBookLocale'

export type ContentBookEdition = FigureBookEdition & { locale: 'ko' | 'en' }

function editionNumber(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^[1-9]\d*$/.test(value))) return null
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

export function getContentDetailHref(contentId: string, editionId?: number | string | null): string {
  const query = new URLSearchParams({ category: 'book' })
  const id = editionNumber(editionId)
  if (id !== null) query.set('editionId', String(id))
  return `/content/${encodeURIComponent(contentId)}?${query}`
}

/** Missing edition fields stay missing; another edition's cover, ISBN or introduction is never borrowed. */
export function applyContentBookEdition(content: ContentDetailData['content'], edition: ContentBookEdition): ContentDetailData['content'] {
  const metadata = { ...content.metadata }
  for (const field of ['isbn', 'publisher', 'link', 'description', 'coverImageUrl', 'thumbnail', 'publishDate', 'releaseDate']) delete metadata[field]
  return {
    ...content, title: edition.title, titleBadge: null, creator: edition.creator ?? undefined,
    thumbnail: edition.thumbnailUrl ?? undefined, description: edition.description ?? undefined,
    bookIntroduction: edition.bookIntroduction ?? null, introductionAttribution: edition.introductionAttribution,
    releaseDate: edition.releaseDate ?? undefined, editionLocale: edition.locale,
    metadata: { ...metadata, isbn: edition.isbn, publisher: edition.publisher },
    purchaseEditionId: edition.id,
    affiliateLinks: [
      ...(edition.platform && edition.purchaseUrl ? [{ platform: edition.platform, url: edition.purchaseUrl }] : []),
      ...(edition.affiliateLinks ?? []),
    ],
  }
}

export function selectContentBookEdition(content: ContentDetailData['content'], values: readonly string[]): {
  status: 'default' | 'selected' | 'invalid' | 'unavailable'; content: ContentDetailData['content']
} {
  if (!values.length) return { status: 'default', content }
  if (values.length !== 1 || editionNumber(values[0]) === null || content.type !== 'BOOK') return { status: 'invalid', content }
  const edition = content.bookEditions?.find(row => row.id === editionNumber(values[0]))
  return edition ? { status: 'selected', content: applyContentBookEdition(content, edition) } : { status: 'unavailable', content }
}
