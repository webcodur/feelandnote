/**
 * 인물 ↔ 도서 관계의 서비스 전체 커버리지와 공개 구매 가능성을 읽기 전용으로 점검한다.
 * appearance인데 저자 표기가 인물과 맞는 관계(authored 승격 검수 후보)도 함께 잡는다.
 *
 * 실행:
 *   node --env-file=.env --import tsx scripts/figure-books/audit.ts
 *   node --env-file=.env --import tsx scripts/figure-books/audit.ts --json
 *   node --env-file=.env --import tsx scripts/figure-books/audit.ts --integrity
 */

import { createClient, type DatabaseClient } from '@feelandnote/db'
import { inspectContentIntegrity, readIntegrityRows } from './lib/content-integrity'

type CelebRow = {
  id: string
  slug: string
  nickname: string | null
  nickname_en: string | null
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
  creator: string | null
}

type LocaleCreatorRow = {
  content_id: string
  creator: string | null
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

async function loadCelebs(client: DatabaseClient): Promise<CelebRow[]> {
  return allRows('celebs', async (from, to) => {
    const { data, error } = await client
      .from('celebs')
      .select('id,slug,nickname,nickname_en,profession,celeb_tier,celeb_reality,publication_status')
      .eq('publication_status', 'active')
      .order('id')
      .range(from, to)
    return { data: data as CelebRow[] | null, error }
  })
}

async function loadRelations(client: DatabaseClient): Promise<RelationRow[]> {
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

async function loadPurchaseOptions(client: DatabaseClient): Promise<PurchaseRow[]> {
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
async function loadEditions(client: DatabaseClient): Promise<EditionRow[]> {
  return allRows('figure_book_editions', async (from, to) => {
    const { data, error } = await client
      .from('figure_book_editions')
      .select('content_id,locale,creator')
      .order('content_id')
      .order('id')
      .range(from, to)
    return { data: data as EditionRow[] | null, error }
  })
}

async function loadLocaleCreators(client: DatabaseClient): Promise<LocaleCreatorRow[]> {
  return allRows('content_locales', async (from, to) => {
    const { data, error } = await client
      .from('content_locales')
      .select('content_id,creator')
      .order('content_id')
      .order('locale')
      .range(from, to)
    return { data: data as LocaleCreatorRow[] | null, error }
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

// 저자 표기 ↔ 인물 이름 매칭 — mark-authored-relations.mjs와 같은 판정을 쓴다.
// appearance인데 저자 표기가 인물과 맞는 관계는 authored 후보다(건별 검수 대상 — 자동 플립 금지).
const AUTHOR_SUFFIX = /(?:\s+(?:지음|저|저자|글|씀)|\s*\((?:지은이|저자|지음|글|author)\))\s*$/iu
const AUTHOR_SEPARATOR = /[,;/|、]|\s+(?:·|&|and)\s+/iu
const normalizeName = (value: string | null | undefined) =>
  String(value ?? '').normalize('NFKC').toLowerCase().replace(/[\s.·ㆍ・∙•]/gu, '')
function authorName(value: string | null | undefined): string {
  let name = String(value ?? '').normalize('NFKC').trim()
  for (;;) {
    const stripped = name.replace(AUTHOR_SUFFIX, '').trim()
    if (stripped === name) break
    name = stripped
  }
  return normalizeName(name)
}
function matchesAuthor(creator: string, figureNames: Set<string>): boolean {
  if (figureNames.has(authorName(creator))) return true
  return String(creator).normalize('NFKC').split(AUTHOR_SEPARATOR).some((name) => figureNames.has(authorName(name)))
}

async function main(): Promise<void> {
  if (process.argv.includes('--integrity')) {
    const startedAt = new Date().toISOString()
    const rows = await readIntegrityRows(async (query, from, to) => {
      let request = db.from(query.table).select(query.columns)
      for (const field of query.order) request = request.order(field)
      const { data, error } = await request.range(from, to)
      return { data, error }
    })
    const report = inspectContentIntegrity(rows)
    console.log(JSON.stringify({
      mode: 'integrity', startedAt, completedAt: new Date().toISOString(),
      readConsistency: '각 표를 API로 나누어 읽은 결과이며, 원자적 스냅샷이 아닙니다.',
      exitSemantics: '종료 코드 1은 구조 오류나 조회 실패를 뜻합니다. ISBN 공유는 합본과 과거 판본을 포함한 원전 검수 후보이며, 후보만 있으면 종료 코드 0입니다. 같은 원전이라고 단정하거나 자동 통합하지 않습니다.',
      rowsRead: Object.fromEntries(Object.entries(rows).map(([table, values]) => [table, values.length])),
      ...report,
    }, null, 2))
    if (report.issueCount) process.exitCode = 1
    return
  }
  const [celebs, relations, purchaseOptions, editions, localeCreators] = await Promise.all([
    loadCelebs(db),
    loadRelations(db),
    loadPurchaseOptions(db),
    loadEditions(db),
    loadLocaleCreators(db),
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

  // appearance인데 작품 저자 표기에 인물 이름이 있는 관계 — authored 승격 검수 후보.
  // 26.09.26 전수 정리(341건 검수·323건 승격) 뒤의 잔여와 신규 유입을 여기서 잡는다.
  const creatorsByContent = new Map<string, string[]>()
  for (const row of [...localeCreators, ...editions]) {
    if (!row.creator) continue
    const list = creatorsByContent.get(row.content_id) ?? []
    list.push(row.creator)
    creatorsByContent.set(row.content_id, list)
  }
  const suspectAuthoredAppearance = relations
    .filter((relation) => relation.relation_type === 'appearance')
    .flatMap((relation) => {
      const celeb = celebById.get(relation.celeb_id)
      if (!celeb) return []
      const figureNames = new Set(
        [celeb.nickname, celeb.nickname_en].filter(Boolean).map(normalizeName).filter(Boolean),
      )
      const creators = creatorsByContent.get(relation.content_id) ?? []
      if (!creators.some((creator) => matchesAuthor(creator, figureNames))) return []
      return [{
        contentId: relation.content_id,
        celebId: relation.celeb_id,
        slug: celeb.slug,
        creators: [...new Set(creators)],
      }]
    })

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
      suspectAuthoredAppearance: suspectAuthoredAppearance.length,
      // 비공개 인물에 남은 관계. 인물을 다시 올리면 그대로 살아나므로 고칠 대상이 아니라 통계다.
      relationsOfInactiveCelebs: relations.filter((relation) => !celebById.has(relation.celeb_id)).length,
    },
    relationTypes: countBy(relations, (relation) => relation.relation_type),
    coverageByTier,
    coverageByProfession,
    invalidRelatedDescriptions,
    suspectAuthoredAppearance,
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
  if (suspectAuthoredAppearance.length > 0) {
    console.log('\nSUSPECT AUTHORED AS APPEARANCE (건별 검수 — mark-authored-relations.mjs --from appearance 후보)')
    console.table(suspectAuthoredAppearance.map((row) => ({ slug: row.slug, creators: row.creators.join(' ⑊ ') })))
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
