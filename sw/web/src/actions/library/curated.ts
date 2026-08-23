/*
  파일명: /actions/library/curated.ts
  기능: 기관 선정 — 대학·언론·시상기관 등이 발표한 작품 목록 조회
  책임: 허브(성격별 기관 진열), 기관 상세, 목록 상세, 그리고 작품 상세의 선정 이력 역조회를 낸다.
*/ // ------------------------------

'use server'

import { unstable_cache } from 'next/cache'
import { getLocale } from 'next-intl/server'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { cachedDetail, STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { CL_SELECT_LIST, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'
import type {
  CuratedHub,
  CuratedListDetail,
  CuratedListItem,
  CuratedListSummary,
  CuratorDetail,
  CuratorSummary,
  ContentCuratedEntry,
} from './types'

/** 목록 하나에 담기는 작품 수 상한. 무한 조회를 막는 안전선이다 */
const MAX_ITEMS_PER_LIST = 500

/**
 * 처음 내려보내는 작품 수.
 *
 * 목록 대부분이 100편 이하라 이 선이면 한 번에 다 보인다.
 * 세인트존스(323)·아쿠타가와(189)처럼 큰 목록만 잘리는데, 전량을 그대로 실으면
 * 화면 하나가 3MB에 이르러(실측 2,959KB·2.3초) 폭 좁은 기기에서 눈에 띄게 굼떠진다.
 */
const INITIAL_ITEMS = 120

const pick = (ko: string | null, en: string | null, locale: string) =>
  (locale === 'en' ? en || ko : ko || en) ?? ''
const pickOrNull = (ko: string | null, en: string | null, locale: string) =>
  (locale === 'en' ? en || ko : ko || en) ?? null

// ────────────────────────────────────────────────────
// #region 공통 조회 행 타입 — select 문자열과 1:1 대응
interface CuratorRow {
  id: string
  slug: string
  name: string
  name_en: string | null
  kind: string
  country: string | null
  founded_year: number | null
  description: string | null
  description_en: string | null
  logo_url: string | null
  homepage_url: string | null
  sort_order: number
}

interface ListRow {
  id: string
  curator_id: string
  slug: string
  title: string
  title_en: string | null
  description: string | null
  description_en: string | null
  published_year: number | null
  edition: string | null
  series_key: string | null
  method: string | null
  method_en: string | null
  source_url: string
  cover_image_url: string | null
  is_ranked: boolean
  is_annual: boolean
  content_type: string
  topics: string[] | null
  sort_order: number
}

const CURATOR_COLS =
  'id, slug, name, name_en, kind, country, founded_year, description, description_en, logo_url, homepage_url, sort_order'
const LIST_COLS =
  'id, curator_id, slug, title, title_en, description, description_en, published_year, edition, series_key, method, method_en, source_url, cover_image_url, is_ranked, is_annual, content_type, topics, sort_order'

function toCuratorSummary(c: CuratorRow, locale: string, listCount: number): CuratorSummary {
  return {
    slug: c.slug,
    name: pick(c.name, c.name_en, locale),
    kind: c.kind,
    country: c.country,
    foundedYear: c.founded_year,
    description: pickOrNull(c.description, c.description_en, locale),
    logoUrl: c.logo_url,
    homepageUrl: c.homepage_url,
    listCount,
  }
}

function toListSummary(
  l: ListRow,
  locale: string,
  itemCount: number,
  curatorSlug: string,
  covers: string[] = []
): CuratedListSummary {
  return {
    slug: l.slug,
    curatorSlug,
    title: pick(l.title, l.title_en, locale),
    description: pickOrNull(l.description, l.description_en, locale),
    publishedYear: l.published_year,
    edition: l.edition,
    seriesKey: l.series_key,
    isRanked: l.is_ranked,
    isAnnual: l.is_annual,
    contentType: l.content_type,
    topics: l.topics ?? [],
    coverImageUrl: l.cover_image_url,
    itemCount,
    covers,
  }
}

/** 목록 앞머리에서 표지 몇 장을 골라온다. 「무엇이 담겼는지」를 글자보다 빨리 알린다 */
const COVERS_PER_LIST = 5
/**
 * 앞머리 몇 번째까지 훑을지 — 표지 없는 작품이 섞여 있어 뽑을 수보다 넉넉히 본다.
 * 세인트존스처럼 앞이 고대 원전으로 시작하는 목록은 표지가 드물어 깊이 봐야 다섯 장이 찬다.
 */
const COVER_SCAN_DEPTH = 30

async function fetchCoversByList(
  supabase: ReturnType<typeof createStaticClient>,
  listIds: string[],
  locale: string
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>()
  if (listIds.length === 0) return out

  const { data } = await supabase
    .from('curated_list_items')
    .select(`list_id, sort_order, contents(content_locales(${CL_SELECT_LIST}))`)
    .in('list_id', listIds)
    .eq('hidden', false)
    .lte('sort_order', COVER_SCAN_DEPTH)
    .order('sort_order', { ascending: true })

  for (const row of (data ?? []) as unknown as {
    list_id: string
    contents: { content_locales: ContentLocaleRow[] | null } | null
  }[]) {
    const arr = out.get(row.list_id) ?? []
    if (arr.length >= COVERS_PER_LIST) continue
    const content = Array.isArray(row.contents) ? row.contents[0] : row.contents
    const url = content ? flattenLocales(content.content_locales, locale).thumbnail_url : null
    if (url) arr.push(url)
    out.set(row.list_id, arr)
  }
  return out
}
// #endregion

// ────────────────────────────────────────────────────
// #region 허브 — 성격별 기관 진열
async function fetchCuratedHub(locale: string): Promise<CuratedHub> {
  const supabase = createStaticClient()

  const [{ data: curators }, { data: lists }] = await Promise.all([
    supabase
      .from('curators')
      .select(CURATOR_COLS)
      .eq('is_featured', true)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),
    supabase
      .from('curated_lists')
      .select(`${LIST_COLS}, curated_list_items(count)`)
      .eq('is_featured', true)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true }),
  ])

  const curatorRows = (curators ?? []) as CuratorRow[]
  const listRows = (lists ?? []) as (ListRow & { curated_list_items: { count: number }[] | null })[]

  const coversByList = await fetchCoversByList(
    supabase,
    listRows.map((l) => l.id),
    locale
  )

  const slugById = new Map(curatorRows.map((c) => [c.id, c.slug]))
  const listsByCurator = new Map<string, CuratedListSummary[]>()
  for (const l of listRows) {
    const curatorSlug = slugById.get(l.curator_id)
    if (!curatorSlug) continue
    const itemCount = l.curated_list_items?.[0]?.count ?? 0
    const arr = listsByCurator.get(l.curator_id)
    const summary = toListSummary(l, locale, itemCount, curatorSlug, coversByList.get(l.id) ?? [])
    if (arr) arr.push(summary)
    else listsByCurator.set(l.curator_id, [summary])
  }

  return {
    curators: curatorRows.map((c) => ({
      ...toCuratorSummary(c, locale, listsByCurator.get(c.id)?.length ?? 0),
      lists: listsByCurator.get(c.id) ?? [],
    })),
  }
}

