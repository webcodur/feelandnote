import { createStaticClient } from '@/lib/db/static'
import { selectInChunks } from '@feelandnote/shared/lib/paginate'

export type FigureBookRelationType = 'appearance' | 'related'

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
  const rows = await selectInChunks<FigureBookAssignmentRow>(celebIds, (ids) => db
    .from('figure_book_characters')
    .select('content_id,celeb_id,relation_type,sort_order,description,description_en')
    .in('celeb_id', ids)
    .overrideTypes<FigureBookAssignmentRow[], { merge: false }>())

  return rows.sort((left, right) => (
    left.celeb_id.localeCompare(right.celeb_id)
    || left.relation_type.localeCompare(right.relation_type)
    || left.sort_order - right.sort_order
    || left.content_id.localeCompare(right.content_id)
  ))
}
