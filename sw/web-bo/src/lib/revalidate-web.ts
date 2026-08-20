import {
  CACHE_TAGS,
  domainRevalidationTags,
  isCompleteCacheRevalidationResponse,
  itemRevalidationTags,
  type CacheItemTarget,
  type CacheTag,
} from '@feelandnote/shared/constants/cache-tags'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * web 앱의 캐시를 **도메인 통째로** 무효화한다.
 *
 * ⚠️ 한 건만 고쳤다면 `revalidateWebItem`을 써라. 도메인 전체를 비우면 그 종류의 화면이
 * 전부 낡은 것으로 처리되고, 그 뒤 방문·크롤링마다 재생성이 쌓인다. 인물 1,929 · 콘텐츠
 * 10,640 규모라(26.08.08) 이것만으로 ISR 쓰기가 무료 한도의 5.5배까지 올라갔다.
 * 대량 작업이나 구조 변경처럼 정말 전부 바뀐 때만 쓰며, 호출부는 이유를 반드시 적는다.
 *
 * 저장한 데이터가 속한 도메인만 넘긴다. 여러 테이블을 건드리는 액션은 배열로 복수 전달한다.
 * 기본값을 두지 않는 이유: 인자를 빠뜨린 호출이 전역 퍼지로 되살아나지 않도록
 * 타입 에러로 잡기 위함이다(과거 전 캐시가 'celebs' 단일 태그를 공유해 퍼지 1회당 약 46MB 재조회).
 */
export async function revalidateWebCache(tag: CacheTag | CacheTag[], reason: string) {
  if (!reason.trim()) throw new Error('Domain-wide cache revalidation requires a reason')
  return sendRevalidate(domainRevalidationTags(tag))
}

/**
 * web 앱의 캐시를 **한 건만** 무효화한다.
 *
 * 인물 한 명·작품 한 건을 고쳤을 때 쓴다. 그 한 건의 화면만 다시 만들어지고 나머지는
 * 창고에 그대로 남는다.
 *
 * `alsoDomains`에는 이 저장이 목록 구성까지 바꿀 때만 도메인을 넣는다(신규 등록·삭제·
 * 공개 여부 변경 등). 제목이나 본문만 고쳤다면 비워 두면 된다 — 목록은 짧은 수명으로
 * 저절로 갱신된다.
 */
export async function revalidateWebItem(
  domain: CacheTag,
  id: string | null | undefined,
  alsoDomains: CacheTag[] = [],
) {
  return revalidateWebItems([{ domain, id }], alsoDomains)
}

/** 여러 항목 태그를 HTTP 한 번으로 무효화한다. `alsoDomains`는 목록 캐시만 가리킨다. */
export async function revalidateWebItems(
  targets: readonly CacheItemTarget[],
  alsoDomains: CacheTag[] = [],
) {
  return sendRevalidate(itemRevalidationTags(targets, alsoDomains))
}

/** 목록 구성만 바뀌었을 때 사용한다. 이미 존재하는 상세 캐시는 건드리지 않는다. */
export async function revalidateWebLists(domains: CacheTag | CacheTag[]) {
  const values = Array.isArray(domains) ? domains : [domains]
  return sendRevalidate([...new Set(values)])
}

export interface WebContentRevalidationSnapshot {
  contentId: string
  externalId: string | null
  /** null이면 인물 서가 의존성을 조회하지 않은 상세 전용 스냅샷이다. */
  celebLibraries: Array<{ id: string; slug: string | null }> | null
}

interface RevalidateWebContentOptions {
  /** 제목·창작자·표지처럼 인물 서가 초기 HTML에 들어가는 값일 때만 켠다. */
  includeCelebLibraries?: boolean
  /** 삭제처럼 목록 구성도 바뀔 때만 넣는다. */
  listDomains?: readonly CacheTag[]
}

const RELATION_PAGE_SIZE = 1_000

/**
 * 삭제 전에 작품 별칭과 이 작품을 담은 인물을 보존하거나, 일반 저장 뒤 필요한 별칭을 읽는다.
 *
 * UUID와 external_id는 서로 다른 상세 캐시 키·공개 URL이 될 수 있어 둘 다 필요하다.
 * 인물은 UUID 캐시와 slug 공개 URL을 함께 가지므로 서가에 영향을 주는 저장이면 둘 다 읽는다.
 */
