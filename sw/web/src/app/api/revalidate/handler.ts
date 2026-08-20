import { NextRequest, NextResponse } from 'next/server'
import {
  ALL_CACHE_TAGS,
  isAllowedCacheTag,
  normalizeLegacyCacheTag,
} from '@feelandnote/shared/constants/cache-tags'
import type { purgeCloudflareByTags } from '@/lib/cloudflarePurge'

type RevalidationDependencies = {
  expireTag: (tag: string) => void
  purgeByTags: typeof purgeCloudflareByTags
}

// DB trigger는 200개씩 보내고, 작품/slug 태그당 HTML URL은 최대 2개다.
// 200개로 막아 Cloudflare Free의 800 single-file URLs/s 한도 안에 둔다.
const MAX_TAGS_PER_REQUEST = 200

/** Next 라우트의 허용 export를 더럽히지 않고 요청·실패 계약을 단위 테스트하기 위한 핸들러. */
export function createRevalidationHandler(dependencies: RevalidationDependencies) {
  return async function handleRevalidation(request: NextRequest) {
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

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Request body must be a JSON object.' }, { status: 400 })
    }

    const { tag, secret } = body as { tag?: unknown; secret?: unknown }

    if (secret !== expected) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 단일 문자열·배열 모두 허용(하위호환). 중복은 제거한다.
    const requested: unknown[] = Array.isArray(tag) ? tag : [tag]
    if (requested.length > MAX_TAGS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Too many tags. Maximum: ${MAX_TAGS_PER_REQUEST}` },
        { status: 400 },
      )
    }
    if (!requested.every((value): value is string => typeof value === 'string')) {
      return NextResponse.json({ error: 'Every tag must be a string.' }, { status: 400 })
    }
    const tags = [...new Set(requested.map(normalizeLegacyCacheTag))]

    // 도메인 태그이거나 「알려진 도메인:식별자」만 받는다 — 아무 문자열이나 받으면
    // 외부에서 임의 캐시를 비울 수 있다.
    const invalid = tags.length === 0 || tags.some(t => !isAllowedCacheTag(t))
    if (invalid) {
      return NextResponse.json(
        { error: `Invalid tag. Allowed: ${ALL_CACHE_TAGS.join(', ')} (or "<domain>:<id>")` },
        { status: 400 },
      )
    }

    for (const tag of tags as string[]) dependencies.expireTag(tag)

    // Next 캐시만 비고 Cloudflare 사본이 남으면 무효화는 완료된 것이 아니다.
    const cloudflare = await dependencies.purgeByTags(tags as string[])
    if (!cloudflare.ok) {
      const status = cloudflare.status === 'not_configured' ? 503 : 502
      return NextResponse.json(
        {
          revalidated: true,
          complete: false,
          tags,
          cloudflare,
          error: 'Next cache was revalidated, but the Cloudflare purge did not complete.',
        },
        { status },
      )
    }

    return NextResponse.json({ revalidated: true, complete: true, tags, cloudflare })
  }
}
