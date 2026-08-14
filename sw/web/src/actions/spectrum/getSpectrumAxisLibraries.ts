'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { STATIC_REVALIDATE, withQueryFallback } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import {
  ABILITY_KEYS,
  INNER_VIRTUE_KEYS,
  OUTER_VIRTUE_KEYS,
  TENDENCY_KEYS,
} from '@/lib/spectrum/constants'
import type { SpectrumStats } from '@/lib/spectrum/types'

// ─── 기질의 서재 ───
// 축마다 극단 집단(상·하위 10%)이 공통으로 감상한 작품을 추린다.
// "오만한 이들의 책장에 차라투스트라가 꽂혀 있다" — 인물 극단 화면(비범한 기록가)에
// 같은 축의 책을 붙여, 인물에서 작품으로 건너가는 다리를 만든다.

const AXIS_KEYS = [
  ...ABILITY_KEYS,
  ...INNER_VIRTUE_KEYS,
  ...OUTER_VIRTUE_KEYS,
  ...TENDENCY_KEYS,
] as const

type AxisKey = (typeof AXIS_KEYS)[number]

/** 극단 집단의 크기 — 서재 보유자 중 상·하위 10% (표본이 작아도 최소 인원은 확보) */
const EXTREME_RATIO = 0.1
const EXTREME_MIN_COUNT = 12
/** 공통 감상작 자격 — 집단 안에서 2명 이상이 감상 */
const MIN_SHARED_READERS = 2
/** 축·방향당 작품 수 */
const TOP_WORKS_LIMIT = 6
/** 카드에 얼굴을 보여줄 독자 수 */
const READER_PREVIEW_LIMIT = 4

export interface AxisLibraryReader {
  id: string
  slug: string | null
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
}

export interface AxisLibraryWork {
  content_id: string
  type: string
  title: string
  title_en: string | null
  thumbnail_url: string | null
  thumbnail_en: string | null
  readerCount: number
  /** 집단 안에서 이 작품을 감상한 인물 — 축 점수가 극단인 순 */
  readers: AxisLibraryReader[]
}

export interface SpectrumAxisLibrary {
  axis: AxisKey
  /** 축 점수가 높은 극단(성향은 양수 극)의 공통 감상작 */
  high: AxisLibraryWork[]
  /** 축 점수가 낮은 극단(성향은 음수 극)의 공통 감상작 */
  low: AxisLibraryWork[]
}

interface PersonRow {
  celeb_id: string
  celeb:
    | { slug: string | null; nickname: string | null; nickname_en: string | null; avatar_url: string | null; publication_status: string | null }
    | { slug: string | null; nickname: string | null; nickname_en: string | null; avatar_url: string | null; publication_status: string | null }[]
    | null
}

type PersonScoreRow = PersonRow & Partial<Record<AxisKey, number | null>>

interface LibraryRow {
  celeb_id: string
  content_id: string
  content:
    | { type: string | null; content_locales: { locale: string; title: string | null; thumbnail_url: string | null }[] | null }
    | { type: string | null; content_locales: { locale: string; title: string | null; thumbnail_url: string | null }[] | null }[]
    | null
}

interface Person {
  reader: AxisLibraryReader
  stats: SpectrumStats
}

function pickOne<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

async function fetchPeople(): Promise<Person[]> {
  const supabase = createStaticClient()
  const rows = await selectAllPages<PersonScoreRow>((from, to) =>
    supabase
      .from('celeb_persona')
      .select(`
        celeb_id, ${AXIS_KEYS.join(', ')},
        celeb:celebs!celeb_persona_celebs_fkey (slug, nickname, nickname_en, avatar_url, publication_status)
      `)
      .order('celeb_id')
      .range(from, to) as unknown as PromiseLike<{
      data: PersonScoreRow[] | null
      error: { message: string } | null
    }>
  )

  return rows.flatMap((row) => {
    const profile = pickOne(row.celeb)
    if (profile?.publication_status !== 'active' || !profile.nickname) return []
    return [{
      reader: {
        id: row.celeb_id,
        slug: profile.slug,
        nickname: profile.nickname,
        nickname_en: profile.nickname_en,
        avatar_url: profile.avatar_url,
      },
      stats: Object.fromEntries(
        AXIS_KEYS.map((axis) => [axis, row[axis] ?? 0]),
      ) as unknown as SpectrumStats,
    }]
  })
}

interface WorkMeta {
  type: string
  title: string
  title_en: string | null
  thumbnail_url: string | null
  thumbnail_en: string | null
}