export async function getWebContentRevalidationSnapshot(
  contentId: string,
  includeCelebLibraries = false,
): Promise<WebContentRevalidationSnapshot> {
  const admin = createAdminClient()
  const { data: content, error: contentError } = await admin
    .from('contents')
    .select('id, external_id')
    .eq('id', contentId)
    .maybeSingle()

  if (contentError) {
    throw new Error(`작품 캐시 식별자 조회 실패: ${contentError.message}`)
  }

  if (!includeCelebLibraries) {
    return {
      contentId: content?.id ?? contentId,
      externalId: content?.external_id ?? null,
      celebLibraries: null,
    }
  }

  const celebLibraries = new Map<string, { id: string; slug: string | null }>()
  for (let from = 0; ; from += RELATION_PAGE_SIZE) {
    const { data, error } = await admin
      .from('celeb_contents')
      .select('celeb_id, celeb:celebs!celeb_contents_celeb_id_fkey(id, slug)')
      .eq('content_id', contentId)
      .order('celeb_id')
      .range(from, from + RELATION_PAGE_SIZE - 1)

    if (error) {
      throw new Error(`작품을 담은 인물 캐시 식별자 조회 실패: ${error.message}`)
    }

    const rows = (data ?? []) as unknown as Array<{
      celeb_id: string
      celeb: { id: string; slug: string | null } | Array<{ id: string; slug: string | null }> | null
    }>
    for (const row of rows) {
      const celeb = Array.isArray(row.celeb) ? row.celeb[0] : row.celeb
      celebLibraries.set(row.celeb_id, {
        id: row.celeb_id,
        slug: celeb?.slug ?? null,
      })
    }
    if (rows.length < RELATION_PAGE_SIZE) break
  }

  return {
    contentId: content?.id ?? contentId,
    externalId: content?.external_id ?? null,
    celebLibraries: [...celebLibraries.values()],
  }
}

/** 작품 스냅샷을 실제 무효화 태그로 바꾼다. 테스트 가능한 순수 계약이다. */
export function webContentRevalidationTags(
  snapshot: WebContentRevalidationSnapshot,
  options: RevalidateWebContentOptions = {},
): string[] {
  const includeCelebLibraries = options.includeCelebLibraries
    ?? snapshot.celebLibraries !== null

  if (includeCelebLibraries && snapshot.celebLibraries === null) {
    throw new Error('인물 서가 캐시 무효화에는 인물 식별자를 포함한 스냅샷이 필요합니다')
  }

  const targets: CacheItemTarget[] = [
    { domain: CACHE_TAGS.CONTENTS, id: snapshot.contentId },
    ...(snapshot.externalId && snapshot.externalId !== snapshot.contentId
      ? [{ domain: CACHE_TAGS.CONTENTS, id: snapshot.externalId } as const]
      : []),
    ...(includeCelebLibraries
      ? (snapshot.celebLibraries ?? []).flatMap((celeb): CacheItemTarget[] => [
        { domain: CACHE_TAGS.CELEBS, id: celeb.id },
        ...(celeb.slug ? [{ domain: CACHE_TAGS.CELEBS, id: celeb.slug }] : []),
      ])
      : []),
  ]

  return itemRevalidationTags(targets, options.listDomains ?? [])
}

/**
 * 작품 한 건과 필요한 공개 별칭만 무효화한다.
 *
 * description·publisher·affiliate_url은 작품 상세/펼침에만 쓰므로 기본값은 작품 태그뿐이다.
 * 제목·창작자·표지는 인물 서가 초기 HTML에도 들어가므로 그 저장만 includeCelebLibraries를 켠다.
 */
export async function revalidateWebContent(
  content: string | WebContentRevalidationSnapshot,
  options: RevalidateWebContentOptions = {},
) {
  const includeCelebLibraries = options.includeCelebLibraries
    ?? (typeof content !== 'string' && content.celebLibraries !== null)
  const snapshot = typeof content === 'string'
    ? await getWebContentRevalidationSnapshot(content, includeCelebLibraries)
    : content

  return sendRevalidate(webContentRevalidationTags(snapshot, {
    ...options,
    includeCelebLibraries,
  }))
}

