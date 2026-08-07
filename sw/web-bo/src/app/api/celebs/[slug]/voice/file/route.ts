import { guardAdminRoute } from '@/lib/admin-route'
import { NextResponse } from 'next/server'
import { resolveCelebId } from '@/lib/celeb-key'
import { fetchVoiceFile } from '@/actions/admin/voice-gen'

/**
 * GET /api/celebs/[slug]/voice/file?locale=ko&type=greeting&variant=1
 *
 * R2에 저장된 대사 음원을 소리 데이터 그대로 돌려준다.
 *
 * R2 주소를 브라우저가 바로 부르면 다른 출처라 막힌다. 파형 그리기·앞뒤 자르기·들숨 편집은
 * 모두 소리 데이터를 직접 읽어야 하므로 이 창구를 거친다.
 */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = await guardAdminRoute()
  if (denied) return denied

  const { slug } = await params
  const celebId = await resolveCelebId(slug)
  if (!celebId) return NextResponse.json({ error: '인물을 찾지 못했다' }, { status: 404 })

  const sp = new URL(req.url).searchParams
  const locale = sp.get('locale') === 'en' ? 'en' : 'ko'
  const type = sp.get('type') ?? ''
  const variantRaw = sp.get('variant')
  const variant = variantRaw ? Number(variantRaw) : undefined
  if (!type) return NextResponse.json({ error: 'type 이 필요하다' }, { status: 400 })

  const result = await fetchVoiceFile({ celebId, locale, dialogueType: type, variant })
  if (!result.success || !result.base64) {
    return NextResponse.json({ error: result.error ?? '음원 없음' }, { status: 404 })
  }

  const bytes = Buffer.from(result.base64, 'base64')
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      // R2에는 .mp3 이름으로 두지만 앞뒤를 자르거나 소리를 키운 것은 wav 바이트다.
      // 머리 네 글자로 실제 형식을 가려 브라우저가 제대로 풀게 한다.
      'Content-Type': bytes.subarray(0, 4).toString('ascii') === 'RIFF' ? 'audio/wav' : 'audio/mpeg',
      'Content-Length': String(bytes.length),
      'Cache-Control': 'no-store',
    },
  })
}
