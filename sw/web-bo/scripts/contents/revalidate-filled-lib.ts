import {
  CACHE_TAGS,
  bulkTag,
  isAllowedCacheTag,
  isCompleteCacheRevalidationResponse,
  itemTag,
  revalidationApiPathForTags,
} from '@feelandnote/shared/constants/cache-tags'

export const CONTENT_TYPES = ['BOOK', 'VIDEO', 'GAME', 'MUSIC'] as const
export const LOCALES = ['ko', 'en'] as const
export const ROWS_PER_PAGE = 1_000

/** 콘텐츠 태그당 HTML URL 2개. Cloudflare Free의 100 URL/request 한도에 맞춤. */
export const TAGS_PER_REQUEST = 50

/** 이보다 큰 항목별 퍼지는 실수로 수백 회의 Cloudflare 호출을 만들지 않도록 확인을 받는다. */
export const MAX_TARGETED_TAGS = 100

export type ContentType = (typeof CONTENT_TYPES)[number]
export type Locale = (typeof LOCALES)[number]

interface CommonCliOptions {
  dry: boolean
  webUrl: string | null
}

export interface TargetedCliOptions extends CommonCliOptions {
  mode: 'targeted'
  type: ContentType
  locale: Locale
  allowLargeTargeted: boolean
}

export interface AllDetailsCliOptions extends CommonCliOptions {
  mode: 'all-details'
  confirmBulkPurge: boolean
}

export type CliOptions = TargetedCliOptions | AllDetailsCliOptions

export const USAGE = `작품 소개 캐시 복구

먼저 대상 확인:
  pnpm contents:revalidate --type GAME --locale ko --dry

100태그 이하의 평상시 항목별 복구:
  pnpm contents:revalidate --type VIDEO --locale ko

전체 릴리스 전용(모든 작품·의존 인물 상세 만료 + 해당 상세 경로 prefix 퍼지):
  pnpm contents:revalidate --all-details --confirm-bulk-purge

옵션:
  --type BOOK|VIDEO|GAME|MUSIC   항목별 복구에서는 필수
  --locale ko|en                 항목별 복구에서는 필수
  --web https://example.com      생략하면 NEXT_PUBLIC_WEB_URL
  --dry                          DB 대상만 조회하고 재검증 HTTP는 보내지 않음
  --allow-large-targeted         장애 복구 때만 100개 초과 항목별 퍼지를 명시적으로 허용
  --all-details                  contents:__all__ 한 개를 보내는 전체 릴리스 모드
  --confirm-bulk-purge           작품·인물 상세 경로군 prefix 퍼지를 실행함을 확인`

function requiredValue(args: readonly string[], index: number, flag: string): string {
  const value = args[index + 1]
  if (!value || value.startsWith('--')) throw new Error(`${flag} 값을 입력해야 합니다.`)
  return value
}

function normalizeWebUrl(raw: string | undefined, dry: boolean): string | null {
  if (!raw) {
    if (dry) return null
    throw new Error('NEXT_PUBLIC_WEB_URL 또는 --web 운영 주소가 필요합니다.')
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    throw new Error(`올바르지 않은 web 주소입니다: ${raw}`)
  }
  if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error(`web 주소에는 origin만 입력해야 합니다: ${raw}`)
  }

  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
  if (loopback) {
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`로컬 web 주소는 http 또는 https여야 합니다: ${raw}`)
    }
  } else if (parsed.origin !== 'https://feelandnote.com') {
    throw new Error(`운영 재검증 주소는 https://feelandnote.com만 허용합니다: ${raw}`)
  }
  return parsed.origin
}

