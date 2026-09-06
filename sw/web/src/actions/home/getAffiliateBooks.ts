'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { createStaticClient } from '@/lib/db/static'
import { cachedDetail, LIST_REVALIDATE, STATIC_REVALIDATE, throwOnQueryError } from '@/lib/cache'
import type { AffiliatePlatformKey } from '@/constants/affiliatePlatforms'
import { FACTION_BOOK_TOPICS } from '@/constants/factionBookTopics'
import { findAffiliateLink } from './affiliateLinks'
import {
  mapFigureBookPurchaseOptions,
  type FigureBookPurchaseOptionRow,
} from '@/actions/figure-books/figureBookLocale'
import {
  BESTSELLER_CONTENT_IDS,
  BESTSELLER_MAX_SLOTS,
  RECOMMENDATION_EXCLUDED_IDS,
} from '@/constants/affiliateBookPicks'

export interface AffiliateBook {
  contentId: string
  title: string
  creator?: string
  thumbnail?: string
  url: string
}

/** 인물 화면에서 이 목록을 무엇으로 골랐는지 — 안내 문구를 갈아끼우는 데 쓴다. */
export type AffiliateBookSource = 'origin' | 'read' | 'profession' | 'popular'

/** 진영 화면의 인물 묶음을 무엇으로 골랐는지 — 인물에 얽힌 책 · 그들이 읽은 책 */
export type FactionBookSource = 'about' | 'read'

/** 진영 화면에 내보내는 두 묶음. 분야의 책과 인물에 얽힌 책을 따로 낸다. */
export interface FactionBooks {
  /** 그 진영이 다루는 분야의 책 (신화는 원전, 나머지는 분야 낱말로 찾은 것) */
  topic: AffiliateBook[]
  /** 그 진영 인물이 쓴 책·다룬 책, 없으면 그들이 읽은 책 */
  people: AffiliateBook[]
  peopleSource: FactionBookSource
}

