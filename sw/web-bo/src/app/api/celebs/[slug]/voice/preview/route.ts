import { NextResponse } from 'next/server'
import { guardAdminRoute } from '@/lib/admin-route'
import { generateVoicePreview } from '@/actions/admin/voice-gen'

/**
 * POST /api/celebs/[slug]/voice/preview
 * body: { voiceId, text, settings?, accountId? } → { success, base64, bytes }
 *
 * 세력도감·서재 탐방이 쓰는 음원 만들기 훅(useVoiceGeneration)은 합성 창구를 **주소**로 받는다.
 * 그래서 서버 액션(generateVoicePreview)을 이 창구가 감싸 같은 모양으로 내놓는다 — 합성 코드를
 * 두 벌로 만들지 않는다.
 *
 * [slug] 은 쓰지 않는다(목소리 번호는 본문이 들고 온다). 경로를 인물 아래 둔 것은 같은 묶음의
 * 창구를 한자리에 모으기 위해서다.
 */
export async function POST(req: Request) {
  const denied = await guardAdminRoute()
  if (denied) return denied

  const body = await req.json().catch(() => ({}))
  const { voiceId, text, settings, accountId } = body as {
    voiceId?: string
    text?: string
    settings?: { stability?: number; similarity_boost?: number; style?: number; speed?: number }
    accountId?: string | null
  }

  if (!voiceId?.trim() || !text?.trim()) {
    return NextResponse.json({ success: false, error: 'voiceId 와 text 가 필요하다' }, { status: 400 })
  }

  const result = await generateVoicePreview({
    voiceId,
    text,
    settings: {
      stability: settings?.stability ?? 0.5,
      similarity_boost: settings?.similarity_boost ?? 0.75,
      style: settings?.style ?? 0.3,
      speed: settings?.speed ?? 1.0,
    },
    accountId,
  })

  return NextResponse.json(result)
}
