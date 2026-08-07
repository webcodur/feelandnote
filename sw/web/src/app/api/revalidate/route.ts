import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'
import { ALL_CACHE_TAGS, isAllowedCacheTag } from '@feelandnote/shared/constants/cache-tags'

/**
 * 캐시 무효화 API — web-bo 등 외부에서 호출
 * POST /api/revalidate
 * Body: { tag: "celebs" | "celebs:<id>" | ["contents:<id>", "contents"], secret: "..." }
 *
 * tag는 단일 문자열·배열 모두 받는다. BO의 한 저장이 여러 도메인에 걸칠 때
 * (예: 셀럽 프로필+대사 동시 수정) 한 번의 호출로 해당 도메인만 비우기 위함이다.
 *
 * **한 건을 고쳤으면 「도메인:식별자」를 보내라.** 도메인만 보내면 그 종류 전부가
 * 낡은 것으로 처리되고, 그 뒤 방문·크롤링마다 재생성이 쌓인다. 도메인 전체 비우기는
 * 대량 작업이나 구조 변경처럼 정말 전부 바뀐 때만 쓴다.
 */
export async function POST(request: NextRequest) {
  const expected = process.env.CRON_SECRET

  // 비밀키 미설정 환경에서는 무효화 엔드포인트를 완전히 닫는다.
  // (미설정 시 secret 비교가 undefined === undefined로 통과되어 외부 무단 캐시 퍼지에
  //  노출되는 것을 차단. 키를 설정하면 정상 인증 경로가 복구된다.)
  if (!expected) {
    return NextResponse.json(
      { error: 'Revalidation disabled: CRON_SECRET is not configured.' },
      { status: 503 },
    )
  }

  const { tag, secret } = await request.json()

  if (secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 단일 문자열·배열 모두 허용(하위호환). 중복은 제거한다.
  const requested: unknown[] = Array.isArray(tag) ? tag : [tag]
  const tags = [...new Set(requested)]

  // 도메인 태그이거나 「알려진 도메인:식별자」만 받는다 — 아무 문자열이나 받으면
  // 외부에서 임의 캐시를 비울 수 있다
  const invalid = tags.length === 0 || tags.some(t => !isAllowedCacheTag(t))
  if (invalid) {
    return NextResponse.json(
      { error: `Invalid tag. Allowed: ${ALL_CACHE_TAGS.join(', ')} (or "<domain>:<id>")` },
      { status: 400 },
    )
  }

  for (const t of tags as string[]) {
    revalidateTag(t, { expire: 0 })
  }

  return NextResponse.json({ revalidated: true, tags })
}
