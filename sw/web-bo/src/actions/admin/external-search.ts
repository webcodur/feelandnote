'use server'

import { searchExternal, type ExternalSearchResult } from '@feelandnote/content-search/unified-search'
import type { ContentType } from '@feelandnote/content-search/types'
import { createClient } from '@/lib/db/server'
import { revalidateWebContent, revalidateWebLists } from '@/lib/revalidate-web'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { withoutBookDescription } from '@feelandnote/shared/lib/book-metadata'
import { fetchBookIntroduction } from '@feelandnote/content-search/book-introduction'
import { requireAdmin } from '@/lib/admin-auth'

// 외부 API 검색
export async function searchExternalContent(
  contentType: ContentType,
  query: string,
  page: number = 1,
  options: { preferGoogle?: boolean } = {}
): Promise<{
  success: boolean
  items?: ExternalSearchResult[]
  total?: number
  hasMore?: boolean
  error?: string
}> {
  try {
    // 기본은 네이버, 필요 시 구글로 전환
    const result = await searchExternal(contentType, query, page, { preferGoogle: options.preferGoogle ?? false })
    return {
      success: true,
      items: result.items,
      total: result.total,
      hasMore: result.hasMore,
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '검색에 실패했습니다.',
    }
  }
}

// 외부 검색 결과를 DB에 콘텐츠로 등록
// Server Action 직렬화 문제를 피하기 위해 단순 객체로 받음
interface CreateContentInput {
  externalId: string
  externalSource: string
  title: string
  creator: string
  coverImageUrl: string | null
  metadata: Record<string, unknown>
}

