import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

const ALLOWED_TAGS = ['celebs']

/**
 * 캐시 무효화 API — web-bo 등 외부에서 호출
 * POST /api/revalidate
 * Body: { tag: "celebs", secret: "..." }
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

  if (!tag || !ALLOWED_TAGS.includes(tag)) {
    return NextResponse.json({ error: `Invalid tag. Allowed: ${ALLOWED_TAGS.join(', ')}` }, { status: 400 })
  }

  revalidateTag(tag, { expire: 0 })

  return NextResponse.json({ revalidated: true, tag })
}
