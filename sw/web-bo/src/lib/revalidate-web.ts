import {
  CACHE_TAGS,
  domainRevalidationTags,
  itemRevalidationTags,
  type CacheItemTarget,
  type CacheTag,
} from '@feelandnote/shared/constants/cache-tags'

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

async function sendRevalidate(tags: string[]) {
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL || 'https://feelandnote.com'
  const secret = process.env.CRON_SECRET

  if (!secret) {
    // 운영에는 설정돼 있다. 로컬·프리뷰에서 값이 없으면 무효화를 건너뛴다.
    console.warn('[revalidate] CRON_SECRET 없음 — 로컬 환경으로 간주해 캐시 무효화 생략')
    return
  }

  try {
    const res = await fetch(`${webUrl}/api/revalidate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // web의 /api/revalidate는 배열·단일 문자열 모두 수용한다.
      body: JSON.stringify({ tag: [...new Set(tags)], secret }),
    })

    if (!res.ok) {
      console.warn(`[revalidate] 실패: ${res.status}`)
    }
  } catch {
    // 네트워크 오류 시 무시 — 1시간 후 자동 갱신
    console.warn('[revalidate] 연결 실패 — 자동 갱신 대기')
  }
}
