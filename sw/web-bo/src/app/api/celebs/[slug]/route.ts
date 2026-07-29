import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { guardAdminRoute } from '@/lib/admin-route'

// 이식 시 교체: 원본의 anon 키 단일 클라이언트(`@/lib/supabase` 의 supabase) 대신
// 이 앱의 관례인 `@/lib/supabase/server` 의 createClient() (사용자 권한)를 쓴다.
// 이식 시 추가: 이 앱의 `/api/**` 는 미들웨어가 없어 그냥 열려 있으므로 관리자 확인을 앞에 둔다.

const PROFILE_SELECT = 'id, slug, nickname, nickname_en, title, profession, nationality, bio, bio_en, avatar_url, speech_tone, cultural_journey, cultural_journey_en, virtual_monologue, has_voice, voice_id_ko, voice_id_en, voice_speed, birth_date, death_date, celeb_tier'

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = await guardAdminRoute()
  if (denied) return denied

  const { slug } = await params
  const monologueOnly = new URL(req.url).searchParams.get('monologueOnly') === '1'
  const supabase = await createClient()

  if (monologueOnly) {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, slug, nickname, virtual_monologue, celeb_tier')
      .eq('slug', slug)
      .eq('profile_type', 'CELEB')
      .single()

    if (error || !profile) return NextResponse.json({ error: 'not found' }, { status: 404 })
    return NextResponse.json({ profile })
  }

  // 프로필 조회
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select(PROFILE_SELECT)
    .eq('slug', slug)
    .eq('profile_type', 'CELEB')
    .single()

  if (pErr || !profile) return NextResponse.json({ error: 'not found' }, { status: 404 })
  // 도서 목록 조회 (user_contents → contents → content_locales)
  const { data: books } = await supabase
    .from('user_contents')
    .select(`
      id, content_id, review, source_url,
      contents!inner(
        id, type, release_date,
        content_locales(title, creator, thumbnail_url, locale)
      )
    `)
    .eq('user_id', profile.id)
    .eq('visibility', 'public')
    .eq('contents.type', 'BOOK')

  return NextResponse.json({ profile, books: books ?? [] })
}
