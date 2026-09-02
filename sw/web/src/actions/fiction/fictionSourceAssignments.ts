import { unstable_cache } from 'next/cache'
import { bulkTag, CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'

export type FictionSourceRelationType = 'appearance' | 'origin' | 'adaptation'

export interface FictionSourceAssignmentRow {
  content_id: string
  celeb_id: string
  relation_type: FictionSourceRelationType
  sort_order: number
  description: string | null
  description_en: string | null
}

const ASSIGNMENT_PAGE_SIZE = 500

async function fetchAllAssignments(): Promise<FictionSourceAssignmentRow[]> {
  const db = createStaticClient()
  const rows: FictionSourceAssignmentRow[] = []

  for (let from = 0; ; from += ASSIGNMENT_PAGE_SIZE) {
    const { data, error } = await db
      .from('fiction_source_characters')
      .select('content_id,celeb_id,relation_type,sort_order,description,description_en')
      .order('content_id')
      .order('sort_order')
      .order('celeb_id')
      .range(from, from + ASSIGNMENT_PAGE_SIZE - 1)
      .overrideTypes<FictionSourceAssignmentRow[], { merge: false }>()

    if (error) {
      throw new Error(`픽션 원전 인물 연결 조회 실패: ${error.message}`)
    }

    const page = data ?? []
    rows.push(...page)
    if (page.length < ASSIGNMENT_PAGE_SIZE) break
  }

  return rows
}

export const getAllFictionSourceAssignments = unstable_cache(
  fetchAllAssignments,
  ['fiction-source-character-assignments-v3-descriptions'],
  {
    revalidate: STATIC_REVALIDATE,
    tags: [CACHE_TAGS.FICTION_SOURCES, bulkTag(CACHE_TAGS.FICTION_SOURCES)],
  },
)