/** 알 수 없는 옵션, 중복 옵션, 누락된 값까지 모두 거부하는 CLI 경계다. */
export function parseCliOptions(
  args: readonly string[],
  env: Readonly<Record<string, string | undefined>> = process.env,
): CliOptions {
  const seen = new Set<string>()
  let typeRaw: string | undefined
  let localeRaw: string | undefined
  let webRaw: string | undefined
  let dry = false
  let allDetails = false
  let confirmBulkPurge = false
  let allowLargeTargeted = false

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index]
    if (!flag.startsWith('--')) throw new Error(`알 수 없는 인수입니다: ${flag}`)
    if (seen.has(flag)) throw new Error(`옵션을 중복해서 사용할 수 없습니다: ${flag}`)
    seen.add(flag)

    switch (flag) {
      case '--type':
        typeRaw = requiredValue(args, index, flag).toUpperCase()
        index += 1
        break
      case '--locale':
        localeRaw = requiredValue(args, index, flag).toLowerCase()
        index += 1
        break
      case '--web':
        webRaw = requiredValue(args, index, flag)
        index += 1
        break
      case '--dry':
        dry = true
        break
      case '--all-details':
        allDetails = true
        break
      case '--confirm-bulk-purge':
        confirmBulkPurge = true
        break
      case '--confirm-global-purge':
        throw new Error(
          '--confirm-global-purge는 폐기되었습니다. 상세 prefix 퍼지는 --confirm-bulk-purge를 사용하세요.',
        )
      case '--allow-large-targeted':
        allowLargeTargeted = true
        break
      default:
        throw new Error(`알 수 없는 옵션입니다: ${flag}`)
    }
  }

  const webUrl = normalizeWebUrl(webRaw ?? env.NEXT_PUBLIC_WEB_URL, dry)

  if (allDetails) {
    if (typeRaw || localeRaw || allowLargeTargeted) {
      throw new Error('--all-details는 --type, --locale, --allow-large-targeted와 함께 쓸 수 없습니다.')
    }
    if (!dry && !confirmBulkPurge) {
      throw new Error(
        '--all-details는 작품·인물 상세 경로군 캐시를 prefix로 퍼지합니다. ' +
        '실실행에는 --confirm-bulk-purge가 필요합니다.',
      )
    }
    return { mode: 'all-details', dry, webUrl, confirmBulkPurge }
  }

  if (confirmBulkPurge) {
    throw new Error('--confirm-bulk-purge는 --all-details와 함께만 사용할 수 있습니다.')
  }
  if (!typeRaw || !(CONTENT_TYPES as readonly string[]).includes(typeRaw)) {
    throw new Error(`--type은 필수이며 ${CONTENT_TYPES.join('|')} 중 하나여야 합니다.`)
  }
  if (!localeRaw || !(LOCALES as readonly string[]).includes(localeRaw)) {
    throw new Error(`--locale은 필수이며 ${LOCALES.join('|')} 중 하나여야 합니다.`)
  }

  return {
    mode: 'targeted',
    type: typeRaw as ContentType,
    locale: localeRaw as Locale,
    dry,
    webUrl,
    allowLargeTargeted,
  }
}

export interface PageResult<T> {
  data: T[] | null
  error: { message?: string; code?: string; details?: string } | null
  count: number | null
}

export interface VerifiedPages<T> {
  rows: T[]
  expectedCount: number
  pageCount: number
}

/**
 * PostgREST의 1,000행 상한을 넘겨 끝까지 읽고 exact count와 실제 수신 행 수를 대조한다.
 * 호출자는 반드시 고유하고 안정적인 키로 정렬한 쿼리를 넘겨야 한다.
 */
