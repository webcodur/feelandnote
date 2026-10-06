'use server'

import { cache } from 'react'
import { compressedJsonCache } from '@/lib/compressedJsonCache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { PAGINATION_QUERY_CONCURRENCY, selectAllPages, selectInChunks } from '@feelandnote/shared/lib/paginate'
import { createStaticClient } from '@/lib/db/static'
import { cachedDetail, cachedList, STATIC_REVALIDATE, throwOnQueryError } from '@/lib/cache'
import { loadFigureBookEditions } from '@/actions/figure-books/figureBookEditions'
import { getEnglishBookAmazonUrl } from '@/lib/books/amazonBookSearch'
import { normalizePurchaseIsbn } from '@/lib/books/yes24Purchase'
import { isDisplayTitleRow } from '@/lib/utils/content-locale'
import { resolveBookShelfBook } from '@/lib/books/bookShelf'
import type { ContentLocaleRow } from '@/lib/utils/content-locale'
import { findAffiliateLink } from './affiliateLinks'
import {
  RECOMMENDATION_EXCLUDED_IDS,
} from '@/constants/affiliateBookPicks'

export interface AffiliateBook {
  contentId: string
  /** 직군 선정 도서의 목적과 편집 사유. 감상자 기록과는 별개다. */
  professionCategory?: 'become' | 'about'
  selectionReason?: string
  selectionSourceUrl?: string
  editionId?: number
  /** 직군 추천을 만든 실제 감상자 ID. */
  readerIds?: string[]
  title: string
  creator?: string
  thumbnail?: string
  /** 한국어는 같은 판본의 쿠팡 보조 링크(없으면 빈 문자열), 영어는 아마존 주소(상품 또는 검색) */
  url: string
  /** 확인된 언어판이 없거나 절판인 책 — 표지 한가운데 띠로 표시한다 */
  titleBadge?: import('@/lib/utils/content-locale').TitleBadge | null
  /** 순위 차트에서 카드 위에 붙는 순위 */
  rank?: number
  /** 우리 작품이 아닌 외부 차트 항목 — 표지·YES24 단추가 이 주소를 곧바로 연다(제휴 주소 우선) */
  purchaseHref?: string
  /** 외부 차트 항목의 상품 ISBN — 우리 작품 ID가 없어 판매 정보를 이 값으로 곧바로 조회한다 */
  isbn?: string
  /** 외부 차트 항목이 이미 가진 소개문·서지 — 우리 DB에 없어 카드의 소개 모달이 이 값을 바로 띄운다 */
  description?: string | null
  metadata?: import('@/types/content').ContentMetadata | null
}

/** 인물 화면에서 이 목록을 무엇으로 골랐는지 — 안내 문구를 갈아끼우는 데 쓴다. */
export type AffiliateBookSource = 'origin' | 'read' | 'profession' | 'popular' | 'mixed'

/** 책 상품 목록의 언어 — 한국어는 YES24, 영어는 아마존이 기준이다 */
export type AffiliateBookLocale = 'ko' | 'en'

interface LocaleRow {
  content_id: string
  title: string | null
  creator: string | null
  thumbnail_url: string | null
  isbn: string | null
  affiliate_url: unknown
  /** 표시용 제목 행 판정에 쓴다 — 그 언어 판본이 없는 책은 서점으로 잇지 않는다 */
  sources: unknown
  contents: { user_count: number | null } | null
}

interface PoolEntry {
  book: AffiliateBook
  userCount: number
  /** 요즘 사람 몇 명이 읽었는지 — 앞자리를 정하는 첫째 기준 */
  modernCount: number
}

interface SourceContentCountRow {
  content_id: string
  contents: { record_count: number | null; content_locales: ContentLocaleRow[] | null } | null
}

/**
 * 이 날짜 뒤에 태어난 인물을 "요즘 사람"으로 본다.
 * 기록자 수만으로 줄을 세우면 등재 인물 절대다수가 옛사람이라 논어·시경·일리아스가 영원히 앞자리를 차지한다.
 * 지금 실제로 팔리는 책은 현역 인물이 읽은 쪽이다 — 사피엔스·듄·제로 투 원.
 */
