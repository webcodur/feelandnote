'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/supabase/static'
import { STATIC_REVALIDATE } from '@/lib/cache'
import type { AffiliateLink, AffiliatePlatformKey } from '@/constants/affiliatePlatforms'
import { FACTION_BOOK_TOPICS } from '@/constants/factionBookTopics'

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
  affiliate_url: AffiliateLink[] | null
  contents: { user_count: number | null } | null
}

interface PoolEntry {
  book: AffiliateBook
  userCount: number
}

/**
 * 제휴 링크가 걸린 도서 전량. 링크는 BO에서 채우므로 채우는 대로 늘어난다 — 목록을 코드에 박지 않는다.
 * 한 번 만들어 두고 인물별 고르기에서 걸러 쓴다(인물마다 다시 조회하면 그만큼 전송량이 는다).
 */
async function fetchAffiliatePool(platform: AffiliatePlatformKey): Promise<PoolEntry[]> {
  const supabase = createStaticClient()

  const { data, error } = await supabase
    .from('content_locales')
    .select('content_id, title, creator, thumbnail_url, affiliate_url, contents!inner(user_count, type)')
    .eq('locale', 'ko')
    .eq('contents.type', 'BOOK')
    .not('affiliate_url', 'is', null)
    .limit(1000)

  if (error) {
    console.error('[getAffiliateBooks] 조회 실패:', error)
    return []
  }

  const rows = (data ?? []) as unknown as LocaleRow[]
  const pool: PoolEntry[] = []

  for (const row of rows) {
    const link = row.affiliate_url?.find((l) => l.platform === platform)
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
    })
  }

  return pool.sort((a, b) => b.userCount - a.userCount)
}

const fetchAffiliatePoolCached = unstable_cache(fetchAffiliatePool, ['affiliate-pool'], {
  revalidate: STATIC_REVALIDATE,
  tags: [CACHE_TAGS.CONTENTS],
})

export async function getAffiliateBooks(
  platform: AffiliatePlatformKey = 'coupang',
  limit = 6,
): Promise<AffiliateBook[]> {
  const pool = await fetchAffiliatePoolCached(platform)
  return pool.slice(0, limit).map((v) => v.book)
}

/** 그 인물이 실제로 남긴 기록 중 링크가 걸린 것을 고른다. */
async function fetchReadByCeleb(userId: string): Promise<Set<string>> {
  const supabase = createStaticClient()
  const { data, error } = await supabase
    .from('user_contents')
    .select('content_id')
    .eq('user_id', userId)
    .limit(1000)

  if (error) {
    console.error('[getAffiliateBooks] 인물 기록 조회 실패:', error)
    return new Set()
  }
  return new Set((data ?? []).map((r) => r.content_id as string))
}

/** 같은 직군 인물들이 남긴 기록. 이름난 인물부터 훑어 대표성이 있는 쪽으로 모은다. */
async function fetchReadByProfession(userId: string): Promise<Set<string>> {
  const supabase = createStaticClient()

  const { data: me } = await supabase.from('profiles').select('profession').eq('id', userId).maybeSingle()
  const profession = me?.profession
  if (!profession) return new Set()

  const { data: peers } = await supabase
    .from('profiles')
    .select('id')
    .eq('profession', profession)
    .eq('profile_type', 'celeb')
    .neq('id', userId)
    .order('view_count', { ascending: false })
    .limit(60)

  const peerIds = (peers ?? []).map((p) => p.id as string)
  if (peerIds.length === 0) return new Set()

  const { data, error } = await supabase
    .from('user_contents')
    .select('content_id')
    .in('user_id', peerIds)
    .limit(1000)

  if (error) {
    console.error('[getAffiliateBooks] 직군 기록 조회 실패:', error)
    return new Set()
  }
  return new Set((data ?? []).map((r) => r.content_id as string))
}

/** 신화·서사 인물이 등장하는 원전. 이들은 책을 읽은 기록이 없고 대신 자기가 나오는 작품이 있다. */
async function fetchOriginWorks(userId: string): Promise<Set<string>> {
  const supabase = createStaticClient()
  const { data, error } = await supabase
    .from('fiction_source_characters')
    .select('content_id')
    .eq('celeb_id', userId)
    .limit(50)

  if (error) {
    console.error('[getAffiliateBooks] 원전 조회 실패:', error)
    return new Set()
  }
  return new Set((data ?? []).map((r) => r.content_id as string))
}

