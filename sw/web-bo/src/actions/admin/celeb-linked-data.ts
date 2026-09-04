'use server'

import { createAdminClient } from '@/lib/db/admin'
import { getTimelineEvents, type TimelineEvent } from './timeline'

/* 인물 상세에 함께 보여줄 연결 데이터 — 규격 SSoT는
   docs/project/celeb/celeb-02-05-fiction-sources.md (원전·등장),
   docs/project/celeb/celeb-07-01-relations.md (관계),
   docs/project/celeb/celeb-06-01-timeline.md (연표)다.
   읽기 전용이며 수정은 각 담당 화면(/fiction-sources, /celebs/timeline/[slug])에서 한다. */

export interface LinkedSource {
  content_id: string
  relation_type: string
  sort_order: number
  description: string | null
  title_ko: string | null
}

export interface LinkedRelation {
  counterpart_id: string
  counterpart_nickname: string
  counterpart_slug: string | null
  rel_type: string
  rel_group: string | null
  note: string | null
  external: boolean
  qid: string | null
}

export interface CelebLinkedData {
  sources: LinkedSource[]
  relations: LinkedRelation[]
  timeline: TimelineEvent[]
}

/** 인물 한 명의 원전·등장 작품 + 인물 관계 + 연표 */
export async function getCelebLinkedData(celebId: string): Promise<CelebLinkedData> {
  const admin = createAdminClient()

  const [sourceRows, relRows, extRows, timeline] = await Promise.all([
    admin
      .from('figure_book_characters')
      .select('content_id,relation_type,sort_order,description')
      .eq('celeb_id', celebId)
      .order('sort_order'),
    admin
      .from('celeb_relations')
      .select('from_id,to_id,rel_type,rel_group,note')
      .or(`from_id.eq.${celebId},to_id.eq.${celebId}`),
    admin
      .from('celeb_relations_external')
      .select('qid,name_ko,name_en,rel_type,rel_group,note')
      .eq('from_id', celebId),
    getTimelineEvents(celebId),
  ])
  if (sourceRows.error) throw new Error(`연결 원전 조회 실패: ${sourceRows.error.message}`)
  if (relRows.error) throw new Error(`인물 관계 조회 실패: ${relRows.error.message}`)
  if (extRows.error) throw new Error(`외부 관계 조회 실패: ${extRows.error.message}`)

  const sources: LinkedSource[] = await Promise.all(
    ((sourceRows.data ?? []) as { content_id: string; relation_type: string; sort_order: number; description: string | null }[]).map(async (row) => {
      const { data } = await admin
        .from('content_locales')
        .select('title')
        .eq('content_id', row.content_id)
        .eq('locale', 'ko')
        .maybeSingle()
      return { ...row, title_ko: (data as { title: string | null } | null)?.title ?? null }
    }),
  )

  const counterpartIds = [...new Set(
    ((relRows.data ?? []) as { from_id: string; to_id: string }[]).map((row) =>
      row.from_id === celebId ? row.to_id : row.from_id,
    ),
  )]
  const counterparts = new Map<string, { nickname: string; slug: string | null }>()
  for (let i = 0; i < counterpartIds.length; i += 200) {
    const { data, error } = await admin
      .from('celebs')
      .select('id,nickname,slug')
      .in('id', counterpartIds.slice(i, i + 200))
    if (error) throw new Error(`관계 상대 조회 실패: ${error.message}`)
    for (const c of (data ?? []) as { id: string; nickname: string; slug: string | null }[]) {
      counterparts.set(c.id, { nickname: c.nickname, slug: c.slug })
    }
  }

  const relations: LinkedRelation[] = [
    ...(
      (relRows.data ?? []) as { from_id: string; to_id: string; rel_type: string; rel_group: string | null; note: string | null }[]
    ).map((row) => {
      const counterpartId = row.from_id === celebId ? row.to_id : row.from_id
      const counterpart = counterparts.get(counterpartId)
      return {
        counterpart_id: counterpartId,
        counterpart_nickname: counterpart?.nickname ?? '(삭제된 인물)',
        counterpart_slug: counterpart?.slug ?? null,
        rel_type: row.rel_type,
        rel_group: row.rel_group,
        note: row.note,
        external: false,
        qid: null,
      }
    }),
    ...(
      (extRows.data ?? []) as { qid: string; name_ko: string | null; name_en: string | null; rel_type: string; rel_group: string | null; note: string | null }[]
    ).map((row) => ({
      counterpart_id: row.qid,
      counterpart_nickname: row.name_ko ?? row.name_en ?? row.qid,
      counterpart_slug: null,
      rel_type: row.rel_type,
      rel_group: row.rel_group,
      note: row.note,
      external: true,
      qid: row.qid,
    })),
  ]

  return { sources, relations, timeline }
}
