'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { revalidateWebCache } from '@/lib/revalidate-web'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { TIMELINE_KINDS } from '@/constants/timeline'

/* 인물 생애 행적 편집 — 규격은 docs/project/celeb-journey.md 가 SSoT다.
   조사 산출물(docs/celeb-data/timeline/<slug>.json)을 스크립트로 넣는 경로와 별개로,
   화면에서 한 건씩 고치는 창구다. 스크립트 재적재는 source='research' 행만 갈아끼우므로
   여기서 손댄 행은 source 를 'manual' 로 바꿔 두어야 덮이지 않는다. */

export interface TimelineEvent {
  id: string
  celeb_id: string
  year: number | null
  year_end: number | null
  month: number | null
  day: number | null
  sequence_label: string | null
  sequence_label_en: string | null
  title: string
  title_en: string | null
  description: string | null
  description_en: string | null
  kind: string
  place_name: string | null
  place_name_en: string | null
  lat: number | null
  lng: number | null
  place_qid: string | null
  source: string
  source_url: string | null
  sort_order: number
}

export interface TimelineCeleb {
  id: string
  slug: string | null
  nickname: string
  avatar_url: string | null
  total_score: number | null
  event_count: number
  coord_count: number
}

/** 행적을 가진 인물 목록. 편집 대상 고르기용 */
export async function getTimelineCelebs(): Promise<TimelineCeleb[]> {
  const supabase = await createClient()

  // 행적 전량을 나눠 받는다 — PostgREST 는 1,000행에서 조용히 자른다
  const rows: { celeb_id: string; lat: number | null }[] = []
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase
      .from('celeb_timeline_events')
      .select('celeb_id, lat')
      .order('id')
      .range(from, from + 499)
    if (error) throw error
    rows.push(...(data ?? []))
    if ((data?.length ?? 0) < 500) break
  }

  const stat = new Map<string, { n: number; c: number }>()
  for (const r of rows) {
    const s = stat.get(r.celeb_id) ?? { n: 0, c: 0 }
    s.n += 1
    if (r.lat != null) s.c += 1
    stat.set(r.celeb_id, s)
  }
  if (stat.size === 0) return []

  const ids = [...stat.keys()]
  const profiles: { id: string; slug: string | null; nickname: string; avatar_url: string | null }[] = []
  // id 목록을 통째로 in() 에 실으면 URL 길이 한도에 걸린다(실측 462개에서 실패)
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, slug, nickname, avatar_url')
      .in('id', ids.slice(i, i + 200))
    if (error) throw error
    profiles.push(...(data ?? []))
  }

  const scores = new Map<string, number>()
  for (let i = 0; i < ids.length; i += 200) {
    const { data } = await supabase
      .from('celeb_influence')
      .select('celeb_id, total_score')
      .in('celeb_id', ids.slice(i, i + 200))
    for (const s of data ?? []) scores.set(s.celeb_id, s.total_score)
  }

  return profiles
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      nickname: p.nickname,
      avatar_url: p.avatar_url,
      total_score: scores.get(p.id) ?? null,
      event_count: stat.get(p.id)?.n ?? 0,
      coord_count: stat.get(p.id)?.c ?? 0,
    }))
    .sort((a, b) => (b.total_score ?? 0) - (a.total_score ?? 0) || a.nickname.localeCompare(b.nickname))
}

/** 인물 한 명의 행적 전체 */
export async function getTimelineEvents(celebId: string): Promise<TimelineEvent[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('celeb_timeline_events')
    .select('*')
    .eq('celeb_id', celebId)
    .order('year', { nullsFirst: false })
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as TimelineEvent[]
}

type EventInput = Omit<TimelineEvent, 'id' | 'celeb_id' | 'source'>

function validate(e: Partial<EventInput>) {
  const hasYear = Number.isInteger(e.year)
  const hasSequence = !!e.sequence_label?.trim()
  if (hasYear === hasSequence)
    throw new Error('연도 또는 서사 단계 가운데 하나만 넣으세요.')
  if (!e.title?.trim()) throw new Error('제목을 넣으세요.')
  if (!hasYear && (e.year_end != null || e.month != null || e.day != null))
    throw new Error('서사 단계에는 연도·월·일을 함께 넣을 수 없습니다.')
  if (e.year_end != null && e.year != null && e.year_end < e.year)
    throw new Error('끝 연도가 시작 연도보다 앞설 수 없습니다.')
  const hasLat = e.lat != null
  const hasLng = e.lng != null
  if (hasLat !== hasLng) throw new Error('위도와 경도는 둘 다 넣거나 둘 다 비워야 합니다.')
  if (hasLat && (e.lat! < -90 || e.lat! > 90)) throw new Error('위도가 범위를 벗어났습니다(-90~90).')
  if (hasLng && (e.lng! < -180 || e.lng! > 180)) throw new Error('경도가 범위를 벗어났습니다(-180~180).')
  if (hasLat && !e.place_name?.trim()) throw new Error('좌표를 넣었으면 장소 이름도 넣으세요.')
  if (e.kind && !(TIMELINE_KINDS as readonly string[]).includes(e.kind))
    throw new Error(`종류 '${e.kind}'는 쓸 수 없는 값입니다.`)
}

