export const FICTION_SOURCE_RELATION_TYPES = [
  'appearance',
  'related',
] as const

export type FigureBookRelationType = typeof FICTION_SOURCE_RELATION_TYPES[number]

export type FigureBookBatchCharacter = {
  slug?: string
  celebId?: string
  relationType: FigureBookRelationType
  description: string | null
  sortOrder?: number
}

export type FigureBookBatchManifest = {
  contentId: string
  title?: string
  characters: FigureBookBatchCharacter[]
}

export type ResolvedFigureBookCharacter = Omit<
  FigureBookBatchCharacter,
  'slug' | 'celebId'
> & {
  celebId: string
  slug: string
}

export type FigureBookCharacterRow = {
  content_id: string
  celeb_id: string
  relation_type: string
  sort_order: number
  description: string | null
  description_en: string | null
}

export type FigureBookBatchChange = {
  kind: 'insert' | 'update' | 'unchanged'
  slug: string
  before: FigureBookCharacterRow | null
  after: FigureBookCharacterRow
}

export type FigureBookBatchPlan = {
  expectedRows: FigureBookCharacterRow[]
  changes: FigureBookBatchChange[]
  writeRows: FigureBookCharacterRow[]
}

const MANIFEST_KEYS = new Set(['contentId', 'title', 'characters'])
const CHARACTER_KEYS = new Set([
  'slug',
  'celebId',
  'relationType',
  'description',
  'sortOrder',
])
const RELATION_TYPES = new Set<string>(FICTION_SOURCE_RELATION_TYPES)
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function recordOf(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${field}는 JSON 객체여야 합니다.`)
  }
  return value as Record<string, unknown>
}

function rejectUnknownKeys(
  value: Record<string, unknown>,
  allowed: Set<string>,
  field: string,
): void {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key))
  if (unknown.length > 0) {
    throw new Error(`${field}에 허용되지 않은 키가 있습니다: ${unknown.join(', ')}`)
  }
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field}이(가) 비어 있습니다.`)
  }
  return value.trim()
}

function optionalText(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined
  return requiredText(value, field)
}

export function parseFigureBookBatchManifest(input: unknown): FigureBookBatchManifest {
  const raw = recordOf(input, '입력')
  rejectUnknownKeys(raw, MANIFEST_KEYS, '입력')

  const contentId = requiredText(raw.contentId, 'contentId')
  const title = optionalText(raw.title, 'title')
  if (!Array.isArray(raw.characters) || raw.characters.length === 0) {
    throw new Error('characters가 비어 있습니다.')
  }

  const identifiers = new Set<string>()
  const characters = raw.characters.map((value, index): FigureBookBatchCharacter => {
    const field = `characters[${index}]`
    const row = recordOf(value, field)
    rejectUnknownKeys(row, CHARACTER_KEYS, field)

    const slug = optionalText(row.slug, `${field}.slug`)
    const celebId = optionalText(row.celebId, `${field}.celebId`)
    if ((slug ? 1 : 0) + (celebId ? 1 : 0) !== 1) {
      throw new Error(`${field}에는 slug 또는 celebId 중 하나만 있어야 합니다.`)
    }
    if (celebId && !UUID_PATTERN.test(celebId)) {
      throw new Error(`${field}.celebId는 UUID여야 합니다.`)
    }

    const relationType = requiredText(row.relationType, `${field}.relationType`)
    if (!RELATION_TYPES.has(relationType)) {
      throw new Error(
        `${field}.relationType은 ${FICTION_SOURCE_RELATION_TYPES.join(', ')} 중 하나여야 합니다.`,
      )
    }

    const sortOrder = row.sortOrder
    if (sortOrder !== undefined && (!Number.isInteger(sortOrder) || (sortOrder as number) < 0)) {
      throw new Error(`${field}.sortOrder는 0 이상의 정수여야 합니다.`)
    }

    const identifier = slug
      ? `slug:${slug.normalize('NFKC').toLocaleLowerCase()}`
      : `id:${celebId!.toLocaleLowerCase()}`
    if (identifiers.has(identifier)) throw new Error(`${field}의 대상 인물이 중복됩니다.`)
    identifiers.add(identifier)

    const description = relationType === 'appearance'
      ? requiredText(row.description, `${field}.description`)
      : null
    if (relationType === 'related' && row.description !== undefined && row.description !== null) {
      throw new Error(`${field}.description은 연관 도서 관계에 입력할 수 없습니다.`)
    }

    return {
      ...(slug ? { slug } : { celebId }),
      relationType: relationType as FigureBookRelationType,
      description,
      ...(sortOrder === undefined ? {} : { sortOrder: sortOrder as number }),
    }
  })

  return { contentId, ...(title ? { title } : {}), characters }
}

function normalizedRow(row: FigureBookCharacterRow): FigureBookCharacterRow {
  return {
    content_id: row.content_id,
    celeb_id: row.celeb_id,
    relation_type: row.relation_type,
    sort_order: row.sort_order,
    description: row.description,
    description_en: row.description_en,
  }
}

function rowKey(row: FigureBookCharacterRow): string {
  return `${row.content_id}\u0000${row.celeb_id}`
}

