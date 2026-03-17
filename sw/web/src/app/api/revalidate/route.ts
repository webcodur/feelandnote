import { NextRequest, NextResponse } from 'next/server'
import { revalidateTag } from 'next/cache'

const ALLOWED_TAGS = ['celebs']

/**
 * 캐시 무효화 API — web-bo 등 외부에서 호출
 * POST /api/revalidate
 * Body: { tag: "celebs", secret: "..." }
 */
export async function POST(request: NextRequest) {
  const { tag, secret } = await request.json()

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!tag || !ALLOWED_TAGS.includes(tag)) {
    return NextResponse.json({ error: `Invalid tag. Allowed: ${ALLOWED_TAGS.join(', ')}` }, { status: 400 })
  }

  revalidateTag(tag, { expire: 0 })

  return NextResponse.json({ revalidated: true, tag })
}