interface LocaleRow {
  content_id: string
  title: string | null
  creator: string | null
  thumbnail_url: string | null
  affiliate_url: unknown
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

/**
 * 제휴 링크가 걸린 도서 전량. 링크는 BO에서 채우므로 채우는 대로 늘어난다 — 목록을 코드에 박지 않는다.
 * 한 번 만들어 두고 인물별 고르기에서 걸러 쓴다(인물마다 다시 조회하면 그만큼 전송량이 는다).
 */
async function fetchAffiliatePool(platform: AffiliatePlatformKey): Promise<PoolEntry[]> {
  const db = createStaticClient()
  const sourceLocale = platform === 'amazon' ? 'en' : 'ko'
  const sourcePlatform = platform === 'coupang' || platform === 'amazon'
    ? platform
    : null

  const [localeResult, sourceRows, optionRows] = await Promise.all([
    db
      .from('content_locales')
      .select('content_id, title, creator, thumbnail_url, affiliate_url, contents!inner(user_count:record_count, type)')
      .eq('locale', sourceLocale)
      .eq('contents.type', 'BOOK')
      .not('affiliate_url', 'is', null)
      .limit(1000),
    sourcePlatform
      ? selectAllPages<SourceContentCountRow>((from, to) => db
          .from('figure_book_contents')
          .select('content_id,contents!inner(record_count)')
          .order('content_id')
          .range(from, to)
          .overrideTypes<SourceContentCountRow[], { merge: false }>())
      : Promise.resolve([]),
    sourcePlatform
      ? selectAllPages<FigureBookPurchaseOptionRow>((from, to) => db
          .from('figure_book_purchase_options')
          .select('edition_id,content_id,locale,title,creator,description,isbn,publisher,thumbnail_url,release_date,edition_kind,text_scope,sort_order,platform,affiliate_url')
          .eq('locale', sourceLocale)
          .eq('platform', sourcePlatform)
          .order('content_id')
          .order('edition_id')
          .range(from, to)
          .overrideTypes<FigureBookPurchaseOptionRow[], { merge: false }>())
      : Promise.resolve([]),
  ])

  throwOnQueryError('getAffiliateBooks/pool', localeResult.error)

  const rows = (localeResult.data ?? []) as unknown as LocaleRow[]
  const pool: PoolEntry[] = []
  const excluded = new Set(RECOMMENDATION_EXCLUDED_IDS)
  const sourceIds = new Set(sourceRows.map((row) => row.content_id))
  const sourceCountById = new Map(sourceRows.map((row) => [
    row.content_id,
    row.contents?.record_count ?? 0,
  ]))
  const optionsByContent = new Map<string, FigureBookPurchaseOptionRow[]>()
  for (const row of optionRows) {
    const current = optionsByContent.get(row.content_id) ?? []
    current.push(row)
    optionsByContent.set(row.content_id, current)
  }

  // 일반 추천 카드에는 작품마다 기본 판본 하나만 쓴다. 인물 원전 책장에서는 모든 판본을 보여준다.
  for (const [contentId, options] of optionsByContent) {
    if (excluded.has(contentId)) continue
    const edition = mapFigureBookPurchaseOptions(options, sourceLocale)[0]
    // 홈 제휴 도서는 구매 링크가 있는 판본만 싣는다.
    if (!edition?.purchaseUrl) continue
    pool.push({
      book: {
        contentId,
        title: edition.title,
        creator: edition.creator ?? undefined,
        thumbnail: edition.thumbnailUrl ?? undefined,
        url: edition.purchaseUrl,
      },
      userCount: sourceCountById.get(contentId) ?? 0,
      modernCount: 0,
    })
  }

  for (const row of rows) {
    if (excluded.has(row.content_id)) continue
    // 원전 작품의 구매 SSoT는 판본 상품 표다. locale의 이전 링크로 되돌아가지 않는다.
    if (sourcePlatform && sourceIds.has(row.content_id)) continue
    const link = findAffiliateLink(row.affiliate_url, platform)
    if (!link?.url || !row.title) continue
    pool.push({
      book: {
        contentId: row.content_id,
        title: row.title,
        creator: row.creator ?? undefined,
        thumbnail: row.thumbnail_url ?? undefined,
        url: link.url,
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

  const { data: modern, error: celebError } = await db
    .from('celebs')
    .select('id')
    .eq('publication_status', 'active')
    .gte('birth_date', MODERN_BORN_FROM)
    .limit(2000)

  if (celebError) {
    console.error('[getAffiliateBooks] 현역 인물 조회 실패:', celebError)
    return counts
  }

  const modernIds = new Set((modern ?? []).map((c) => c.id as string))
  if (modernIds.size === 0) return counts

  // 한 번에 다 물으면 요청 주소가 길어져 거부당한다 — 나눠 묻는다
  for (let i = 0; i < contentIds.length; i += 60) {
    const { data, error } = await db
      .from('celeb_contents')
      .select('content_id, celeb_id')
      .in('content_id', contentIds.slice(i, i + 60))
      .limit(2000)

    if (error) {
      console.error('[getAffiliateBooks] 현역 인물 기록 조회 실패:', error)
      return counts
    }

    for (const row of data ?? []) {
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

const fetchAffiliatePoolCached = unstable_cache(fetchAffiliatePool, ['affiliate-pool-v3-source-editions'], {
  // 여러 인물 상세이 함께 쓰는 풀이다. CONTENTS 태그를 달면 작품 한 건 수정이 모든
  // 인물 상세을 연쇄 무효화하므로, 한 시간 만료로만 새 후보를 흡수한다.
  revalidate: LIST_REVALIDATE,
  tags: [CACHE_TAGS.FIGURE_BOOKS],
})

export async function getAffiliateBooks(
  platform: AffiliatePlatformKey = 'coupang',
  limit = 6,
): Promise<AffiliateBook[]> {
  const pool = await fetchAffiliatePoolCached(platform)

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

async function fetchAffiliateBooksForCeleb(
  celebId: string,
  platform: AffiliatePlatformKey,
  limit: number,
): Promise<{ books: AffiliateBook[]; source: AffiliateBookSource }> {
  const pool = await fetchAffiliatePoolCached(platform)
  if (pool.length === 0) return { books: [], source: 'popular' }

  // 0순위 — 그 인물이 등장하는 원전(신화·전설 인물)
  const origins = await fetchOriginWorks(celebId)
  if (origins.size > 0) {
    const originBooks = pool.filter((p) => origins.has(p.book.contentId))
    if (originBooks.length > 0) {
      return { books: originBooks.slice(0, limit).map((v) => v.book), source: 'origin' }
    }
  }

  // 1순위 — 그 인물이 읽은 책
  const read = await fetchReadByCeleb(celebId)
  const own = pool.filter((p) => read.has(p.book.contentId))
  if (own.length > 0) return { books: own.slice(0, limit).map((v) => v.book), source: 'read' }

  // 2순위 — 같은 직군 인물들이 읽은 책
  const peers = await fetchReadByProfession(celebId)
  const byProfession = pool.filter((p) => peers.has(p.book.contentId))
  if (byProfession.length > 0) {
    return { books: byProfession.slice(0, limit).map((v) => v.book), source: 'profession' }
  }

  // 3순위 — 그냥 많이 읽힌 책
  return { books: pool.slice(0, limit).map((v) => v.book), source: 'popular' }
}

export async function getAffiliateBooksForCeleb(
  celebId: string,
  platform: AffiliatePlatformKey = 'coupang',
  limit = 6,
): Promise<{ books: AffiliateBook[]; source: AffiliateBookSource }> {
  return cachedDetail(
    CACHE_TAGS.CELEBS,
    celebId,
    ['affiliate-books-celeb-v3-source-editions', celebId, platform, String(limit)],
    () => fetchAffiliateBooksForCeleb(celebId, platform, limit),
    { revalidate: LIST_REVALIDATE, extraTags: [CACHE_TAGS.CONTENTS, CACHE_TAGS.FIGURE_BOOKS] },
  )
}

/** 여러 인물의 기록을 모아 작품별로 몇 명이 겹치는지 센다. 겹치는 인물이 많을수록 그 진영을 대표한다. */
async function tallyByCelebs(
  table: 'figure_book_characters' | 'celeb_contents',
  celebIds: string[],
): Promise<Map<string, number>> {
  const db = createStaticClient()
  const weight = new Map<string, number>()

  // 인물 수가 많으면 요청 주소가 길어져 거부당한다 — 나눠 묻는다
  for (let i = 0; i < celebIds.length; i += 60) {
    let query = db
      .from(table)
      .select('content_id')
      .in('celeb_id', celebIds.slice(i, i + 60))
      .limit(1000)
    if (table === 'figure_book_characters') {
      query = query.eq('relation_type', 'appearance')
    }
    const { data, error } = await query
    if (error) {
      console.error(`[getAffiliateBooks] ${table} 조회 실패:`, error)
      return new Map()
    }
    for (const row of data ?? []) {
      const id = row.content_id as string
      weight.set(id, (weight.get(id) ?? 0) + 1)
    }
  }

  return weight
}

/**
 * 이름이 책의 제목이나 저자에 걸리는지 본다.
 *
 * 짧거나 흔한 이름은 엉뚱한 저자와 겹친다 — 걸그룹 「다니엘」이 다니엘 핑크·다니엘 디포를,
 * 「티파니」가 『티파니에서 아침을』을 끌어왔다. 그래서 성과 이름이 함께 있거나(공백)
 * 충분히 긴 이름만 인정한다.
 */
function nameHits(name: string | null, title: string, creator?: string): boolean {
  if (!name) return false
  const n = name.trim()
  if (n.length < 5 && !n.includes(' ')) return false
  return title.includes(n) || (creator?.includes(n) ?? false)
}

/**
 * 한 진영에 어울리는 책. 진영 성격에 따라 근거가 갈린다.
 * - 신화·전설 진영: 그 인물들이 등장하는 원전 (아스가르드→에다, 카멜롯→아서 왕의 죽음)
 * - 실존 인물 진영: 그 인물이 쓴 책이나 그를 다룬 책 (가장 어두운 시간→처칠 『제2차 세계대전』)
 * - 그것도 없으면: 그 인물들이 실제로 읽은 책
 * 어느 쪽이든 겹치는 인물이 많은 책부터 낸다.
 */
async function fetchBooksForTag(
  tagId: string,
  tagName: string,
  platform: AffiliatePlatformKey,
  limit: number,
): Promise<FactionBooks> {
  const db = createStaticClient()
  const empty: FactionBooks = { topic: [], people: [], peopleSource: 'read' }

  const { data: members, error } = await db
    .from('faction_atlas_members')
    .select('celeb_id')
    .eq('tag_id', tagId)
    .limit(300)

  if (error || !members?.length) {
    if (error) console.error('[getAffiliateBooks] 진영 인물 조회 실패:', error)
    return empty
  }

  const celebIds = Array.from(new Set(members.map((m) => m.celeb_id as string)))
  const pool = await fetchAffiliatePoolCached(platform)
  if (pool.length === 0) return empty

  const pick = (weight: Map<string, number>) =>
    pool
      .filter((p) => weight.has(p.book.contentId))
      .sort((a, b) => (weight.get(b.book.contentId) ?? 0) - (weight.get(a.book.contentId) ?? 0))
      .slice(0, limit)
      .map((v) => v.book)

  // ── 첫째 묶음: 그 진영이 다루는 분야의 책 ──
  // 신화 진영은 인물들이 나오는 원전이 곧 분야다. 나머지는 정해 둔 분야 낱말로 찾는다.
  const originWeight = await tallyByCelebs('figure_book_characters', celebIds)
  let topic = pick(originWeight)

  const keywords = FACTION_BOOK_TOPICS[tagName]
  if (keywords?.length) {
    const byKeyword = pool
      .filter((p) => keywords.some((k) => p.book.title.includes(k) || (p.book.creator?.includes(k) ?? false)))
      .map((v) => v.book)
    // 원전이 이미 있으면 뒤에 덧붙이고, 없으면 이쪽이 분야 묶음이 된다
    const merged = [...topic, ...byKeyword.filter((b) => !topic.some((t) => t.contentId === b.contentId))]
    topic = merged.slice(0, limit)
  }

  // ── 둘째 묶음: 그 인물들에 얽힌 책 ──
  // 인물이 쓴 책이나 그를 다룬 책이 먼저, 없으면 그들이 실제로 읽은 책.
  const { data: celebs } = await db.from('celebs').select('nickname').in('id', celebIds.slice(0, 60))
  const names = (celebs ?? []).map((p) => p.nickname as string | null)
  const about = pool
    .filter((p) => names.some((n) => nameHits(n, p.book.title, p.book.creator)))
    .filter((p) => !topic.some((t) => t.contentId === p.book.contentId))
    .slice(0, limit)
    .map((v) => v.book)

  if (about.length > 0) return { topic, people: about, peopleSource: 'about' }

  const read = pick(await tallyByCelebs('celeb_contents', celebIds)).filter(
    (b) => !topic.some((t) => t.contentId === b.contentId),
  )
  return { topic, people: read, peopleSource: 'read' }
}

const fetchBooksForTagCached = unstable_cache(fetchBooksForTag, ['affiliate-books-tag'], {
  revalidate: STATIC_REVALIDATE,
  tags: [CACHE_TAGS.CONTENTS, CACHE_TAGS.CELEBS, CACHE_TAGS.FIGURE_BOOKS],
})

export async function getAffiliateBooksForTag(
  tagId: string,
  tagName: string,
  platform: AffiliatePlatformKey = 'coupang',
  limit = 6,
): Promise<FactionBooks> {
  if (!tagId) return { topic: [], people: [], peopleSource: 'read' }
  return fetchBooksForTagCached(tagId, tagName, platform, limit)
}