function sortRows(rows: FigureBookCharacterRow[]): FigureBookCharacterRow[] {
  return rows
    .map(normalizedRow)
    .sort((left, right) => (
      left.sort_order - right.sort_order
      || left.celeb_id.localeCompare(right.celeb_id)
    ))
}

function sameRow(
  left: FigureBookCharacterRow,
  right: FigureBookCharacterRow,
): boolean {
  return left.content_id === right.content_id
    && left.celeb_id === right.celeb_id
    && left.relation_type === right.relation_type
    && left.sort_order === right.sort_order
    && left.description === right.description
    && left.description_en === right.description_en
}

/**
 * 현재 작품의 모든 관계를 스냅샷으로 받아 지정된 인물만 덮고 나머지는 그대로 둔다.
 * 같은 작품의 출판사별 판본은 하나의 contentId를 공유하므로 copyFrom 계약을 두지 않는다.
 */
export function buildFigureBookBatchPlan(
  contentId: string,
  characters: ResolvedFigureBookCharacter[],
  currentRows: FigureBookCharacterRow[],
): FigureBookBatchPlan {
  const existingByCelebId = new Map<string, FigureBookCharacterRow>()
  for (const row of currentRows) {
    if (row.content_id !== contentId) {
      throw new Error(`현재 스냅샷에 다른 콘텐츠가 섞였습니다: ${row.content_id}`)
    }
    if (existingByCelebId.has(row.celeb_id)) {
      throw new Error(`현재 스냅샷의 인물 관계가 중복됩니다: ${row.celeb_id}`)
    }
    existingByCelebId.set(row.celeb_id, normalizedRow(row))
  }

  const desiredIds = new Set<string>()
  for (const character of characters) {
    if (desiredIds.has(character.celebId)) {
      throw new Error(`해석된 대상 인물이 중복됩니다: ${character.slug} (${character.celebId})`)
    }
    desiredIds.add(character.celebId)
  }

  let nextSortOrder = currentRows.reduce(
    (maximum, row) => Math.max(maximum, row.sort_order),
    -1,
  ) + 1
  const expectedByCelebId = new Map(existingByCelebId)
  const changes: FigureBookBatchChange[] = []

  for (const character of characters) {
    if (character.relationType === 'appearance' && !character.description?.trim()) {
      throw new Error(`등장 도서 관계에는 등장 설명이 필요합니다: ${character.slug}`)
    }
    if (character.relationType === 'related' && character.description !== null) {
      throw new Error(`연관 도서 관계에는 등장 설명을 저장할 수 없습니다: ${character.slug}`)
    }

    const before = existingByCelebId.get(character.celebId) ?? null
    const sortOrder = character.sortOrder
      ?? before?.sort_order
      ?? nextSortOrder++
    const after: FigureBookCharacterRow = {
      content_id: contentId,
      celeb_id: character.celebId,
      relation_type: character.relationType,
      sort_order: sortOrder,
      description: character.description,
      // 한국어 원전 배치는 Amazon 영문판 작업에서 확정한 값을 만들거나 덮지 않는다.
      description_en: character.relationType === 'related'
        ? null
        : before?.description_en ?? null,
    }
    const kind = before === null ? 'insert' : sameRow(before, after) ? 'unchanged' : 'update'
    changes.push({ kind, slug: character.slug, before, after })
    expectedByCelebId.set(character.celebId, after)
  }

  return {
    expectedRows: sortRows([...expectedByCelebId.values()]),
    changes,
    writeRows: changes
      .filter((change) => change.kind !== 'unchanged')
      .map((change) => change.after),
  }
}

export function assertExactFigureBookReadback(
  expectedRows: FigureBookCharacterRow[],
  actualRows: FigureBookCharacterRow[],
): void {
  const expected = sortRows(expectedRows)
  const actual = sortRows(actualRows)
  const expectedKeys = new Set(expected.map(rowKey))
  const actualKeys = new Set(actual.map(rowKey))

  if (expectedKeys.size !== expected.length) throw new Error('기대 관계에 중복 행이 있습니다.')
  if (actualKeys.size !== actual.length) throw new Error('readback 관계에 중복 행이 있습니다.')

  const actualByKey = new Map(actual.map((row) => [rowKey(row), row]))
  const missing = expected.filter((row) => !actualKeys.has(rowKey(row)))
  const unexpected = actual.filter((row) => !expectedKeys.has(rowKey(row)))
  const mismatched = expected.filter((row) => {
    const actualRow = actualByKey.get(rowKey(row))
    return actualRow ? !sameRow(row, actualRow) : false
  })

  if (missing.length === 0 && unexpected.length === 0 && mismatched.length === 0) return

  const parts = [
    missing.length > 0 ? `누락 ${missing.map((row) => row.celeb_id).join(', ')}` : '',
    unexpected.length > 0 ? `예상 밖 ${unexpected.map((row) => row.celeb_id).join(', ')}` : '',
    mismatched.length > 0 ? `값 불일치 ${mismatched.map((row) => row.celeb_id).join(', ')}` : '',
  ].filter(Boolean)
  throw new Error(`적용 후 관계 readback 실패: ${parts.join('; ')}`)
}
