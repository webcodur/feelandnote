'use server'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import type { ProfessionBookCategory } from '@feelandnote/shared/constants/profession-books'
import { selectInChunks } from '@feelandnote/shared/lib/paginate'
import { loadFigureBookEditions } from '@/actions/figure-books/figureBookEditions'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'
import { resolveBookShelfBook } from '@/lib/books/bookShelf'
import { cachedList, throwOnQueryError } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { CL_SELECT_LIST_WITH_AFFILIATE, type ContentLocaleRow } from '@/lib/utils/content-locale'

/** 직군별 선정 목록. 해당 인물의 감상·등장 관계를 새로 만들지 않는다. */
export async function getProfessionBooks(profession: string, locale: string): Promise<AffiliateBook[]> {
  const language = locale === 'en' ? 'en' : 'ko'
  return cachedList(CACHE_TAGS.CONTENTS, ['profession-book-picks-db-v4-foundations', profession, language], async () => {
    const db = createStaticClient()
    const { data, error } = await db.from('profession_book_picks')
      .select('category,content_id,note,note_en,source_url').eq('profession', profession)
      .order('sort_order').order('category').order('content_id')
      .overrideTypes<{ category: ProfessionBookCategory; content_id: string; note: string; note_en: string; source_url: string }[], { merge: false }>()
    throwOnQueryError('직업 선정 도서 조회', error)
    const picks = data ?? []
    if (!picks.length) return []
    const ids = [...new Set(picks.map((pick) => pick.content_id))]
    const [contents, editions] = await Promise.all([
      selectInChunks<{ id: string; type: string; content_locales: ContentLocaleRow[] | null }>(ids, (chunk) => db.from('contents')
        .select(`id,type,content_locales(${CL_SELECT_LIST_WITH_AFFILIATE},isbn)`)
        .in('id', chunk)
        .overrideTypes<{ id: string; type: string; content_locales: ContentLocaleRow[] | null }[], { merge: false }>()),
      loadFigureBookEditions(db, ids, language),
    ])
    const byId = new Map(contents.map((content) => [content.id, content]))
    return picks.flatMap((pick): AffiliateBook[] => {
      const content = byId.get(pick.content_id)
      if (!content) return []
      const book = resolveBookShelfBook(content, editions.get(content.id) ?? [], language, undefined, !editions.has(content.id))
      return book ? [{ ...book, professionCategory: pick.category,
        selectionReason: language === 'en' ? pick.note_en : pick.note, selectionSourceUrl: pick.source_url }] : []
    })
  }, { extraTags: [CACHE_TAGS.FIGURE_BOOKS] })
}