export async function createContentFromExternal(
  input: CreateContentInput,
  contentType: ContentType
): Promise<{
  success: boolean
  contentId?: string
  error?: string
}> {
  try {
    await requireAdmin()
    const db = await createClient()

    // external_id로 기존 콘텐츠 확인
    const { data: existing } = await db
      .from('contents')
      .select('id')
      .eq('external_id', input.externalId)
      .maybeSingle()

    if (existing) {
      return { success: true, contentId: existing.id }
    }

    // ISBN 이 달라도 같은 책(제목 정규화 일치 + 저자 성 일치)이 있으면 새로 만들지 않는다.
    // 판본 없이 표시용 제목 행만 든 작품이 있어(celeb-02-02) ISBN 대조만으로는 두 벌이 생긴다. 표시행이면 이 실판본으로 덮는다.
    if (contentType === 'BOOK') {
      const sameLocale = ['kakao_book', 'aladin'].includes(input.externalSource || '') && /[가-힣]/.test(input.title ?? '') ? 'ko' : 'en'
      const head = (input.title ?? '').split(/[:：(]/)[0].trim()
      const norm = (s: string) => s.normalize('NFKC').toLowerCase().replace(/\([^)]*\)/g, ' ').split(/[:：]/)[0].replace(/^(the|a|an)\s+/, '').replace(/[^\p{L}\p{N}]+/gu, '')
      const surname = (input.creator ?? '').split(/[,/^]/)[0].trim().split(/\s+/).pop()?.toLowerCase() ?? ''
      const { data: candidates } = head
        ? await db.from('content_locales').select('content_id,title,creator,sources').eq('locale', sameLocale).ilike('title', head).limit(10)
        : { data: [] as { content_id: string; title: string | null; creator: string | null; sources: unknown }[] }
      const same = (candidates ?? []).find((row) => norm(row.title ?? '') === norm(input.title ?? '') && (!surname || !row.creator || row.creator.toLowerCase().includes(surname)))
      if (same) {
        if ((same.sources as { primary?: string } | null)?.primary === 'none') {
          const isbn = typeof input.metadata?.isbn === 'string' ? input.metadata.isbn : input.externalId
          const intro = await fetchBookIntroduction({ isbn, locale: sameLocale }).catch(() => null)
          const { error: updateError } = await db.from('content_locales').update({
            title: input.title, creator: input.creator || null, thumbnail_url: input.coverImageUrl || null, isbn,
            description: intro?.source ?? null, verified: true,
            sources: { primary: input.externalSource || 'unknown', ...(intro?.source && { description: intro.sourceUrl }) },
          }).eq('content_id', same.content_id).eq('locale', sameLocale)
          if (updateError) return { success: false, error: updateError.message }
          await revalidateWebContent(same.content_id)
        }
        return { success: true, contentId: same.content_id }
      }
    }

    // 새 콘텐츠 생성 (id 자동 생성, external_id에 외부 ID 저장)
    const { data: newContent, error } = await db
      .from('contents')
      .insert({
        type: contentType,
        external_source: input.externalSource,
        external_id: input.externalId,
        metadata: contentType === 'BOOK' ? withoutBookDescription(input.metadata || {}) : input.metadata || {},
      })
      .select('id')
      .single()

    if (error || !newContent) {
      console.error('[createContentFromExternal] Insert error:', error)
      return { success: false, error: error?.message ?? 'Insert failed' }
    }

    // content_locales에 로케일 데이터 저장
    // 카카오·알라딘은 수입 원서(영문 제목)도 돌려준다. ko 행에 넣으면 한국어 화면에 영문 제목이 나가고 언어 카드 정비가 지운다(26.09.10 실측) — 제목에 한글이 없는 BOOK 은 en 으로 담는다.
    const koreanSource = ['kakao_book', 'aladin', 'tmdb'].includes(input.externalSource || '')
    const locale = koreanSource && !(contentType === 'BOOK' && !/[가-힣]/.test(input.title ?? '')) ? 'ko' : 'en'
    const bookIsbn = contentType === 'BOOK'
      ? (typeof input.metadata?.isbn === 'string' ? input.metadata.isbn : input.externalId)
      : null
    const introduction = contentType === 'BOOK'
      ? await fetchBookIntroduction({ isbn: bookIsbn, locale }).catch(() => null)
      : null
    await db.from('content_locales').insert({
      content_id: newContent.id,
      locale,
      title: input.title,
      creator: input.creator || null,
      thumbnail_url: input.coverImageUrl || null,
      ...(contentType === 'BOOK' && { description: introduction?.source ?? null, isbn: bookIsbn }),
      sources: { primary: input.externalSource || 'unknown', ...(introduction?.source && { description: introduction.sourceUrl }) },
      verified: true,
    })

    // contents + content_locales 신규 등록 (셀럽 연결은 여기서 하지 않는다)
    // 새 작품에는 기존 상세 캐시가 없으므로 작품 목록만 갱신한다.
    await revalidateWebLists(CACHE_TAGS.CONTENTS)

    return { success: true, contentId: newContent.id }
  } catch (err) {
    console.error('[createContentFromExternal] Exception:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : '콘텐츠 생성 중 오류 발생'
    }
  }
}

// DB 내 콘텐츠 검색
export async function searchDbContent(
  query: string,
  contentType?: ContentType
): Promise<{
  success: boolean
  items?: Array<{
    id: string
    title: string
    type: string
    creator: string | null
    thumbnail_url: string | null
  }>
  error?: string
}> {
  const db = await createClient()

  // content_locales에서 검색하여 content_id 목록 추출
  const searchTerm = `%${query}%`
  const { data: matchIds } = await db
    .from('content_locales')
    .select('content_id')
    .ilike('title', searchTerm)

  if (!matchIds?.length) {
    return { success: true, items: [] }
  }

  const ids = [...new Set(matchIds.map(m => m.content_id))]

  let dbQuery = db
    .from('contents')
    .select('id, type, content_locales(locale, title, creator, thumbnail_url)')
    .in('id', ids)
    .limit(20)

  if (contentType) {
    dbQuery = dbQuery.eq('type', contentType)
  }

  const { data, error } = await dbQuery

  if (error) {
    return { success: false, error: error.message }
  }

  const items = (data || []).map((c: any) => {
    const ko = c.content_locales?.find((l: any) => l.locale === 'ko')
    const en = c.content_locales?.find((l: any) => l.locale === 'en')
    return {
      id: c.id,
      title: ko?.title || en?.title || '',
      type: c.type,
      creator: ko?.creator || en?.creator || null,
      thumbnail_url: ko?.thumbnail_url || en?.thumbnail_url || null,
    }
  })

  return { success: true, items }
}
