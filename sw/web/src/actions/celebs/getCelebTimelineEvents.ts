'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/supabase/static'
import { STATIC_REVALIDATE } from '@/lib/cache'

/* ── 인물 생애 행적 ──
   좌표를 가진 항목만 활동반경 지도에 뜬다. 좌표 없는 항목도 연표에는 남는다.
   국가별 연대기(`getCelebTimeline`)와 다른 물건이다 — 그쪽은 생몰년만 쓴다. */

export interface CelebTimelineEvent {
  id: string
  year: number
  yearEnd: number | null
  month: number | null
  title: string
  description: string | null
  kind: string
  placeName: string | null
  lat: number | null
  lng: number | null
  sourceUrl: string | null
}

interface EventRow {
  id: string
  year: number
  year_end: number | null
  month: number | null
  title: string
  title_en: string | null
  description: string | null
  description_en: string | null
  kind: string
  place_name: string | null
  place_name_en: string | null
  lat: number | null
  lng: number | null
  source_url: string | null
  sort_order: number
}

async function fetchEvents(celebId: string): Promise<EventRow[]> {
  const supabase = createStaticClient()
  const { data, error } = await supabase
    .from('celeb_timeline_events')
    .select(
      'id, year, year_end, month, title, title_en, description, description_en, kind, place_name, place_name_en, lat, lng, source_url, sort_order',
    )
    .eq('celeb_id', celebId)
    .order('year')
    .order('sort_order')
    .overrideTypes<EventRow[], { merge: false }>()

  // 조용한 폴백 금지 — 조회가 깨지면 빈 연표를 정상처럼 보여주지 않고 드러낸다.
  if (error) throw new Error(`celeb_timeline_events 조회 실패: ${error.message}`)
  return data ?? []
}

/** 인물 한 명의 행적을 연도순으로 반환한다. 없으면 빈 배열. */
export async function getCelebTimelineEvents(
  celebId: string,
  locale: string = 'ko',
): Promise<CelebTimelineEvent[]> {
  const isEn = locale === 'en'
  const rows = await unstable_cache(
    () => fetchEvents(celebId),
    ['celeb-timeline-events', celebId],
    { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.CELEBS] },
  )()

  return rows.map((row) => ({
    id: row.id,
    year: row.year,
    yearEnd: row.year_end,
    month: row.month,
    title: isEn && row.title_en ? row.title_en : row.title,
    description: isEn && row.description_en ? row.description_en : row.description,
    kind: row.kind,
    placeName: isEn && row.place_name_en ? row.place_name_en : row.place_name,
    lat: row.lat,
    lng: row.lng,
    sourceUrl: row.source_url,
  }))
}
