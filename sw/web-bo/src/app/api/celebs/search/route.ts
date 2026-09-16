import { createClient } from '@/lib/db/server'
import { NextRequest, NextResponse } from 'next/server'
import { CELEB_MANAGED_PUBLICATION_STATUSES } from '@feelandnote/shared/constants/celeb-publication'

/**
 * 셀럽 검색 — 관리 화면의 인물 고르기가 함께 쓴다.
 *
 * 응답 모양은 `{ celebs: [...] }` 하나로 유지한다. 두 모양이 섞이면 어느 쪽이 맞는지 화면마다 갈린다.
 *
 * 검색어 없이 부르면 이름순 앞쪽을 `limit` 만큼 돌려준다. 검색어를 준 경우에만 좁힌다.
 */

/** 인물 고르기 화면이 부제·배지에 쓰는 값까지 포함한다 */
const SELECT = `
  id, slug, nickname, nickname_en, title, profession, nationality,
  bio, avatar_url, portrait_url, speech_tone, has_voice, voice_id_ko, voice_id_en,
  birth_date, death_date, celeb_tier, status:publication_status
`

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const q = sp.get('q')?.trim() ?? ''
  const profession = sp.get('profession')
  const hasVoice = sp.get('hasVoice')
  const limit = Math.min(Math.max(Number(sp.get('limit') ?? 10), 1), 100)

  const db = await createClient()

  let query = db
    .from('celebs')
    .select(SELECT)
    .order('nickname')
    .limit(limit)

  // 서비스에 안 뜨는 인물도 관리 대상이라 삭제(deleted)만 걸러낸다
  query = query.in('publication_status', [...CELEB_MANAGED_PUBLICATION_STATUSES])

  if (q) {
    // 연결 키(slug)로도 찾게 한다 — 이름보다 키를 먼저 아는 경우가 많다
    query = query.or(`nickname.ilike.%${q}%,nickname_en.ilike.%${q}%,slug.ilike.%${q}%`)
  }
  if (profession) query = query.eq('profession', profession)
  if (hasVoice === 'true') query = query.eq('has_voice', true)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ celebs: data ?? [] })
}
