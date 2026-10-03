import { createStaticClient } from '@/lib/db/static'
import { selectAllPages, selectInChunks } from '@feelandnote/shared/lib/paginate'

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
  /* 공통 ID 묶음마다 연결을 끝까지 받는다. 행 상한에서 잘려 신화 작품이 빠지지 않도록
     기본키(celeb_id, content_id)로 페이지 순서를 고정한다. */
  const rows = await selectInChunks<FigureBookAssignmentRow>(celebIds, async (ids) => ({
    data: await selectAllPages<FigureBookAssignmentRow>((from, to) => db
      .from('figure_book_characters')
      .select('content_id,celeb_id,relation_type,sort_order,description,description_en')
      .in('celeb_id', ids)
      .order('celeb_id', { ascending: true })
      .order('content_id', { ascending: true })
      .range(from, to)
      .overrideTypes<FigureBookAssignmentRow[], { merge: false }>()),
    error: null,
  }))

  return rows.sort((left, right) => (
    left.celeb_id.localeCompare(right.celeb_id)
    || left.relation_type.localeCompare(right.relation_type)
    || left.sort_order - right.sort_order
    || left.content_id.localeCompare(right.content_id)
  ))
}
