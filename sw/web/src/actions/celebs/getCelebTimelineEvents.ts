'use server'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/db/static'
import { cachedDetail } from '@/lib/cache'

/* ── 인물 타임라인 ──
   좌표를 가진 항목만 활동반경 지도에 뜬다. 좌표 없는 항목도 연표에는 남는다.
   국가별 연대기(`getCelebTimeline`)와 다른 물건이다 — 그쪽은 생몰년만 쓴다. */

export interface CelebTimelineEvent {
  id: string
  year: number | null
  yearEnd: number | null
  sequenceLabel: string | null
  title: string
  description: string | null
  kind: string
  placeName: string | null
  lat: number | null
  lng: number | null
}

interface EventRow {
  id: string
  year: number | null
  year_end: number | null
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
  sort_order: number
}

async function fetchEvents(celebId: string): Promise<EventRow[]> {
  const db = createStaticClient()
  const { data, error } = await db
    .from('celeb_timeline_events')
    .select(
      'id, year, year_end, sequence_label, sequence_label_en, title, title_en, description, description_en, kind, place_name, place_name_en, lat, lng, sort_order',
    )
    .eq('celeb_id', celebId)
    .order('sort_order')
    .order('id')
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
  // 인물 한 명의 연표 — 항목 태그를 달아 그 한 명만 비울 수 있게 한다
  const rows = await cachedDetail(CACHE_TAGS.CELEBS, celebId, ['celeb-timeline-events', celebId], () =>
    fetchEvents(celebId),
  )

  return rows.map((row) => ({
    id: row.id,
    year: row.year,
    yearEnd: row.year_end,
    sequenceLabel:
      isEn && row.sequence_label_en ? row.sequence_label_en : row.sequence_label,
    title: isEn && row.title_en ? row.title_en : row.title,
    description: isEn && row.description_en ? row.description_en : row.description,
    kind: row.kind,
    placeName: isEn && row.place_name_en ? row.place_name_en : row.place_name,
    lat: row.lat,
    lng: row.lng,
  }))
}