const MODERN_BORN_FROM = '1950-01-01'

/** 인물·직군의 실제 감상 작품에만 판본과 판매처를 붙인다. */
async function fetchAffiliatePool(locale: AffiliateBookLocale, contentIds: string[]): Promise<PoolEntry[]> {
  if (contentIds.length === 0) return []
  const db = createStaticClient()
  const bookSelect = 'content_id, title, creator, thumbnail_url, isbn, affiliate_url, sources, contents!inner(user_count:record_count, type)'
  const ids = [...new Set(contentIds)].filter(id => !RECOMMENDATION_EXCLUDED_IDS.includes(id))
  const [sourceRows, rows] = await Promise.all([
    selectInChunks<SourceContentCountRow>(ids, chunk => db.from('figure_book_contents')
      .select('content_id,contents!inner(record_count,content_locales(locale,title,creator,thumbnail_url,isbn,affiliate_url,sources))')
      .in('content_id', chunk).order('content_id').overrideTypes<SourceContentCountRow[], { merge: false }>()),
    selectInChunks<LocaleRow>(ids, chunk => db.from('content_locales').select(bookSelect)
      .eq('locale', locale).eq('contents.type', 'BOOK').in('content_id', chunk)
      .overrideTypes<LocaleRow[], { merge: false }>()),
  ])
  return buildAffiliatePool(locale, sourceRows, rows)
}

async function buildAffiliatePool(locale: AffiliateBookLocale, sourceRows: SourceContentCountRow[], rows: LocaleRow[]): Promise<PoolEntry[]> {
  const db = createStaticClient()

  const pool: PoolEntry[] = []
  const seen = new Set<string>(RECOMMENDATION_EXCLUDED_IDS)
  const sourceIds = new Set(sourceRows.map((row) => row.content_id))
  const sourceCountById = new Map(sourceRows.map((row) => [
    row.content_id,
    row.contents?.record_count ?? 0,
  ]))
  const sourceLocalesById = new Map(sourceRows.map((row) => [row.content_id, row.contents?.content_locales ?? []]))

  // 원전 작품 — 작품마다 대표 판본 하나만 쓴다. 인물 원전 책장에서는 모든 판본을 보여준다.
  const editionsByContent = await loadFigureBookEditions(db, [...sourceIds], locale)
  for (const [contentId, editions] of editionsByContent) {
    if (seen.has(contentId)) continue
    const book = resolveBookShelfBook({ id: contentId, type: 'BOOK', content_locales: sourceLocalesById.get(contentId) ?? [] }, editions, locale)
    if (!book) continue
    // 한국어는 ISBN이나 쿠팡 상품 중 하나는 있어야 서점 상품으로 잇는다
    if (locale === 'ko' ? !normalizePurchaseIsbn(book.isbn) && !book.url : !book.url) continue
    seen.add(contentId)
    pool.push({
      book,
      userCount: sourceCountById.get(contentId) ?? 0,
      modernCount: 0,
    })
  }

  for (const row of rows) {
    // 절판은 제휴 링크 유무와 무관하게 후보에서 뺀다.
    const outOfPrint = (row.sources as { availability?: unknown } | null | undefined)?.availability === 'out_of_print'
    if (seen.has(row.content_id) || sourceIds.has(row.content_id) || !row.title || isDisplayTitleRow(row.sources) || outOfPrint) continue
    const url = locale === 'en'
      ? getEnglishBookAmazonUrl({ title: row.title, creator: row.creator, url: findAffiliateLink(row.affiliate_url, 'amazon')?.url })
      : findAffiliateLink(row.affiliate_url, 'coupang')?.url ?? ''
    if (locale === 'ko' ? !normalizePurchaseIsbn(row.isbn) && !url : !url) continue
    seen.add(row.content_id)
    pool.push({
      book: {
        contentId: row.content_id,
        title: row.title,
        creator: row.creator ?? undefined,
        thumbnail: row.thumbnail_url ?? undefined,
        url,
      },
      userCount: row.contents?.user_count ?? 0,
      modernCount: 0,
    })
  }

  const support = await countModernReaders(pool.map((p) => p.book.contentId))
  for (const entry of pool) entry.modernCount = support.get(entry.book.contentId) ?? 0

  // 요즘 사람이 많이 읽은 책이 먼저, 같으면 기록자 수로 가른다
  return pool.sort((a, b) => b.modernCount - a.modernCount || b.userCount - a.userCount)
}

