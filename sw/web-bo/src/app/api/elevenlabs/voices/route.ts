import { NextResponse } from 'next/server'
import { getEleAccounts } from '@feelandnote/shared/lib/ele-accounts'
import { guardAdminRoute } from '@/lib/admin-route'

type ElevenVoice = {
  voice_id: string
  name: string
  category?: string
  labels?: Record<string, string> | null
  preview_url?: string | null
  description?: string | null
}

type ElevenVoicesPage = {
  voices?: ElevenVoice[]
  has_more?: boolean
  next_page_token?: string | null
}

/** 한 계정의 음성을 마지막 페이지까지 모두 받아 합친다(안전 상한 50페이지). */
async function fetchAccountVoices(apiKey: string): Promise<ElevenVoice[] | { error: string; status: number }> {
  const all: ElevenVoice[] = []
  let pageToken: string | null = null
  const MAX_PAGES = 50

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL('https://api.elevenlabs.io/v2/voices')
    url.searchParams.set('page_size', '100')
    if (pageToken) url.searchParams.set('next_page_token', pageToken)

    const res = await fetch(url, {
      headers: { 'xi-api-key': apiKey, Accept: 'application/json' },
      next: { revalidate: 300 },
    })
    if (!res.ok) {
      const err = await res.text()
      return { error: `ElevenLabs ${res.status}: ${err}`, status: 502 }
    }
    const data: ElevenVoicesPage = await res.json()
    all.push(...(data.voices ?? []))
    if (!data.has_more || !data.next_page_token) break
    pageToken = data.next_page_token
  }
  return all
}

/**
 * GET /api/elevenlabs/voices
 *
 * 연결된 모든 ElevenLabs 계정의 음성을 합쳐 반환한다.
 * 각 음성에는 소속 계정(account.id/account.label)이 붙는다.
 * 여러 계정에 공통으로 존재하는 기본·공용 음성은 앞선(기본) 계정 기준으로 한 번만 담는다.
 * v2/voices 는 한 번에 최대 100개만 주므로 has_more/next_page_token 을 끝까지 따라간다.
 * 응답이 변동될 수 있어 캐시는 짧게(5분) 적용한다.
 *
 * 이식 시 추가: 이 앱의 `/api/**` 는 미들웨어가 없어 그냥 열려 있으므로 관리자 확인을 앞에 둔다.
 */
export async function GET() {
  const denied = await guardAdminRoute()
  if (denied) return denied

  const accounts = getEleAccounts()
  if (accounts.length === 0) {
    return NextResponse.json({ error: 'ELEVENLABS_API_KEY not set' }, { status: 500 })
  }

  try {
    const seen = new Set<string>()
    const voices: Array<ElevenVoice & { account: { id: string; label: string } }> = []

    for (const acc of accounts) {
      const result = await fetchAccountVoices(acc.apiKey)
      if (!Array.isArray(result)) {
        return NextResponse.json({ error: `[${acc.label}] ${result.error}` }, { status: result.status })
      }
      for (const v of result) {
        if (seen.has(v.voice_id)) continue
        seen.add(v.voice_id)
        voices.push({
          voice_id: v.voice_id,
          name: v.name,
          category: v.category ?? undefined,
          labels: v.labels ?? null,
          preview_url: v.preview_url ?? null,
          description: v.description ?? null,
          account: { id: acc.id, label: acc.label },
        })
      }
    }

    return NextResponse.json({ voices })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