const getCuratedHubCached = unstable_cache(fetchCuratedHub, ['curated-hub'], {
  revalidate: STATIC_REVALIDATE,
  tags: [CACHE_TAGS.CURATED],
})

export async function getCuratedHub(): Promise<CuratedHub> {
  return getCuratedHubCached(await getLocale())
}
// #endregion

// ────────────────────────────────────────────────────
// #region 기관 상세
async function fetchCurator(slug: string, locale: string): Promise<CuratorDetail | null> {
  const supabase = createStaticClient()

  const { data: curator } = await supabase.from('curators').select(CURATOR_COLS).eq('slug', slug).maybeSingle()
  if (!curator) return null
  const c = curator as CuratorRow

  const { data: lists } = await supabase
    .from('curated_lists')
    .select(`${LIST_COLS}, curated_list_items(count)`)
    .eq('curator_id', c.id)
    .order('published_year', { ascending: false, nullsFirst: false })
    .order('sort_order', { ascending: true })
    .order('id', { ascending: true })

  const listRows = (lists ?? []) as (ListRow & { curated_list_items: { count: number }[] | null })[]
  const coversByList = await fetchCoversByList(
    supabase,
    listRows.map((l) => l.id),
    locale
  )

  return {
    ...toCuratorSummary(c, locale, listRows.length),
    lists: listRows.map((l) =>
      toListSummary(l, locale, l.curated_list_items?.[0]?.count ?? 0, c.slug, coversByList.get(l.id) ?? [])
    ),
  }
}

