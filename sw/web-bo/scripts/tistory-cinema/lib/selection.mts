import { NOT_A_REVIEW, usableReview } from './quality.mts'
import type { SupabaseClient } from '@supabase/supabase-js'

export const MIN_VOICES = 3
export const MIN_FILMS = 1

/** 인물 편은 짧은 목록 기록도 쓴다. 이미 감상이 아니라고 확인된 관계만 제외한다. */
export const personReview = (review: string | null | undefined, id: string) =>
  !!review?.trim() && !NOT_A_REVIEW.has(id)
export const FEATURED_LISTS = [
  'afi-100-years-100-movies', 'sight-and-sound-greatest-films-2022', 'academy-best-picture',
  'bbc-greatest-comedies', 'timeout-100-horror-films', 'cannes-palme-dor',
  'venice-golden-lion', 'blue-dragon-best-film',
] as const

export type SelectionData = {
  contents: { id: string; external_id: string | null; metadata?: { voteAverage?: number; voteCount?: number } | null; release_date?: string | null }[]
  locales: { content_id: string; title: string; locale: string; creator?: string | null; thumbnail_url?: string | null }[]
  celebs: { id: string; slug: string | null; nickname: string; publication_status?: string; profession?: string | null; title?: string | null; headline?: string | null; bio?: string | null; avatar_url?: string | null }[]
  reviews: { id: string; celeb_id: string; content_id: string; review: string | null; source_url?: string | null }[]
  lists: { slug: string; title: string }[]
}
export type Job = { kind: 'work' | 'person' | 'list'; name: string; arg: string[]; n: number; id?: string }

type SelectQuery = ReturnType<ReturnType<SupabaseClient['from']>['select']>
export async function readRows<T>(db: SupabaseClient, table: string, columns: string, filter?: (query: SelectQuery) => SelectQuery): Promise<T[]> {
  const rows: T[] = []
  for (let i = 0; ; i += 1000) {
    // Column strings are chosen at runtime; retain the filter interface without parsing them as literal SQL types.
    let query = db.from(table).select(columns).range(i, i + 999) as unknown as SelectQuery
    if (filter) query = filter(query)
    const { data, error } = await query
    if (error) throw error
    rows.push(...data as T[])
    if (data.length < 1000) return rows
  }
}

export async function loadSelectionData(db: SupabaseClient): Promise<SelectionData> {
  const [contents, locales, celebs, reviews, lists] = await Promise.all([
    readRows<SelectionData['contents'][number]>(db, 'contents', 'id, external_id, metadata, release_date', (q) => q.eq('type', 'VIDEO')),
    readRows<SelectionData['locales'][number]>(db, 'content_locales', 'content_id, title, locale, creator, thumbnail_url', (q) => q.eq('locale', 'ko')),
    readRows<SelectionData['celebs'][number]>(db, 'celebs', 'id, slug, nickname, publication_status, profession, title, headline, bio, avatar_url'),
    readRows<SelectionData['reviews'][number]>(db, 'celeb_contents', 'id, celeb_id, content_id, review, source_url'),
    readRows<SelectionData['lists'][number]>(db, 'curated_lists', 'slug, title'),
  ])
  return { contents, locales, celebs, reviews, lists }
}

export const safeName = (name: string) => name.replace(/[\\/:*?"<>|]/g, '').trim()

/** 재고와 제작이 같은 글을 가리키도록 기존 batch의 선정 기준을 한 곳에서 적용한다. */
export function selectCandidates(data: SelectionData) {
  const movie = new Set(data.contents.filter((c) => (c.external_id ?? '').startsWith('tmdb-movie-')).map((c) => c.id))
  const titles = new Map(data.locales.filter((l) => l.locale === 'ko').map((l) => [l.content_id, l.title]))
  const film = data.reviews.filter((r) => movie.has(r.content_id))
  const good = film.filter((r) => usableReview(r.review, r.id))
  const byWork = new Map<string, number>()
  const byCeleb = new Map<string, number>()
  for (const row of good) {
    byWork.set(row.content_id, (byWork.get(row.content_id) ?? 0) + 1)
  }
  const personReviews = film.filter((r) => personReview(r.review, r.id))
  for (const row of personReviews) {
    byCeleb.set(row.celeb_id, (byCeleb.get(row.celeb_id) ?? 0) + 1)
  }

  const jobs: Job[] = []
  const bestByTitle = new Map<string, { id: string; n: number }>()
  for (const [id, n] of byWork) {
    if (n < MIN_VOICES) continue
    const name = safeName(titles.get(id) ?? '')
    if (!name) continue
    const current = bestByTitle.get(name)
    if (!current || n > current.n) bestByTitle.set(name, { id, n })
  }
  for (const [name, { id, n }] of bestByTitle) jobs.push({ kind: 'work', name, arg: ['--id', id, '--pick', '4'], n })

  const people = new Map(data.celebs.map((celeb) => [celeb.id, celeb]))
  const nameCounts = new Map<string, number>()
  for (const id of byCeleb.keys()) {
    const celeb = people.get(id)
    if (celeb?.slug) {
      const name = safeName(celeb.nickname)
      nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1)
    }
  }
  for (const [id, n] of byCeleb) {
    const celeb = people.get(id)
    if (n < MIN_FILMS || !celeb?.slug) continue
    const base = safeName(celeb.nickname)
    const name = `인물-${base}${(nameCounts.get(base) ?? 0) > 1 ? `-${safeName(celeb.slug)}` : ''}`
    jobs.push({ kind: 'person', id, name, arg: ['--slug', celeb.slug, '--pick', '6'], n })
  }
  for (const slug of FEATURED_LISTS) {
    const list = data.lists.find((row) => row.slug === slug)
    if (list) jobs.push({ kind: 'list', name: `목록-${safeName(list.title)}`, arg: ['--slug', slug, '--pick', '5'], n: 0 })
  }
  return { jobs, film, good, personReviews, byWork, byCeleb }
}