export async function selectAllVerifiedPages<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
  pageSize = ROWS_PER_PAGE,
): Promise<VerifiedPages<T>> {
  if (!Number.isInteger(pageSize) || pageSize <= 0) throw new Error('pageSize는 양의 정수여야 합니다.')

  const rows: T[] = []
  let expectedCount: number | null = null
  let pageCount = 0

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1
    const result = await page(from, to)
    pageCount += 1

    if (result.error) {
      const detail = [result.error.message, result.error.code, result.error.details]
        .filter(Boolean)
        .join(' / ')
      throw new Error(`대상 조회 실패: ${detail || '원인 불명'}`)
    }
    if (typeof result.count !== 'number' || !Number.isInteger(result.count) || result.count < 0) {
      throw new Error('대상 조회가 exact count를 반환하지 않았습니다.')
    }
    const currentCount = result.count
    if (expectedCount === null) expectedCount = currentCount
    if (currentCount !== expectedCount) {
      throw new Error(`조회 중 대상 건수가 바뀌었습니다: ${expectedCount} → ${result.count}`)
    }
    const verifiedCount = expectedCount

    const data = result.data ?? []
    if (data.length > pageSize) throw new Error(`한 페이지가 요청 범위를 넘었습니다: ${data.length}/${pageSize}`)
    rows.push(...data)
    if (rows.length > verifiedCount) {
      throw new Error(`수신 행이 exact count를 넘었습니다: ${rows.length}/${verifiedCount}`)
    }
    if (rows.length === verifiedCount) break
    if (data.length < pageSize) break
  }

  if (expectedCount === null || rows.length !== expectedCount) {
    throw new Error(`대상 전수 조회가 끝나지 않았습니다: ${rows.length}/${expectedCount ?? '알 수 없음'}`)
  }

  return { rows, expectedCount, pageCount }
}

export interface ContentTargetRow {
  content_id: unknown
  contents: unknown
}

export interface ContentTagSet {
  tags: string[]
  contentIds: string[]
  externalIds: string[]
}

function contentRelation(value: unknown): Record<string, unknown> {
  const relation = Array.isArray(value) ? value[0] : value
  if (!relation || typeof relation !== 'object') throw new Error('contents 관계 데이터가 없습니다.')
  return relation as Record<string, unknown>
}

function checkedTag(id: string, label: string): string {
  const tag = itemTag(CACHE_TAGS.CONTENTS, id)
  if (!isAllowedCacheTag(tag)) throw new Error(`${label}을 캐시 태그로 사용할 수 없습니다: ${id}`)
  return tag
}

/** 소개값은 인물 초기 화면에 포함되지 않으므로 contents id·external_id만 만든다. */
export function buildDescriptionContentTags(rows: readonly ContentTargetRow[]): ContentTagSet {
  const tags = new Set<string>()
  const contentIds = new Set<string>()
  const externalIds = new Set<string>()

  let previousContentId: string | null = null
  for (const row of rows) {
    if (typeof row.content_id !== 'string' || !row.content_id.trim()) {
      throw new Error(`올바르지 않은 content_id입니다: ${String(row.content_id)}`)
    }
    const contentId = row.content_id.trim()
    if (contentId === previousContentId || contentIds.has(contentId)) {
      throw new Error(`페이지네이션 결과에 content_id가 중복됐습니다: ${contentId}`)
    }
    if (previousContentId !== null && contentId < previousContentId) {
      throw new Error(`페이지네이션 결과의 content_id 정렬이 깨졌습니다: ${previousContentId} > ${contentId}`)
    }
    previousContentId = contentId
    contentIds.add(contentId)
    tags.add(checkedTag(contentId, 'content_id'))

    const externalIdRaw = contentRelation(row.contents).external_id
    if (externalIdRaw === null || externalIdRaw === undefined || externalIdRaw === '') continue
    if (typeof externalIdRaw !== 'string') {
      throw new Error(`올바르지 않은 external_id입니다: ${String(externalIdRaw)}`)
    }
    const externalId = externalIdRaw.trim()
    if (!externalId || externalId === contentId) continue
    externalIds.add(externalId)
    tags.add(checkedTag(externalId, 'external_id'))
  }

  return {
    tags: [...tags],
    contentIds: [...contentIds],
    externalIds: [...externalIds],
  }
}

export interface RevalidationPlan {
  mode: 'targeted' | 'all-details'
  tags: string[]
  estimatedCloudflareUrls: number
}