const getCuratorCached = unstable_cache(fetchCurator, ['curated-curator'], {
  revalidate: STATIC_REVALIDATE,
  tags: [CACHE_TAGS.CURATED],
})

export async function getCuratorBySlug(slug: string): Promise<CuratorDetail | null> {
  return getCuratorCached(slug, await getLocale())
}
// #endregion

// ────────────────────────────────────────────────────
// #region 목록 상세
interface ItemRow {
  id: string
  content_id: string | null
  raw_title: string
  raw_creator: string | null
  rank: number | null
  year: number | null
  note: string | null
  note_en: string | null
  sort_order: number
  contents: { id: string; type: string; content_locales: ContentLocaleRow[] | null } | null
}

async function fetchCuratedList(listSlug: string, locale: string, showAll: boolean): Promise<CuratedListDetail | null> {
  const supabase = createStaticClient()

  const { data: list } = await supabase.from('curated_lists').select(LIST_COLS).eq('slug', listSlug).maybeSingle()
  if (!list) return null
  const l = list as ListRow

  const { data: curator } = await supabase.from('curators').select(CURATOR_COLS).eq('id', l.curator_id).maybeSingle()
  if (!curator) return null
  const c = curator as CuratorRow

  const [{ data: items, count: totalItems }, { data: siblings }] = await Promise.all([
    supabase
      .from('curated_list_items')
      .select(
        `id, content_id, raw_title, raw_creator, rank, year, note, note_en, sort_order,
         contents(id, type, content_locales(${CL_SELECT_LIST}))`,
        { count: 'exact' }
      )
      .eq('list_id', l.id)
      .eq('hidden', false)
      .order('sort_order', { ascending: true })
      .order('id', { ascending: true })
      .limit(showAll ? MAX_ITEMS_PER_LIST : INITIAL_ITEMS),
    // 같은 계열의 다른 해 — 연도 전환용
    l.series_key
      ? supabase
          .from('curated_lists')
          .select('slug, title, title_en, edition, published_year')
          .eq('series_key', l.series_key)
          .order('published_year', { ascending: false, nullsFirst: false })
      : Promise.resolve({ data: null }),
  ])

  const itemRows = (items ?? []) as unknown as ItemRow[]
  const mapped: CuratedListItem[] = itemRows.map((it) => {
    const content = Array.isArray(it.contents) ? it.contents[0] : it.contents
    const flat = content ? flattenLocales(content.content_locales, locale) : null
    return {
      id: it.id,
      rank: it.rank,
      year: it.year,
      note: pickOrNull(it.note, it.note_en, locale),
      rawTitle: it.raw_title,
      rawCreator: it.raw_creator,
      // 우리가 가진 작품이면 정식 제목·표지로, 아니면 목록 원문 표기 그대로 보여준다
      contentId: content?.id ?? null,
      title: flat?.title || it.raw_title,
      creator: flat?.creator || it.raw_creator,
      thumbnailUrl: flat?.thumbnail_url ?? null,
      contentType: content?.type ?? null,
      // 두 판을 함께 실어 보낸다 — 공통 작품 카드가 이걸로 한국어판·영문판 전환을 그린다
      titleKo: flat?.title_ko ?? null,
      titleEn: flat?.title_en ?? null,
      creatorEn: flat?.creator_en ?? null,
      thumbnailEn: flat?.thumbnail_en ?? null,
      hasEnEdition: flat?.has_en_edition ?? false,
    }
  })

  const seriesRows = (siblings ?? []) as
    | { slug: string; title: string; title_en: string | null; edition: string | null; published_year: number | null }[]
    | null

  const total = totalItems ?? mapped.length

  return {
    // 편수는 화면에 그린 수가 아니라 목록이 담은 전체 수다(잘라 보내도 「100편」은 그대로여야 한다)
    ...toListSummary(l, locale, total, c.slug),
    method: pickOrNull(l.method, l.method_en, locale),
    sourceUrl: l.source_url,
    curator: toCuratorSummary(c, locale, 0),
    items: mapped,
    remainingCount: Math.max(0, total - mapped.length),
    linkedCount: mapped.filter((i) => i.contentId).length,
    siblings:
      seriesRows?.map((s) => ({
        slug: s.slug,
        title: pick(s.title, s.title_en, locale),
        edition: s.edition,
        publishedYear: s.published_year,
        isCurrent: s.slug === l.slug,
      })) ?? [],
  }
}

