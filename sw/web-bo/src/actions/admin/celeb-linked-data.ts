'use server'

import { canonicalizeCelebRelation, canonicalizeCelebRelationAxis, celebRelationDisplayType, celebRelationDisplayGroup, celebRelationCounterpartId, celebRelationPairKey, celebRelationTypeForViewer, isCelebFamilyRelation } from '@feelandnote/shared/constants/celeb-relations'
import { createAdminClient } from '@/lib/db/admin'
import { getTimelineEvents, type TimelineEvent } from './timeline'

/* 인물 상세에 함께 보여줄 연결 데이터 — 규격 SSoT는
   docs/project/celeb/celeb-02-05-figure-books.md (원전·등장),
   docs/project/celeb/celeb-07-01-relations.md (관계),
   docs/project/celeb/celeb-06-01-timeline.md (연표)다.
   읽기 전용이며 수정은 각 담당 화면(/figure-books, /celebs/timeline/[slug])에서 한다. */

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

  const [sourceRows, relRows, extRows, timeline, profileRow] = await Promise.all([
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
    admin.from('celebs').select('wikidata_qid').eq('id', celebId).maybeSingle(),
  ])
  if (sourceRows.error) throw new Error(`연결 원전 조회 실패: ${sourceRows.error.message}`)
  if (relRows.error) throw new Error(`인물 관계 조회 실패: ${relRows.error.message}`)
  if (extRows.error) throw new Error(`외부 관계 조회 실패: ${extRows.error.message}`)
  if (profileRow.error) throw new Error(`인물 QID 조회 실패: ${profileRow.error.message}`)

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
  const counterparts = new Map<string, { nickname: string; slug: string | null; wikidata_qid: string | null }>()
  for (let i = 0; i < counterpartIds.length; i += 200) {
    const { data, error } = await admin
      .from('celebs')
      .select('id,nickname,slug,wikidata_qid')
      .in('id', counterpartIds.slice(i, i + 200))
    if (error) throw new Error(`관계 상대 조회 실패: ${error.message}`)
    for (const c of (data ?? []) as { id: string; nickname: string; slug: string | null; wikidata_qid: string | null }[]) {
      counterparts.set(c.id, c)
    }
  }

  const familyPairs = new Set((relRows.data ?? [])
    .filter(row => isCelebFamilyRelation(row.rel_type, row.rel_group))
    .map(row => celebRelationPairKey(row.from_id, row.to_id)))
  const familyQids = new Set((extRows.data ?? [])
    .filter(row => isCelebFamilyRelation(row.rel_type, row.rel_group)).map(row => row.qid))
  const familyIds = new Set<string>()
  const incomingFamily: LinkedRelation[] = []
  if (profileRow.data?.wikidata_qid) {
    const incoming = await admin.from('celeb_relations_external')
      .select('from_id,rel_type,rel_group,note,from:celebs!celeb_rel_external_celebs_fkey(nickname,slug,wikidata_qid)')
      .eq('qid', profileRow.data.wikidata_qid)
      .overrideTypes<{ from_id: string; rel_type: string; rel_group: string | null; note: string | null; from: { nickname: string; slug: string | null; wikidata_qid: string | null } | null }[], { merge: false }>()
    if (incoming.error) throw new Error(`역방향 외부 가족 조회 실패: ${incoming.error.message}`)
    for (const row of incoming.data ?? []) {
      if (!isCelebFamilyRelation(row.rel_type, row.rel_group)) continue
      familyIds.add(row.from_id)
      if (row.from?.wikidata_qid) familyQids.add(row.from.wikidata_qid)
      incomingFamily.push({
        counterpart_id: row.from_id,
        counterpart_nickname: row.from?.nickname ?? '(삭제된 인물)',
        counterpart_slug: row.from?.slug ?? null,
        rel_type: celebRelationTypeForViewer({ fromId: row.from_id, toId: celebId, relType: row.rel_type }, celebId)!,
        rel_group: 'family', note: row.note, external: false, qid: null,
      })
    }
  }
  for (const row of relRows.data ?? []) {
    if (!isCelebFamilyRelation(row.rel_type, row.rel_group)) continue
    const qid = counterparts.get(row.from_id === celebId ? row.to_id : row.from_id)?.wikidata_qid
    if (qid) familyQids.add(qid)
  }
  const relations: LinkedRelation[] = [
    ...incomingFamily,
    ...(
      (relRows.data ?? []) as { from_id: string; to_id: string; rel_type: string; rel_group: string | null; note: string | null }[]
    ).flatMap((row) => {
      const family = isCelebFamilyRelation(row.rel_type, row.rel_group)
      if (!family && familyPairs.has(celebRelationPairKey(row.from_id, row.to_id))) return []
      const identity = { fromId: row.from_id, toId: row.to_id, relType: row.rel_type }
      const axis = family ? canonicalizeCelebRelation(identity) : canonicalizeCelebRelationAxis(identity)
      if (!axis) return []
      const counterpartId = celebRelationCounterpartId(axis, celebId)!
      if (!family && familyIds.has(counterpartId)) return []
      const relType = celebRelationTypeForViewer(axis, celebId)!
      const counterpart = counterparts.get(counterpartId)
      if (!family && counterpart?.wikidata_qid && familyQids.has(counterpart.wikidata_qid)) return []
      return [{
        counterpart_id: counterpartId,
        counterpart_nickname: counterpart?.nickname ?? '(삭제된 인물)',
        counterpart_slug: counterpart?.slug ?? null,
        rel_type: relType,
        rel_group: celebRelationDisplayGroup(relType, row.rel_group),
        note: row.note,
        external: false,
        qid: null,
      }]
    }),
    ...(
      (extRows.data ?? []) as { qid: string; name_ko: string | null; name_en: string | null; rel_type: string; rel_group: string | null; note: string | null }[]
    ).filter(row => (isCelebFamilyRelation(row.rel_type, row.rel_group) || !familyQids.has(row.qid)) && celebRelationDisplayType(row.rel_type, row.rel_group)).map((row) => ({
      counterpart_id: row.qid,
      counterpart_nickname: row.name_ko ?? row.name_en ?? row.qid,
      counterpart_slug: null,
      rel_type: celebRelationDisplayType(row.rel_type, row.rel_group)!,
      rel_group: celebRelationDisplayGroup(row.rel_type, row.rel_group),
      note: row.note,
      external: true,
      qid: row.qid,
    })),
  ]

  const unique = new Map(relations.map(row => [`${row.counterpart_id}|${row.rel_type}`, row]))
  return { sources, relations: [...unique.values()], timeline }
}
