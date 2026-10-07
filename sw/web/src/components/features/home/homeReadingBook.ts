import type { ContentType } from '@/types/database'
import type { TitleBadge } from '@/lib/utils/content-locale'
import type { BookShelfBook } from '@/components/shared/BookShelf/types'

/** 홈에서 이미 조회한 작품·감상 자료를 공통 책장에 전달한다. 전문은 책장이 DB에서 확인한다. */
export function homeReadingBook(content: {
  id: string; type: ContentType; title: string; creator: string | null; thumbnailUrl: string | null;
  affiliateUrl?: unknown; isbn?: string | null; titleBadge?: TitleBadge | null;
}, record: {
  id: string; review: string | null; reviewEn?: string | null; sourceUrl?: string | null; isSpoiler?: boolean;
}): BookShelfBook {
  return {
    id: content.id, title: content.title, creator: content.creator, thumbnailUrl: content.thumbnailUrl,
    titleBadge: content.titleBadge, editions: [],
    readingRecord: {
      id: record.id, content_id: content.id, status: 'FINISHED', is_recommended: false,
      visibility: 'public', created_at: '', source_url: record.sourceUrl ?? null,
      content: {
        id: content.id, type: content.type, title: content.title, creator: content.creator,
        thumbnail_url: content.thumbnailUrl, metadata: null, user_count: null,
        title_ko: null, title_en: null, creator_en: null, isbn_ko: content.isbn ?? null,
        isbn_en: content.isbn ?? null, thumbnail_en: null, has_en_edition: null,
        title_badge: content.titleBadge, affiliate_url: content.affiliateUrl,
      },
      public_record: {
        rating: null, content_preview: record.review, content_preview_en: record.reviewEn ?? null,
        review_presets: null, is_spoiler: record.isSpoiler ?? false,
      },
    },
  }
}
