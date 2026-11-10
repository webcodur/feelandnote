import type { UserContentPublic } from '@/actions/contents/getUserContents'
import type { FigureBookContent } from '@/actions/figure-books/getFigureBooks'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'
import type { HomeGraphItem } from '@/components/features/home/introduction/types'
import { resolveAppreciationText } from '@/components/shared/ContentReading/contentReadingData'

export function homeAppreciationItem(row: UserContentPublic, locale: string): HomeGraphItem {
  const review = resolveAppreciationText(locale, row.public_record?.content_preview, row.public_record?.content_preview_en)
  return {
    id: row.content_id,
    title: row.content.title,
    creator: row.content.creator,
    thumbnailUrl: row.content.thumbnail_url,
    type: row.content.type,
    text: row.public_record?.is_spoiler ? null : review.text,
    originalLanguage: review.originalLanguage,
    sourceUrl: row.source_url,
  }
}

export function homeFigureBookItem(book: FigureBookContent): HomeGraphItem {
  const edition = book.editions[0]
  return {
    id: book.id,
    title: edition?.title ?? book.title,
    creator: edition?.creator ?? book.creator,
    thumbnailUrl: edition?.thumbnailUrl ?? book.thumbnailUrl,
    type: 'BOOK',
    text: edition?.description ?? book.description ?? null,
    sourceUrl: null,
    introductionAttribution: edition?.introductionAttribution ?? book.introductionAttribution,
  }
}

export function homeAffiliationBookItem(book: AffiliateBook, slug: string, name: string, context?: { description?: string | null; group?: string | null }): HomeGraphItem {
  return {
    id: book.contentId,
    title: book.title,
    creator: book.creator ?? null,
    thumbnailUrl: book.thumbnail ?? null,
    type: 'BOOK',
    text: book.description ?? null,
    sourceUrl: null,
    relatedHref: `/explore/faction/${slug}`,
    relatedLabel: name,
    relatedDescription: context?.description,
    relatedGroup: context?.group,
  }
}

export function homeProfessionBookItem(book: AffiliateBook): HomeGraphItem {
  return {
    id: book.contentId,
    title: book.title,
    creator: book.creator ?? null,
    thumbnailUrl: book.thumbnail ?? null,
    type: 'BOOK',
    text: book.description ?? null,
    sourceUrl: null,
    relatedDescription: book.selectionReason,
    professionCategory: book.professionCategory,
  }
}

export function uniqueHomeGraphItems(items: HomeGraphItem[]): HomeGraphItem[] {
  return [...new Map(items.map(item => [item.id, item])).values()]
}