const getCuratedListCached = unstable_cache(fetchCuratedList, ['curated-list'], {
  revalidate: STATIC_REVALIDATE,
  tags: [CACHE_TAGS.CURATED, CACHE_TAGS.CONTENTS],
})

export async function getCuratedList(listSlug: string, showAll = false): Promise<CuratedListDetail | null> {
  return getCuratedListCached(listSlug, await getLocale(), showAll)
}
// #endregion

// ────────────────────────────────────────────────────
// #region 작품 상세의 선정 이력 (역조회)
interface EntryRow {
  rank: number | null
  year: number | null
  curated_lists: {
    slug: string
    title: string
    title_en: string | null
    edition: string | null
    published_year: number | null
    is_ranked: boolean
    curators: { slug: string; name: string; name_en: string | null; kind: string; logo_url: string | null } | null
  } | null
}

async function fetchCuratedEntriesForContent(contentId: string, locale: string): Promise<ContentCuratedEntry[]> {
  const supabase = createStaticClient()

  const { data } = await supabase
    .from('curated_list_items')
    .select(
      `rank, year,
       curated_lists!inner(slug, title, title_en, edition, published_year, is_ranked,
         curators!inner(slug, name, name_en, kind, logo_url))`
    )
    .eq('content_id', contentId)
    .eq('hidden', false)

  const rows = (data ?? []) as unknown as EntryRow[]

  return rows
    .filter((r) => r.curated_lists?.curators)
    .map((r) => {
      const list = r.curated_lists!
      const cur = list.curators!
      return {
        listSlug: list.slug,
        listTitle: pick(list.title, list.title_en, locale),
        edition: list.edition,
        publishedYear: list.published_year,
        curatorSlug: cur.slug,
        curatorName: pick(cur.name, cur.name_en, locale),
        curatorKind: cur.kind,
        curatorLogoUrl: cur.logo_url,
        rank: list.is_ranked ? r.rank : null,
        year: r.year,
      }
    })
    .sort((a, b) => {
      // 순위가 높은 선정을 앞에 — 훈장으로 읽히는 순서
      if (a.rank != null && b.rank != null) return a.rank - b.rank
      if (a.rank != null) return -1
      if (b.rank != null) return 1
      return (b.publishedYear ?? 0) - (a.publishedYear ?? 0)
    })
}

export async function getCuratedEntriesForContent(contentId: string, locale?: string): Promise<ContentCuratedEntry[]> {
  const resolvedLocale = locale ?? (await getLocale())
  return cachedDetail(
    CACHE_TAGS.CURATED,
    contentId,
    ['curated-entries-for-content-v2', contentId, resolvedLocale],
    () => fetchCuratedEntriesForContent(contentId, resolvedLocale),
  )
}
// #endregion
