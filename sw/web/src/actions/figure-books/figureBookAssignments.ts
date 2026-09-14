import { createStaticClient } from '@/lib/db/static'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'

export type FigureBookRelationType = 'appearance' | 'related' | 'authored'

export interface FigureBookAssignmentRow {
  content_id: string
  celeb_id: string
  relation_type: FigureBookRelationType
  sort_order: number
  description: string | null
  description_en: string | null
}

async function fetchAssignments(
  column: 'celeb_id' | 'content_id',
  value: string,
): Promise<FigureBookAssignmentRow[]> {
  const db = createStaticClient()
  const { data, error } = await db
    .from('figure_book_characters')
    .select('content_id,celeb_id,relation_type,sort_order,description,description_en')
    .eq(column, value)
    .order('relation_type')
    .order('sort_order')
    .order(column === 'celeb_id' ? 'content_id' : 'celeb_id')
    .overrideTypes<FigureBookAssignmentRow[], { merge: false }>()

  if (error) {
    throw new Error(`인물 도서 관계 조회 실패: ${error.message}`)
  }
  return data ?? []
}

export function getFigureBookAssignmentsByCeleb(
  celebId: string,
): Promise<FigureBookAssignmentRow[]> {
  return fetchAssignments('celeb_id', celebId)
}

export function getFigureBookAssignmentsByContent(
  contentId: string,
): Promise<FigureBookAssignmentRow[]> {
  return fetchAssignments('content_id', contentId)
}

export async function getFigureBookAssignmentsByCelebs(
  celebIds: string[],
): Promise<FigureBookAssignmentRow[]> {
  if (celebIds.length === 0) return []

  const db = createStaticClient()
  /* 인물 200명 묶음 하나가 원전 연결 3천 행을 넘기도 한다(26.09.14). 묶음으로만 나누면 묶음마다 1,000행에서
     잘려 신화 화면의 작품이 빠진다 — 묶음마다 끝까지 나눠 받는다. 기본키(celeb_id, content_id)로 줄을 고정한다 */
  const chunks = Array.from({ length: Math.ceil(celebIds.length / 200) }, (_, i) => celebIds.slice(i * 200, (i + 1) * 200))
  const rows = (await Promise.all(chunks.map((ids) => selectAllPages<FigureBookAssignmentRow>((from, to) => db
    .from('figure_book_characters')
    .select('content_id,celeb_id,relation_type,sort_order,description,description_en')
    .in('celeb_id', ids)
    .order('celeb_id', { ascending: true })
    .order('content_id', { ascending: true })
    .range(from, to)
    .overrideTypes<FigureBookAssignmentRow[], { merge: false }>())))).flat()

  return rows.sort((left, right) => (
    left.celeb_id.localeCompare(right.celeb_id)
    || left.relation_type.localeCompare(right.relation_type)
    || left.sort_order - right.sort_order
    || left.content_id.localeCompare(right.content_id)
  ))
}