export function makeRevalidationPlan(
  options: CliOptions,
  targetedTags: readonly string[] = [],
): RevalidationPlan {
  if (options.mode === 'all-details') {
    return {
      mode: 'all-details',
      tags: [bulkTag(CACHE_TAGS.CONTENTS)],
      estimatedCloudflareUrls: 0,
    }
  }

  const tags = [...new Set(targetedTags)]
  if (!options.dry && tags.length > MAX_TARGETED_TAGS && !options.allowLargeTargeted) {
    throw new Error(
      `항목 태그 ${tags.length}개는 Cloudflare 퍼지 호출이 너무 큽니다. ` +
      '전체 릴리스라면 --all-details --confirm-bulk-purge를 사용하고, ' +
      '정말 항목별 퍼지가 필요하면 --allow-large-targeted를 명시하세요.',
    )
  }
  return {
    mode: 'targeted',
    tags,
    estimatedCloudflareUrls: tags.length * 2,
  }
}

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>

export interface SendRevalidationInput {
  tags: readonly string[]
  dry: boolean
  webUrl: string | null
  secret?: string
  fetchImpl?: FetchLike
  chunkSize?: number
}

export interface SendRevalidationResult {
  plannedRequests: number
  completedRequests: number
  confirmedTags: number
}

function parseResponseBody(raw: string, status: number): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('object 아님')
    return parsed as Record<string, unknown>
  } catch {
    throw new Error(`재검증 API가 JSON을 반환하지 않았습니다 (HTTP ${status}): ${raw.slice(0, 200)}`)
  }
}

/** 한 청크라도 확인되지 않으면 즉시 실패시켜 부분 성공을 완료로 보고하지 않는다. */
export async function sendRevalidationTags({
  tags,
  dry,
  webUrl,
  secret,
  fetchImpl = fetch,
  chunkSize = TAGS_PER_REQUEST,
}: SendRevalidationInput): Promise<SendRevalidationResult> {
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) throw new Error('chunkSize는 양의 정수여야 합니다.')
  const uniqueTags = [...new Set(tags)]
  const plannedRequests = Math.ceil(uniqueTags.length / chunkSize)

  if (dry || uniqueTags.length === 0) {
    return { plannedRequests, completedRequests: 0, confirmedTags: 0 }
  }
  if (!secret) throw new Error('CRON_SECRET이 없어 재검증을 실행할 수 없습니다.')
  if (!webUrl) throw new Error('재검증할 web 주소가 없습니다.')

  let completedRequests = 0
  let confirmedTags = 0

  for (let index = 0; index < uniqueTags.length; index += chunkSize) {
    const chunk = uniqueTags.slice(index, index + chunkSize)
    const endpoint = revalidationApiPathForTags(chunk)
    let response: Response
    try {
      response = await fetchImpl(`${webUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: chunk, secret }),
        signal: AbortSignal.timeout(20_000),
      })
    } catch (error) {
      throw new Error(
        `재검증 HTTP 호출 실패 (${confirmedTags}/${uniqueTags.length} 태그 확인): ${String(error)}`,
      )
    }

    const raw = await response.text()
    const body = parseResponseBody(raw, response.status)
    if (!response.ok) {
      throw new Error(
        `재검증 API 실패 HTTP ${response.status} (${confirmedTags}/${uniqueTags.length}): ${raw.slice(0, 500)}`,
      )
    }
    if (!isCompleteCacheRevalidationResponse(body, chunk)) {
      throw new Error(`재검증 API 완료 응답 계약이 맞지 않습니다: ${raw.slice(0, 500)}`)
    }

    completedRequests += 1
    confirmedTags += chunk.length
  }

  if (completedRequests !== plannedRequests || confirmedTags !== uniqueTags.length) {
    throw new Error(
      `재검증 완료 건수가 맞지 않습니다: 요청 ${completedRequests}/${plannedRequests}, ` +
      `태그 ${confirmedTags}/${uniqueTags.length}`,
    )
  }

  return { plannedRequests, completedRequests, confirmedTags }
}
