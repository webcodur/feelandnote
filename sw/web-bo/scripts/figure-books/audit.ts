/**
 * 인물 ↔ 도서 관계의 서비스 전체 커버리지와 공개 구매 가능성을 읽기 전용으로 점검한다.
 *
 * 실행:
 *   node --env-file=.env --import tsx scripts/figure-books/audit.ts
 *   node --env-file=.env --import tsx scripts/figure-books/audit.ts --json
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

type CelebRow = {
  id: string
  slug: string
  nickname: string | null
  profession: string | null
  celeb_tier: string | null
  celeb_reality: string | null
  publication_status: string
}

type RelationRow = {
  content_id: string
  celeb_id: string
  relation_type: string
  description: string | null
  description_en: string | null
}

type PurchaseRow = {
  content_id: string
  locale: string
  platform: string
}

type EditionRow = {
  content_id: string
  locale: string
}

type PageResult<T> = {
  data: T[] | null
  error: { message: string } | null
}

const url = process.env.NEXT_PUBLIC_DB_API_URL
const key = process.env.DB_SECRET_KEY
if (!url || !key) {
  throw new Error('NEXT_PUBLIC_DB_API_URL / DB_SECRET_KEY가 필요합니다.')
}

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const PAGE_SIZE = 1000

async function allRows<T>(
  label: string,
  page: (from: number, to: number) => Promise<PageResult<T>>,
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw new Error(`${label} 조회 실패: ${error.message}`)
    const current = data ?? []
    rows.push(...current)
    if (current.length < PAGE_SIZE) return rows
  }
}

async function loadCelebs(client: SupabaseClient): Promise<CelebRow[]> {
  return allRows('celebs', async (from, to) => {
    const { data, error } = await client
      .from('celebs')
      .select('id,slug,nickname,profession,celeb_tier,celeb_reality,publication_status')
      .eq('publication_status', 'active')
      .order('id')
      .range(from, to)
    return { data: data as CelebRow[] | null, error }
  })
}

async function loadRelations(client: SupabaseClient): Promise<RelationRow[]> {
  return allRows('figure_book_characters', async (from, to) => {
    const { data, error } = await client
      .from('figure_book_characters')
      .select('content_id,celeb_id,relation_type,description,description_en')
      .order('content_id')
      .order('celeb_id')
      .range(from, to)
    return { data: data as RelationRow[] | null, error }
  })
}

async function loadPurchaseOptions(client: SupabaseClient): Promise<PurchaseRow[]> {
  return allRows('figure_book_purchase_options', async (from, to) => {
    const { data, error } = await client
      .from('figure_book_purchase_options')
      .select('content_id,locale,platform')
      .order('content_id')
      .order('edition_id')
      .range(from, to)
    return { data: data as PurchaseRow[] | null, error }
  })
}

// 노출 규칙: 활성 제휴 상품이 있으면 그 판본만, 없으면 요청 locale의 판본을 구매 버튼 없이 보여 준다. 판본이 하나라도 있는 작품이 공개 대상이다.
async function loadEditions(client: SupabaseClient): Promise<EditionRow[]> {
  return allRows('figure_book_editions', async (from, to) => {
    const { data, error } = await client
      .from('figure_book_editions')
      .select('content_id,locale')
      .order('content_id')
      .order('id')
      .range(from, to)
    return { data: data as EditionRow[] | null, error }
  })
}

function countBy<T>(rows: T[], key: (row: T) => string): Record<string, number> {
  const counts = new Map<string, number>()
  for (const row of rows) {
    const value = key(row)
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return Object.fromEntries([...counts].sort(([left], [right]) => left.localeCompare(right)))
}

function hasText(value: string | null): boolean {
  return Boolean(value?.trim())
}

async function main(): Promise<void> {
  const [celebs, relations, purchaseOptions, editions] = await Promise.all([
    loadCelebs(db),
    loadRelations(db),
    loadPurchaseOptions(db),
    loadEditions(db),
  ])

  const celebById = new Map(celebs.map((celeb) => [celeb.id, celeb]))
  const linkedCelebIds = new Set(relations.map((relation) => relation.celeb_id))
  const coupangKoContentIds = new Set(
    purchaseOptions
      .filter((row) => row.locale === 'ko' && row.platform === 'coupang')
      .map((row) => row.content_id),
  )
  const publicKoContentIds = new Set(editions.filter((row) => row.locale === 'ko').map((row) => row.content_id))
  const publicEnContentIds = new Set(editions.filter((row) => row.locale === 'en').map((row) => row.content_id))
  const publicKoCelebIds = new Set(
    relations
      .filter((relation) => publicKoContentIds.has(relation.content_id))
      .map((relation) => relation.celeb_id),
  )

  const coverageByTier = [...Map.groupBy(celebs, (celeb) => celeb.celeb_tier ?? '(없음)')]
    .map(([tier, rows]) => ({
      tier,
      total: rows.length,
      linked: rows.filter((row) => linkedCelebIds.has(row.id)).length,
      publicKo: rows.filter((row) => publicKoCelebIds.has(row.id)).length,
    }))
    .sort((left, right) => left.tier.localeCompare(right.tier))

  const coverageByProfession = [...Map.groupBy(
    celebs.filter((celeb) => celeb.celeb_reality !== 'FICTION'),
    (celeb) => celeb.profession ?? '(없음)',
  )]
    .map(([profession, rows]) => ({
      profession,
      total: rows.length,
      linked: rows.filter((row) => linkedCelebIds.has(row.id)).length,
      publicKo: rows.filter((row) => publicKoCelebIds.has(row.id)).length,
    }))
    .sort((left, right) => right.total - left.total || left.profession.localeCompare(right.profession))

  const invalidRelatedDescriptions = relations
    .filter((relation) => (
      relation.relation_type !== 'appearance'
      && (hasText(relation.description) || hasText(relation.description_en))
    ))
    .map((relation) => ({
      contentId: relation.content_id,
      celebId: relation.celeb_id,
      slug: celebById.get(relation.celeb_id)?.slug ?? null,
    }))

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      activeCelebs: celebs.length,
      linkedActiveCelebs: celebs.filter((celeb) => linkedCelebIds.has(celeb.id)).length,
      publicKoActiveCelebs: celebs.filter((celeb) => publicKoCelebIds.has(celeb.id)).length,
      relationRows: relations.length,
      purchaseOptions: purchaseOptions.length,
      publicKoWorks: publicKoContentIds.size,
      publicEnWorks: publicEnContentIds.size,
      coupangKoWorks: coupangKoContentIds.size,
      invalidRelatedDescriptions: invalidRelatedDescriptions.length,
      // 비공개 인물에 남은 관계. 인물을 다시 올리면 그대로 살아나므로 고칠 대상이 아니라 통계다.
      relationsOfInactiveCelebs: relations.filter((relation) => !celebById.has(relation.celeb_id)).length,
    },
    relationTypes: countBy(relations, (relation) => relation.relation_type),
    coverageByTier,
    coverageByProfession,
    invalidRelatedDescriptions,
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  console.log(JSON.stringify({
    totals: report.totals,
    relationTypes: report.relationTypes,
    coverageByTier: report.coverageByTier,
  }, null, 2))
  console.log('\nREAL-PERSON COVERAGE BY PROFESSION')
  console.table(report.coverageByProfession)
  if (invalidRelatedDescriptions.length > 0) {
    console.log('\nINVALID RELATED DESCRIPTIONS')
    console.log(invalidRelatedDescriptions)
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
