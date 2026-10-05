import { createAdminClient } from '@/lib/db/admin'

export const dynamic = 'force-dynamic'

/* ── 수익화 클릭 장부 수집 ──
   클라이언트의 commerce_open·commerce_click 이벤트를 commerce_events에 적는다.
   구매 결과는 제휴사가 쥐고 우리는 「무엇을 눌렀나」만 알 수 있다 — 그 값만 저장한다.
   계측 실패가 화면을 막아서는 안 되므로 응답은 최소로 돌린다. */

const MAX_BODY_BYTES = 2048
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function text(value: unknown, max: number): string | null {
  if (typeof value !== 'string' || value.length > max) return null
  return value
}

function empty(): Response {
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'private, no-store' } })
}

export async function POST(request: Request): Promise<Response> {
  // 같은 사이트에서 온 비콘만 받는다 — 헤더가 없는 환경(구형 브라우저)은 통과시키고 명시된 cross-site만 거른다
  const site = request.headers.get('sec-fetch-site')
  if (site === 'cross-site') return new Response(null, { status: 403 })
  const length = Number(request.headers.get('content-length'))
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return new Response(null, { status: 413 })

  let body: Record<string, unknown>
  try {
    const parsed: unknown = await request.json()
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return new Response(null, { status: 400 })
    body = parsed as Record<string, unknown>
  } catch {
    return new Response(null, { status: 400 })
  }

  const kind = body.event === 'commerce_open' ? 'open' : body.event === 'commerce_click' ? 'click' : null
  const screen = text(body.screen, 200)
  if (!kind || screen === null) return new Response(null, { status: 400 })

  const rawContentId = text(body.content_id, 120)
  const editionId = typeof body.edition_id === 'number' && Number.isSafeInteger(body.edition_id) && body.edition_id > 0
    ? body.edition_id : null

  const { error } = await createAdminClient().from('commerce_events').insert({
    kind,
    screen,
    target: text(body.target, 40) ?? (kind === 'open' ? 'modal' : 'product'),
    platform: text(body.platform, 40),
    locale: text(body.locale, 12) ?? 'ko',
    content_type: text(body.content_type, 12),
    content_id: rawContentId && UUID_PATTERN.test(rawContentId) ? rawContentId : null,
    external_ref: rawContentId && !UUID_PATTERN.test(rawContentId) ? rawContentId : null,
    edition_id: editionId,
  })
  if (error) return new Response(null, { status: 500 })
  return empty()
}