/**
 * 링크가 걸린 책마다 현역 인물 몇 명이 읽었는지 센다.
 *
 * 옛사람이 압도적으로 많은 명단에서 기록자 수만 보면 고전 원전이 상단을 독점한다.
 * 이 값을 첫째 기준으로 두면 같은 자료에서 지금 팔리는 책이 앞으로 나온다.
 */
async function countModernReaders(contentIds: string[]): Promise<Map<string, number>> {
  const db = createStaticClient()
  const counts = new Map<string, number>()
  if (contentIds.length === 0) return counts

  // 1950년 이후 출생 활성 인물이 1,600명을 넘는다. .limit(2000)을 걸어도 1,000명에서 잘려 현역 독자 수가 모자랐다 — 나눠 받는다
  let modernIds = new Set<string>()
  try {
    const modern = await selectAllPages<{ id: string }>((from, to) => db
      .from('celebs')
      .select('id')
      .eq('publication_status', 'active')
      .gte('birth_date', MODERN_BORN_FROM)
      .order('id', { ascending: true })
      .range(from, to))
    modernIds = new Set(modern.map((c) => c.id))
  } catch (celebError) {
    console.error('[getAffiliateBooks] 현역 인물 조회 실패:', celebError)
    return counts
  }
  if (modernIds.size === 0) return counts

  // 한 번에 다 물으면 요청 주소가 길어져 거부당한다 — 나눠 묻고, 묶음마다 끝까지 받는다
  // URL 길이는 제한하되 서로 독립인 묶음 여섯 개까지 함께 읽는다.
  const chunks: string[][] = []
  for (let i = 0; i < contentIds.length; i += 60) chunks.push(contentIds.slice(i, i + 60))
  for (let i = 0; i < chunks.length; i += PAGINATION_QUERY_CONCURRENCY) {
    let data: { content_id: string; celeb_id: string }[] = []
    try {
      data = (await Promise.all(chunks.slice(i, i + PAGINATION_QUERY_CONCURRENCY).map(chunk => selectAllPages<{ content_id: string; celeb_id: string }>((from, to) => db
        .from('celeb_contents')
        .select('content_id, celeb_id')
        .in('content_id', chunk)
        .order('id', { ascending: true })
        .range(from, to))))).flat()
    } catch (error) {
      console.error('[getAffiliateBooks] 현역 인물 기록 조회 실패:', error)
      return counts
    }

    for (const row of data) {
      if (!modernIds.has(row.celeb_id as string)) continue
      const id = row.content_id as string
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }

  return counts
}

const fetchScopedAffiliatePoolCached = compressedJsonCache(fetchAffiliatePool, ['affiliate-pool-scoped-v1'], {
  revalidate: STATIC_REVALIDATE,
  tags: [CACHE_TAGS.CONTENTS, CACHE_TAGS.FIGURE_BOOKS, CACHE_TAGS.CELEBS],
})

/** 그 인물이 실제로 남긴 기록 중 링크가 걸린 것을 고른다. */
async function fetchReadByCeleb(celebId: string): Promise<Set<string>> {
  const db = createStaticClient()
  const { data, error } = await db
    .from('celeb_contents')
    .select('content_id')
    .eq('celeb_id', celebId)
    .limit(1000)

  throwOnQueryError('getAffiliateBooks/celeb-read', error)
  return new Set((data ?? []).map((r) => r.content_id as string))
}

/** 같은 직군 인물들이 남긴 기록. 이름난 인물부터 훑어 대표성이 있는 쪽으로 모은다. */
async function fetchReadByProfession(celebId: string): Promise<Set<string>> {
  const db = createStaticClient()

  const { data: me, error: professionError } = await db
    .from('celebs')
    .select('profession')
    .eq('id', celebId)
    .maybeSingle()
  throwOnQueryError('getAffiliateBooks/profession', professionError)
  const profession = me?.profession
  if (!profession) return new Set()

  return fetchReadIdsByProfession(profession, new Set([celebId]))
}

/** 직군 값으로 바로 묻는 변형 — 세력 선반의 「직군」 탭처럼 인물이 아니라 직군이 기준이 되는 자리가 쓴다. */
async function fetchReadIdsByProfession(profession: string, excludeCelebIds: ReadonlySet<string>): Promise<Set<string>> {
  return new Set((await fetchReadersByProfession(profession, excludeCelebIds)).keys())
}

async function fetchProfessionReaders(profession: string): Promise<{ content_id: string; celeb_id: string }[]> {
  const db = createStaticClient()

  const { data: peers, error: peersError } = await db
    .from('celebs')
    .select('id')
    .eq('profession', profession)
    .eq('publication_status', 'active')
    .order('view_count', { ascending: false })
    .limit(60)

  throwOnQueryError('getAffiliateBooks/profession-peers', peersError)
  const peerIds = (peers ?? []).map((p) => p.id as string)
  if (peerIds.length === 0) return []

  return selectAllPages<{ content_id: string; celeb_id: string }>((from, to) => db
    .from('celeb_contents')
    .select('content_id,celeb_id')
    .eq('visibility', 'public')
    .in('celeb_id', peerIds)
    .order('id').range(from, to))
}

async function fetchReadersByProfession(profession: string, excludeCelebIds: ReadonlySet<string>): Promise<Map<string, string[]>> {
  const data = await cachedList(CACHE_TAGS.CONTENTS, ['profession-readers-v1', profession],
    () => fetchProfessionReaders(profession), { extraTags: [CACHE_TAGS.CELEBS] })
  const readers = new Map<string, string[]>()
  for (const row of data) {
    if (!excludeCelebIds.has(row.celeb_id)) readers.set(row.content_id, [...(readers.get(row.content_id) ?? []), row.celeb_id])
  }
  return readers
}

/** 신화·서사 인물이 등장하는 원전. 이들은 책을 읽은 기록이 없고 대신 자기가 나오는 작품이 있다. */
async function fetchOriginWorks(celebId: string): Promise<Set<string>> {
  const db = createStaticClient()
  const { data, error } = await db
    .from('figure_book_characters')
    .select('content_id')
    .eq('celeb_id', celebId)
    .eq('relation_type', 'appearance')
    .limit(50)

  throwOnQueryError('getAffiliateBooks/origin', error)
  return new Set((data ?? []).map((r) => r.content_id as string))
}

export interface AffiliateBookGroup {
  source: Exclude<AffiliateBookSource, 'mixed'>
  count: number
}

async function fetchAffiliateBooksForCeleb(
  sources: { origins: Set<string>; read: Set<string>; peers: Set<string> },
  limit: number,
  pool: PoolEntry[],
  excludeIds?: ReadonlySet<string>,
): Promise<{ books: AffiliateBook[]; groups: AffiliateBookGroup[]; source: AffiliateBookSource }> {
  if (pool.length === 0) return { books: [], groups: [], source: 'popular' }

  // 소스를 한 층만 쓰지 않고 순서대로 섞어 채운다 — 읽은 책 한 권이면 한 칸만 차고 끝나던 방식이었다.
  // 인기 풀백은 쓰지 않는다 — 직군 기록마저 없으면 빈 채로 둔다.
  const { origins, read, peers } = sources

  const seen = new Set<string>()
  const picked: PoolEntry[] = []
  const groups: AffiliateBookGroup[] = []
  const take = (ids: Set<string>, source: Exclude<AffiliateBookSource, 'mixed'>) => {
    let count = 0
    for (const p of pool) {
      if (picked.length >= limit) break
      // 이미 다른 모드가 보여 주는 책(excludeIds)은 칸을 차지하기 전에 건너뛴다 —
      // 나중에 화면에서 걸러내면 채운 칸이 통째로 빠진다
      if (seen.has(p.book.contentId) || excludeIds?.has(p.book.contentId) || !ids.has(p.book.contentId)) continue
      seen.add(p.book.contentId)
      picked.push(p)
      count += 1
    }
    if (count > 0) groups.push({ source, count })
  }
  take(origins, 'origin')
  take(read, 'read')
  take(peers, 'profession')

  // 한 소스만 들어왔으면 그 소스 이름을, 섞였으면 중립 표기를 돌려준다.
  const source: AffiliateBookSource = groups.length === 1 ? groups[0].source : 'mixed'
  return { books: picked.map((v) => v.book), groups, source }
}

/* unstable_cache 콜백 안에서 부른 unstable_cache는 안쪽 캐시를 읽지 않고 매번 다시 만든다
   (26.09.10 실측 — 풀을 인물 캐시 안에서 읽자 인물마다 풀 전량 재조회로 2.5~3초, 인물 상세 콜드 10초대).
   풀은 반드시 바깥에서 읽어 콜백에 넘긴다. 아래 태그 조회도 같다. */
/** 제외 목록을 캐시 키에 얹는 짧은 지문 — 같은 목록이면 순서와 무관하게 같은 값 */
function exclusionFingerprint(ids: readonly string[]): string {
  const joined = [...ids].sort().join(',')
  let hash = 5381
  for (let i = 0; i < joined.length; i += 1) hash = ((hash << 5) + hash + joined.charCodeAt(i)) >>> 0
  return hash.toString(36)
}

async function getAffiliateBooksForCelebInner(
  celebId: string,
  locale: AffiliateBookLocale = 'ko',
  limit = 6,
  excludeIds?: readonly string[],
): Promise<{ books: AffiliateBook[]; groups: AffiliateBookGroup[]; source: AffiliateBookSource }> {
  const [origins, read, peers] = await Promise.all([
    fetchOriginWorks(celebId), fetchReadByCeleb(celebId), fetchReadByProfession(celebId),
  ])
  const pool = await fetchScopedAffiliatePoolCached(locale, [...new Set([...origins, ...read, ...peers])].sort())
  const excluded = excludeIds?.length ? new Set(excludeIds) : undefined
  return cachedDetail(
    CACHE_TAGS.CELEBS,
    celebId,
    ['affiliate-books-celeb-v8-scoped', celebId, locale, String(limit), excluded ? exclusionFingerprint([...excluded]) : ''],
    () => fetchAffiliateBooksForCeleb({ origins, read, peers }, limit, pool, excluded),
    // 수명은 기본값(1주)을 쓴다. 위 풀과 같은 이유다 — 인물 상세 초기 렌더가 이 결과를
    // 쓰므로 짧게 두면 페이지 한 장의 수명이 함께 내려간다. 상품이 바뀌면 아래 태그로 비워진다.
    { extraTags: [CACHE_TAGS.CONTENTS, CACHE_TAGS.FIGURE_BOOKS] },
  )
}

// 인물 상세는 서가 우선순위와 하단 상품 구획이 같은 요청에서 두 번 부른다 — 요청 안에서 한 번만 돈다.
export const getAffiliateBooksForCeleb = cache(getAffiliateBooksForCelebInner)

/**
 * 세력 선반의 「직군」 탭 — 구성원 최다 직군의 동료 인물들이 남긴 기록을 판매 풀에서 고른다.
 * 개인 페이지 추천 층의 profession 소스와 같은 정의다. 구성원 본인은 동료에서 빼고,
 * 다른 탭(주제·등장·감상·집필)이 이미 보여 주는 책도 뺀다.
 */
export async function getProfessionPeerBooks(
  profession: string,
  locale: AffiliateBookLocale,
  excludeCelebIds: readonly string[],
  excludeIds: ReadonlySet<string>,
  limit = 24,
): Promise<AffiliateBook[]> {
  const readers = await fetchReadersByProfession(profession, new Set(excludeCelebIds))
  const pool = await fetchScopedAffiliatePoolCached(locale, [...readers.keys()].sort())
  if (pool.length === 0) return []
  const seen = new Set<string>(excludeIds)
  const books: AffiliateBook[] = []
  for (const p of pool) {
    if (books.length >= limit) break
    if (seen.has(p.book.contentId) || !readers.has(p.book.contentId)) continue
    seen.add(p.book.contentId)
    books.push({ ...p.book, readerIds: readers.get(p.book.contentId) })
  }
  return books
}