async function afterWrite() {
  revalidatePath('/celebs/timeline', 'layout')
  await revalidateWebCache(CACHE_TAGS.CELEBS)
}

/** 한 건 수정. 손댄 행은 source='manual'이 되어 스크립트 재적재에도 살아남는다 */
export async function updateTimelineEvent(eventId: string, data: Partial<EventInput>): Promise<void> {
  validate(data)
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('celeb_timeline_events')
    .update({ ...data, source: 'manual' })
    .eq('id', eventId)
  if (error) throw error
  await afterWrite()
}

export async function createTimelineEvent(celebId: string, data: EventInput): Promise<string> {
  validate(data)
  const supabase = createAdminClient()
  const { data: row, error } = await supabase
    .from('celeb_timeline_events')
    .insert({ ...data, celeb_id: celebId, source: 'manual' })
    .select('id')
    .single()
  if (error) throw error
  await afterWrite()
  return row.id
}

export async function deleteTimelineEvent(eventId: string): Promise<void> {
  const supabase = createAdminClient()
  const { error } = await supabase.from('celeb_timeline_events').delete().eq('id', eventId)
  if (error) throw error
  await afterWrite()
}

/** 지명 → 위키데이터 좌표 후보. 고르는 것은 사람이다 — 동명 지명 오배정이 잦다 */
export interface PlaceCandidate {
  qid: string
  label: string
  labelKo: string | null
  description: string
  lat: number
  lng: number
}

export async function searchPlace(term: string, lang: 'en' | 'ko' = 'en'): Promise<PlaceCandidate[]> {
  const q = term.trim()
  if (!q) return []
  const UA = { 'user-agent': 'feelandnote-timeline-geocode/1.0 (webcodur@gmail.com)' }

  const searchUrl =
    `https://www.wikidata.org/w/api.php?action=wbsearchentities` +
    `&search=${encodeURIComponent(q)}&language=${lang}&uselang=${lang}&limit=8&format=json`
  const found = await fetch(searchUrl, { headers: UA, signal: AbortSignal.timeout(15000) })
  if (!found.ok) throw new Error(`장소 검색에 실패했습니다 (${found.status})`)
  const hits: { id: string; label: string; description?: string }[] =
    (await found.json()).search ?? []
  if (hits.length === 0) return []

  const sparql = `SELECT ?item ?ko ?coord WHERE {
    VALUES ?item { ${hits.map((h) => 'wd:' + h.id).join(' ')} }
    ?item wdt:P625 ?coord .
    OPTIONAL { ?item rdfs:label ?ko . FILTER(LANG(?ko)='ko') }
  }`
  const res = await fetch('https://query.wikidata.org/sparql?format=json', {
    method: 'POST',
    headers: { ...UA, 'content-type': 'application/x-www-form-urlencoded', accept: 'application/sparql-results+json' },
    body: 'query=' + encodeURIComponent(sparql),
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`좌표 조회에 실패했습니다 (${res.status})`)

  const coords = new Map<string, { ko: string | null; lat: number; lng: number }>()
  for (const b of (await res.json()).results.bindings) {
    const id = b.item.value.split('/').pop()!
    if (coords.has(id)) continue
    // Point(경도 위도) 순서다 — 뒤집으면 엉뚱한 곳에 찍힌다
    const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(b.coord.value)
    if (!m) continue
    coords.set(id, { ko: b.ko?.value ?? null, lng: Number(m[1]), lat: Number(m[2]) })
  }

  return hits
    .filter((h) => coords.has(h.id))
    .map((h) => {
      const c = coords.get(h.id)!
      return {
        qid: h.id,
        label: h.label,
        labelKo: c.ko,
        description: h.description ?? '',
        lat: c.lat,
        lng: c.lng,
      }
    })
}
