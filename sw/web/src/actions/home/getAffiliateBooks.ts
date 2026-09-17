'use server'

import { cache } from 'react'
import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { createStaticClient } from '@/lib/db/static'
import { cachedDetail, STATIC_REVALIDATE, throwOnQueryError } from '@/lib/cache'
import { loadFigureBookEditions } from '@/actions/figure-books/figureBookEditions'
import { pickPurchaseEdition } from '@/actions/figure-books/figureBookLocale'
import { getEnglishBookAmazonUrl } from '@/lib/books/amazonBookSearch'
import { normalizePurchaseIsbn } from '@/lib/books/yes24Purchase'
import { isDisplayTitleRow } from '@/lib/utils/content-locale'
import { findAffiliateLink } from './affiliateLinks'
import {
  BESTSELLER_CONTENT_IDS,
  BESTSELLER_MAX_SLOTS,
  RECOMMENDATION_EXCLUDED_IDS,
} from '@/constants/affiliateBookPicks'

export interface AffiliateBook {
  contentId: string
  editionId?: number
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

/** 기록이 많은 책을 작품 쪽에서 정렬해 받는 행 — 언어판은 요청 언어 하나만 붙는다 */
interface PopularContentRow {
  record_count: number | null
  content_locales: Omit<LocaleRow, 'contents'>[] | null
}

interface PoolEntry {
  book: AffiliateBook
  userCount: number
  /** 요즘 사람 몇 명이 읽었는지 — 앞자리를 정하는 첫째 기준 */
  modernCount: number
}

interface SourceContentCountRow {
  content_id: string
  contents: { record_count: number | null } | null
}

/**
 * 이 날짜 뒤에 태어난 인물을 "요즘 사람"으로 본다.
 * 기록자 수만으로 줄을 세우면 등재 인물 절대다수가 옛사람이라 논어·시경·일리아스가 영원히 앞자리를 차지한다.
 * 지금 실제로 팔리는 책은 현역 인물이 읽은 쪽이다 — 사피엔스·듄·제로 투 원.
 */
const MODERN_BORN_FROM = '1950-01-01'

/** 날마다 앞자리를 돌릴 후보 폭. 좁으면 늘 같은 책만 뜨고, 넓으면 지지가 얕은 책까지 올라온다. */
const ROTATION_WINDOW = 24

/** 제휴 링크가 없는 책은 기록이 많은 쪽부터 이만큼만 후보로 싣는다(현역 독자 수 집계 비용을 묶는다) */
const POPULAR_CANDIDATES = 1000

/**
 * 판매로 이을 수 있는 도서 후보 전량. 한 번 만들어 두고 인물별 고르기에서 걸러 쓴다
 * (인물마다 다시 조회하면 그만큼 전송량이 는다).
 *
 * - 한국어는 YES24가 기준이다. ISBN이 있으면 YES24 상품으로, 없으면 YES24 검색으로 잇는다.
 *   쿠팡 상품은 같은 판본에 붙는 보조 단추라 후보 자격을 정하지 않는다(쿠팡 링크만 있는 책도 뺄 이유는 없어 싣는다).
 * - 영어는 아마존이 기준이다. 상품 주소가 없으면 제목·저자 검색으로 잇는다.
 * - 원전 작품은 판본 표가 원천이다. 작품 locale의 옛 링크로 되돌아가지 않는다.
 * - 표시용 제목만 있는 책(그 언어 판본이 없다)은 뺀다. 영문 화면에서 한국 소설을 아마존 검색으로 보내면 빈 결과가 뜬다.
 */
async function fetchAffiliatePool(locale: AffiliateBookLocale): Promise<PoolEntry[]> {
  const db = createStaticClient()
  const bookSelect = 'content_id, title, creator, thumbnail_url, isbn, affiliate_url, sources, contents!inner(user_count:record_count, type)'

  const [linkedResult, popularResult, sourceRows] = await Promise.all([
    // 제휴 링크가 걸린 책 — 운영자가 골라 붙인 상품이라 기록 수와 무관하게 싣는다
    db
      .from('content_locales')
      .select(bookSelect)
      .eq('locale', locale)
      .eq('contents.type', 'BOOK')
      .not('affiliate_url', 'is', null)
      .limit(1000),
    // 기록이 많은 책 — 링크가 없어도 서점으로 이을 수 있다
    db
      .from('contents')
      .select('record_count, content_locales!inner(content_id, title, creator, thumbnail_url, isbn, affiliate_url, sources)')
      .eq('type', 'BOOK')
      .eq('content_locales.locale', locale)
      .order('record_count', { ascending: false })
      .limit(POPULAR_CANDIDATES),
    selectAllPages<SourceContentCountRow>((from, to) => db
      .from('figure_book_contents')
      .select('content_id,contents!inner(record_count)')
      .order('content_id')
      .range(from, to)
      .overrideTypes<SourceContentCountRow[], { merge: false }>()),
  ])

  throwOnQueryError('getAffiliateBooks/pool-linked', linkedResult.error)
  throwOnQueryError('getAffiliateBooks/pool-popular', popularResult.error)

  const pool: PoolEntry[] = []
  const seen = new Set<string>(RECOMMENDATION_EXCLUDED_IDS)
  const sourceIds = new Set(sourceRows.map((row) => row.content_id))
  const sourceCountById = new Map(sourceRows.map((row) => [
    row.content_id,
    row.contents?.record_count ?? 0,
  ]))

  // 원전 작품 — 작품마다 대표 판본 하나만 쓴다. 인물 원전 책장에서는 모든 판본을 보여준다.
  const editionsByContent = await loadFigureBookEditions(db, [...sourceIds], locale)
  for (const [contentId, editions] of editionsByContent) {
    if (seen.has(contentId)) continue
    const edition = pickPurchaseEdition(editions, locale)
    if (!edition?.title) continue
    const url = locale === 'en'
      ? getEnglishBookAmazonUrl({ title: edition.title, creator: edition.creator, url: edition.purchaseUrl })
      : edition.purchaseUrl ?? ''
    // 한국어는 ISBN이나 쿠팡 상품 중 하나는 있어야 서점 상품으로 잇는다
    if (locale === 'ko' ? !normalizePurchaseIsbn(edition.isbn) && !url : !url) continue
    seen.add(contentId)
    pool.push({
      book: {
        contentId,
        editionId: edition.id,
        title: edition.title,
        creator: edition.creator ?? undefined,
        thumbnail: edition.thumbnailUrl ?? undefined,
        url,
      },
      userCount: sourceCountById.get(contentId) ?? 0,
      modernCount: 0,
    })
  }

  const popularRows = ((popularResult.data ?? []) as unknown as PopularContentRow[]).flatMap((content) =>
    (content.content_locales ?? []).map((row): LocaleRow => ({ ...row, contents: { user_count: content.record_count } })))
  const rows = [
    ...((linkedResult.data ?? []) as unknown as LocaleRow[]),
    ...popularRows,
  ]
  for (const row of rows) {
    if (seen.has(row.content_id) || sourceIds.has(row.content_id) || !row.title || isDisplayTitleRow(row.sources)) continue
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
  for (let i = 0; i < contentIds.length; i += 60) {
    let data: { content_id: string; celeb_id: string }[] = []
    try {
      data = await selectAllPages<{ content_id: string; celeb_id: string }>((from, to) => db
        .from('celeb_contents')
        .select('content_id, celeb_id')
        .in('content_id', contentIds.slice(i, i + 60))
        .order('id', { ascending: true })
        .range(from, to))
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

/**
 * 상위 후보 안에서 날마다 시작 위치를 옮긴다.
 * 고정 6권이면 방문할 때마다 같은 표지만 보이고, 그 뒤 스무 권은 영영 노출되지 않는다.
 */
function rotateDaily<T>(items: T[], limit: number): T[] {
  const window = items.slice(0, ROTATION_WINDOW)
  if (window.length <= limit) return window.slice(0, limit)

  const day = Math.floor(Date.now() / 86_400_000)
  const start = (day * limit) % window.length
  return Array.from({ length: limit }, (_, i) => window[(start + i) % window.length])
}

const fetchAffiliatePoolCached = unstable_cache(fetchAffiliatePool, ['affiliate-pool-v6-real-edition'], {
  // 여러 인물 상세이 함께 쓰는 풀이다. CONTENTS 태그를 달면 작품 한 건 수정이 모든
  // 인물 상세을 연쇄 무효화하므로 달지 않는다.
  //
  // 수명은 이웃과 같은 1주다. 한 시간으로 두었더니 인물 상세 초기 렌더가 이 조회를 쓰는
  // 한국어 full 인물 2,400여 장의 수명이 통째로 한 시간으로 끌려 내려갔다 — Next는 한 장을
  // 만들며 쓴 캐시 중 가장 짧은 것을 그 페이지의 수명으로 삼는다(26.09.12 실측).
  // 새 상품은 시간 만료를 기다리지 않는다. 제휴 반영 스크립트(web-bo의 figure-books/
  // apply-reviewed.ts)가 이 FIGURE_BOOKS 태그를 함께 비운다.
  revalidate: STATIC_REVALIDATE,
  tags: [CACHE_TAGS.FIGURE_BOOKS],
})

export async function getAffiliateBooks(
  locale: AffiliateBookLocale = 'ko',
  limit = 6,
): Promise<AffiliateBook[]> {
  const pool = await fetchAffiliatePoolCached(locale)

  // 지금 서점에서 팔리는 책이 먼저 자리를 잡되 정해진 칸까지만, 나머지는 평소 목록이 채운다
  const ranked = BESTSELLER_CONTENT_IDS.map((id) => pool.find((p) => p.book.contentId === id)).filter(
    (v): v is PoolEntry => v !== undefined,
  )
  const rankedIds = new Set(ranked.map((v) => v.book.contentId))
  const rest = pool.filter((p) => !rankedIds.has(p.book.contentId))

  const hot = rotateDaily(ranked, Math.min(BESTSELLER_MAX_SLOTS, limit))
  return [...hot, ...rotateDaily(rest, limit)].slice(0, limit).map((v) => v.book)
}

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

  const { data: peers, error: peersError } = await db
    .from('celebs')
    .select('id')
    .eq('profession', profession)
    .eq('publication_status', 'active')
    .neq('id', celebId)
    .order('view_count', { ascending: false })
    .limit(60)

  throwOnQueryError('getAffiliateBooks/profession-peers', peersError)
  const peerIds = (peers ?? []).map((p) => p.id as string)
  if (peerIds.length === 0) return new Set()

  const { data, error } = await db
    .from('celeb_contents')
    .select('content_id')
    .in('celeb_id', peerIds)
    .limit(1000)

  throwOnQueryError('getAffiliateBooks/profession-read', error)
  return new Set((data ?? []).map((r) => r.content_id as string))
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
  celebId: string,
  limit: number,
  pool: PoolEntry[],
): Promise<{ books: AffiliateBook[]; groups: AffiliateBookGroup[]; source: AffiliateBookSource }> {
  if (pool.length === 0) return { books: [], groups: [], source: 'popular' }

  // 소스를 한 층만 쓰지 않고 순서대로 섞어 채운다 — 읽은 책 한 권이면 한 칸만 차고 끝나던 방식이었다.
  const [origins, read, peers] = await Promise.all([
    fetchOriginWorks(celebId),
    fetchReadByCeleb(celebId),
    fetchReadByProfession(celebId),
  ])

  const seen = new Set<string>()
  const picked: PoolEntry[] = []
  const groups: AffiliateBookGroup[] = []
  const take = (ids: Set<string>, source: Exclude<AffiliateBookSource, 'mixed'>) => {
    let count = 0
    for (const p of pool) {
      if (picked.length >= limit) break
      if (seen.has(p.book.contentId) || !ids.has(p.book.contentId)) continue
      seen.add(p.book.contentId)
      picked.push(p)
      count += 1
    }
    if (count > 0) groups.push({ source, count })
  }
  take(origins, 'origin')
  take(read, 'read')
  take(peers, 'profession')
  take(new Set(pool.map((p) => p.book.contentId)), 'popular')

  // 한 소스만 들어왔으면 그 소스 이름을, 섞였으면 중립 표기를 돌려준다.
  const source: AffiliateBookSource = groups.length === 1 ? groups[0].source : 'mixed'
  return { books: picked.map((v) => v.book), groups, source }
}

/* unstable_cache 콜백 안에서 부른 unstable_cache는 안쪽 캐시를 읽지 않고 매번 다시 만든다
   (26.09.10 실측 — 풀을 인물 캐시 안에서 읽자 인물마다 풀 전량 재조회로 2.5~3초, 인물 상세 콜드 10초대).
   풀은 반드시 바깥에서 읽어 콜백에 넘긴다. 아래 태그 조회도 같다. */
async function getAffiliateBooksForCelebInner(
  celebId: string,
  locale: AffiliateBookLocale = 'ko',
  limit = 6,
): Promise<{ books: AffiliateBook[]; groups: AffiliateBookGroup[]; source: AffiliateBookSource }> {
  const pool = await fetchAffiliatePoolCached(locale)
  return cachedDetail(
    CACHE_TAGS.CELEBS,
    celebId,
    ['affiliate-books-celeb-v7-groups', celebId, locale, String(limit)],
    () => fetchAffiliateBooksForCeleb(celebId, limit, pool),
    // 수명은 기본값(1주)을 쓴다. 위 풀과 같은 이유다 — 인물 상세 초기 렌더가 이 결과를
    // 쓰므로 짧게 두면 페이지 한 장의 수명이 함께 내려간다. 상품이 바뀌면 아래 태그로 비워진다.
    { extraTags: [CACHE_TAGS.CONTENTS, CACHE_TAGS.FIGURE_BOOKS] },
  )
}

// 인물 상세는 서가 우선순위와 하단 상품 구획이 같은 요청에서 두 번 부른다 — 요청 안에서 한 번만 돈다.
export const getAffiliateBooksForCeleb = cache(getAffiliateBooksForCelebInner)