async function fetchLibraries(): Promise<{
  byCeleb: Map<string, string[]>
  workMeta: Map<string, WorkMeta>
}> {
  const supabase = createStaticClient()
  const rows = await selectAllPages<LibraryRow>((from, to) =>
    supabase
      .from('celeb_contents')
      .select(`
        celeb_id, content_id,
        content:contents!celeb_contents_content_id_fkey (
          type,
          content_locales (locale, title, thumbnail_url)
        )
      `)
      .not('review', 'is', null)
      .neq('review', '')
      .eq('visibility', 'public')
      .order('id')
      .range(from, to) as unknown as PromiseLike<{
      data: LibraryRow[] | null
      error: { message: string } | null
    }>
  )

  const byCeleb = new Map<string, string[]>()
  const workMeta = new Map<string, WorkMeta>()

  for (const row of rows) {
    const content = pickOne(row.content)
    if (!content) continue

    if (!workMeta.has(row.content_id)) {
      const locales = content.content_locales ?? []
      const ko = locales.find((entry) => entry.locale === 'ko')
      const en = locales.find((entry) => entry.locale === 'en')
      const title = ko?.title ?? en?.title
      if (!title) continue
      workMeta.set(row.content_id, {
        type: content.type ?? 'BOOK',
        title,
        title_en: en?.title ?? null,
        thumbnail_url: ko?.thumbnail_url ?? en?.thumbnail_url ?? null,
        thumbnail_en: en?.thumbnail_url ?? null,
      })
    }

    const list = byCeleb.get(row.celeb_id) ?? []
    list.push(row.content_id)
    byCeleb.set(row.celeb_id, list)
  }

  return { byCeleb, workMeta }
}

/** 극단 집단이 공통으로 감상한 작품을 집계한다. group은 축 극단 순으로 정렬돼 들어온다 */
function collectSharedWorks(
  group: Person[],
  byCeleb: Map<string, string[]>,
  workMeta: Map<string, WorkMeta>,
): AxisLibraryWork[] {
  const readersByWork = new Map<string, AxisLibraryReader[]>()

  for (const person of group) {
    for (const contentId of byCeleb.get(person.reader.id) ?? []) {
      if (!workMeta.has(contentId)) continue
      const readers = readersByWork.get(contentId) ?? []
      readers.push(person.reader)
      readersByWork.set(contentId, readers)
    }
  }

  return [...readersByWork.entries()]
    .filter(([, readers]) => readers.length >= MIN_SHARED_READERS)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .slice(0, TOP_WORKS_LIMIT)
    .map(([contentId, readers]) => ({
      content_id: contentId,
      ...workMeta.get(contentId)!,
      readerCount: readers.length,
      readers: readers.slice(0, READER_PREVIEW_LIMIT),
    }))
}

async function fetchSpectrumAxisLibraries(): Promise<SpectrumAxisLibrary[]> {
  const [people, { byCeleb, workMeta }] = await Promise.all([
    fetchPeople(),
    fetchLibraries(),
  ])

  // 서재가 있는 인물만 극단 집단 후보다 — 서재 없는 극단 인물이 자리를 차지하면
  // 공통 감상작이 실제보다 얇아진다
  const owners = people.filter((person) => byCeleb.has(person.reader.id))
  const groupSize = Math.max(EXTREME_MIN_COUNT, Math.floor(owners.length * EXTREME_RATIO))
  const isTendency = (axis: AxisKey) =>
    (TENDENCY_KEYS as readonly string[]).includes(axis)

  return AXIS_KEYS.map((axis) => {
    const sortedDesc = [...owners].sort((a, b) => b.stats[axis] - a.stats[axis])
    const sortedAsc = [...sortedDesc].reverse()

    // 성향 축은 방향이 의미다 — 양극 집단은 양수, 음극 집단은 음수인 인물만
    const highGroup = (isTendency(axis)
      ? sortedDesc.filter((person) => person.stats[axis] > 0)
      : sortedDesc
    ).slice(0, groupSize)
    const lowGroup = (isTendency(axis)
      ? sortedAsc.filter((person) => person.stats[axis] < 0)
      : sortedAsc
    ).slice(0, groupSize)

    return {
      axis,
      high: collectSharedWorks(highGroup, byCeleb, workMeta),
      low: collectSharedWorks(lowGroup, byCeleb, workMeta),
    }
  })
}

const getCachedSpectrumAxisLibraries = unstable_cache(
  fetchSpectrumAxisLibraries,
  ['spectrum-axis-libraries'],
  // celeb_persona 점수 + celeb_contents 감상 관계 + content_locales 메타
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.SPECTRUM, CACHE_TAGS.CELEBS, CACHE_TAGS.CONTENTS] }
)

export async function getSpectrumAxisLibraries(): Promise<SpectrumAxisLibrary[]> {
  return withQueryFallback('getSpectrumAxisLibraries', () => getCachedSpectrumAxisLibraries(), [])
}
