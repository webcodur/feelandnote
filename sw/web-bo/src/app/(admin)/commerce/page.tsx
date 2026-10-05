import type { Metadata } from 'next'
import { createClient } from '@/lib/db/server'
import { loadGa4Commerce } from '@/lib/ga4'
import CommerceClient, { type CommerceEventRow, type ContentTitleMap } from './CommerceClient'

export const metadata: Metadata = {
  title: '수익화 클릭',
}

/* 수익화 장부 — 사용자 웹의 구매·감상처 클릭과 창 열림을 commerce_events에서 읽는다.
   구매·정산은 제휴사 화면(yes24 애드온, 링크프라이스 AC)에만 있으므로 이 화면은 「무엇을 눌렀나」까지다. */

const DAY_OPTIONS = [7, 30, 90] as const
const ROW_LIMIT = 20000
const PER_PAGE = 50

function parseDays(value: string | undefined): number {
  const parsed = Number(value)
  return (DAY_OPTIONS as readonly number[]).includes(parsed) ? parsed : 30
}

function periodStartIso(days: number): string {
  return new Date(Date.now() - days * 24 * 3600_000).toISOString()
}

export default async function CommercePage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; kind?: string; platform?: string; page?: string }>
}) {
  const params = await searchParams
  const days = parseDays(params.days)
  const kind = params.kind === 'open' || params.kind === 'click' ? params.kind : ''
  const platform = params.platform ?? ''
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)

  const since = periodStartIso(days)

  const db = await createClient()
  let query = db
    .from('commerce_events')
    .select('id,created_at,kind,platform,target,screen,locale,content_id,content_type,edition_id,external_ref')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(ROW_LIMIT)
  if (kind) query = query.eq('kind', kind)
  if (platform) query = query.eq('platform', platform)

  const { data, error } = await query
  if (error) throw new Error(`Failed to load commerce events: ${error.message}`)
  const events = (data ?? []) as CommerceEventRow[]

  // 작품 제목은 한국어 locale에서 읽는다 — 차트 항목 같은 external_ref는 우리 작품이 아니라 제목이 없다
  const contentIds = [...new Set(events.map(e => e.content_id).filter((id): id is string => Boolean(id)))]
  const titles: ContentTitleMap = {}
  if (contentIds.length) {
    const { data: locales } = await db
      .from('content_locales')
      .select('content_id,title,creator')
      .eq('locale', 'ko')
      .in('content_id', contentIds)
    for (const row of locales ?? []) {
      if (row.content_id) titles[row.content_id] = { title: row.title, creator: row.creator }
    }
  }

  // 인물 도서 판본은 판본 제목이 곧 표시명이다
  const editionIds = [...new Set(events.map(e => e.edition_id).filter((id): id is number => typeof id === 'number'))]
  const editionTitles: Record<number, string> = {}
  if (editionIds.length) {
    const { data: editions } = await db
      .from('figure_book_editions')
      .select('id,title')
      .in('id', editionIds)
    for (const row of editions ?? []) {
      if (typeof row.id === 'number' && row.title) editionTitles[row.id] = row.title
    }
  }

  // GA4 과거 기록 — 내부 장부는 배포 후부터 쌓이므로 이전 구간은 GA4로 본다.
  // pagePath의 /content/{id}·/celeb/{slug}를 작품·인물 이름으로 풀어 보여준다
  const ga4 = await loadGa4Commerce(days)
  if (ga4) {
    const gaContentIds = new Set<string>()
    const gaCelebSlugs = new Set<string>()
    for (const p of ga4.pages) {
      const m = p.path.match(/\/(content|celeb)\/([^/?]+)/)
      if (m?.[1] === 'content') gaContentIds.add(m[2])
      else if (m?.[1] === 'celeb') gaCelebSlugs.add(decodeURIComponent(m[2]))
    }
    const labels = new Map<string, string>()
    if (gaContentIds.size) {
      const { data: gaLocales } = await db
        .from('content_locales')
        .select('content_id,title')
        .eq('locale', 'ko')
        .in('content_id', [...gaContentIds])
      for (const row of gaLocales ?? []) {
        if (row.content_id && row.title) labels.set(`content:${row.content_id}`, row.title)
      }
    }
    if (gaCelebSlugs.size) {
      const { data: celebRows } = await db
        .from('celebs')
        .select('slug,nickname')
        .in('slug', [...gaCelebSlugs])
      for (const row of celebRows ?? []) {
        if (row.slug && row.nickname) labels.set(`celeb:${row.slug}`, row.nickname)
      }
    }
    for (const p of ga4.pages) {
      const m = p.path.match(/\/(content|celeb)\/([^/?]+)/)
      if (m) p.label = labels.get(`${m[1]}:${decodeURIComponent(m[2])}`) ?? null
    }
  }

  const totalPages = Math.max(1, Math.ceil(events.length / PER_PAGE))
  const safePage = Math.min(page, totalPages)
  const pageEvents = events.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE)

  return (
    <CommerceClient
      ga4={ga4}
      events={pageEvents}
      allEvents={events}
      titles={titles}
      editionTitles={editionTitles}
      days={days}
      kind={kind}
      platform={platform}
      page={safePage}
      totalPages={totalPages}
      total={events.length}
      truncated={events.length >= ROW_LIMIT}
    />
  )
}