async function fetchAffiliateBooksForCeleb(
  userId: string,
  platform: AffiliatePlatformKey,
  limit: number,
): Promise<{ books: AffiliateBook[]; source: AffiliateBookSource }> {
  const pool = await fetchAffiliatePoolCached(platform)
  if (pool.length === 0) return { books: [], source: 'popular' }

  // 0순위 — 그 인물이 등장하는 원전(신화·전설 인물)
  const origins = await fetchOriginWorks(userId)
  if (origins.size > 0) {
    const originBooks = pool.filter((p) => origins.has(p.book.contentId))
    if (originBooks.length > 0) {
      return { books: originBooks.slice(0, limit).map((v) => v.book), source: 'origin' }
    }
  }

  // 1순위 — 그 인물이 읽은 책
  const read = await fetchReadByCeleb(userId)
  const own = pool.filter((p) => read.has(p.book.contentId))
  if (own.length > 0) return { books: own.slice(0, limit).map((v) => v.book), source: 'read' }

  // 2순위 — 같은 직군 인물들이 읽은 책
  const peers = await fetchReadByProfession(userId)
  const byProfession = pool.filter((p) => peers.has(p.book.contentId))
  if (byProfession.length > 0) {
    return { books: byProfession.slice(0, limit).map((v) => v.book), source: 'profession' }
  }

  // 3순위 — 그냥 많이 읽힌 책
  return { books: pool.slice(0, limit).map((v) => v.book), source: 'popular' }
}

const fetchForCelebCached = unstable_cache(fetchAffiliateBooksForCeleb, ['affiliate-books-celeb'], {
  revalidate: STATIC_REVALIDATE,
  tags: [CACHE_TAGS.CONTENTS, CACHE_TAGS.CELEBS],
})

export async function getAffiliateBooksForCeleb(
  userId: string,
  platform: AffiliatePlatformKey = 'coupang',
  limit = 6,
): Promise<{ books: AffiliateBook[]; source: AffiliateBookSource }> {
  return fetchForCelebCached(userId, platform, limit)
}

/** 여러 인물의 기록을 모아 작품별로 몇 명이 겹치는지 센다. 겹치는 인물이 많을수록 그 진영을 대표한다. */
async function tallyByCelebs(
  table: 'fiction_source_characters' | 'user_contents',
  celebIds: string[],
): Promise<Map<string, number>> {
  const supabase = createStaticClient()
  const idColumn = table === 'fiction_source_characters' ? 'celeb_id' : 'user_id'
  const weight = new Map<string, number>()

  // 인물 수가 많으면 요청 주소가 길어져 거부당한다 — 나눠 묻는다
  for (let i = 0; i < celebIds.length; i += 60) {
    const { data, error } = await supabase
      .from(table)
      .select('content_id')
      .in(idColumn, celebIds.slice(i, i + 60))
      .limit(1000)
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
  const supabase = createStaticClient()
  const empty: FactionBooks = { topic: [], people: [], peopleSource: 'read' }

  const { data: members, error } = await supabase
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
  const originWeight = await tallyByCelebs('fiction_source_characters', celebIds)
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
  const { data: profiles } = await supabase.from('profiles').select('nickname').in('id', celebIds.slice(0, 60))
  const names = (profiles ?? []).map((p) => p.nickname as string | null)
  const about = pool
    .filter((p) => names.some((n) => nameHits(n, p.book.title, p.book.creator)))
    .filter((p) => !topic.some((t) => t.contentId === p.book.contentId))
    .slice(0, limit)
    .map((v) => v.book)

  if (about.length > 0) return { topic, people: about, peopleSource: 'about' }

  const read = pick(await tallyByCelebs('user_contents', celebIds)).filter(
    (b) => !topic.some((t) => t.contentId === b.contentId),
  )
  return { topic, people: read, peopleSource: 'read' }
}

const fetchBooksForTagCached = unstable_cache(fetchBooksForTag, ['affiliate-books-tag'], {
  revalidate: STATIC_REVALIDATE,
  tags: [CACHE_TAGS.CONTENTS, CACHE_TAGS.CELEBS],
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