/** 인물 상세은 id 기반 캐시와 slug 기반 프로필 캐시를 함께 가지므로 두 별칭을 한 번에 비운다. */
export async function revalidateWebCeleb(
  celebId: string,
  slug: string | null | undefined,
  listDomains: CacheTag[] = [],
) {
  return revalidateWebItems(
    [
      { domain: CACHE_TAGS.CELEBS, id: celebId },
      ...(slug ? [{ domain: CACHE_TAGS.CELEBS, id: slug }] : []),
    ],
    listDomains,
  )
}

interface RevalidationResponseBody {
  revalidated?: unknown
  complete?: unknown
  error?: unknown
  tags?: unknown
  cloudflare?: {
    ok?: unknown
    status?: unknown
    mode?: unknown
    urls?: unknown
  }
}

const REVALIDATE_TAGS_PER_REQUEST = 50

export function normalizeRevalidationWebUrl(raw: string | undefined): string {
  if (!raw) throw new Error('[revalidate] NEXT_PUBLIC_WEB_URL이 없습니다')

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('[revalidate] NEXT_PUBLIC_WEB_URL이 올바른 URL이 아닙니다')
  }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('[revalidate] NEXT_PUBLIC_WEB_URL은 origin만 허용합니다')
  }

  const production = url.protocol === 'https:' && url.hostname === 'feelandnote.com'
  const loopback = (url.protocol === 'http:' || url.protocol === 'https:')
    && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  if (!production && !loopback) {
    throw new Error('[revalidate] 운영 feelandnote.com 또는 loopback origin만 허용합니다')
  }
  return url.origin
}

/** HTTP 200이어도 Next와 Cloudflare 무효화가 모두 끝났다는 계약이 없으면 성공으로 가장하지 않는다. */
export function assertRevalidationResponse(body: unknown, expectedTags: readonly string[]): void {
  if (!body || typeof body !== 'object') {
    throw new Error('[revalidate] 응답 JSON이 올바르지 않습니다')
  }

  const result = body as RevalidationResponseBody
  if (result.revalidated !== true) {
    const reason = typeof result.error === 'string' ? `: ${result.error}` : ''
    throw new Error(`[revalidate] Next 캐시 무효화 확인 실패${reason}`)
  }

  if (result.complete !== true) {
    const reason = typeof result.error === 'string' ? `: ${result.error}` : ''
    throw new Error(`[revalidate] 캐시 무효화 미완료${reason}`)
  }

  if (!result.cloudflare || result.cloudflare.ok !== true) {
    throw new Error('[revalidate] Cloudflare 캐시 퍼지 실패')
  }

  if (!isCompleteCacheRevalidationResponse(body, expectedTags)) {
    throw new Error('[revalidate] 캐시 무효화 완료 응답 계약이 올바르지 않습니다')
  }
}

async function sendRevalidate(tags: string[]) {
  const uniqueTags = [...new Set(tags)]
  if (uniqueTags.length === 0) return

  const secret = process.env.CRON_SECRET

  if (!secret) {
    throw new Error('[revalidate] CRON_SECRET이 없어 web 캐시 무효화를 실행할 수 없습니다')
  }
  const webUrl = normalizeRevalidationWebUrl(process.env.NEXT_PUBLIC_WEB_URL)

  for (let index = 0; index < uniqueTags.length; index += REVALIDATE_TAGS_PER_REQUEST) {
    const chunk = uniqueTags.slice(index, index + REVALIDATE_TAGS_PER_REQUEST)
    let res: Response
    try {
      res = await fetch(`${webUrl}/api/revalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: chunk, secret }),
        signal: AbortSignal.timeout(20_000),
      })
    } catch (error) {
      throw new Error('[revalidate] web 캐시 무효화 연결 실패', { cause: error })
    }

    const text = await res.text()
    let body: unknown
    try {
      body = text ? JSON.parse(text) : null
    } catch (error) {
      throw new Error(`[revalidate] 응답 JSON 파싱 실패 (${res.status})`, { cause: error })
    }

    if (!res.ok) {
      const reason = body && typeof body === 'object' && typeof (body as RevalidationResponseBody).error === 'string'
        ? `: ${(body as RevalidationResponseBody).error}`
        : ''
      throw new Error(`[revalidate] web 캐시 무효화 실패 (${res.status})${reason}`)
    }

    assertRevalidationResponse(body, chunk)
  }
}
