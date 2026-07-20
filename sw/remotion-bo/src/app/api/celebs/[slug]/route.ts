import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const PROFILE_SELECT = 'id, slug, nickname, nickname_en, title, profession, nationality, bio, bio_en, avatar_url, speech_tone, cultural_journey, cultural_journey_en, virtual_monologue, has_voice, voice_id_ko, voice_id_en, voice_speed, birth_date, death_date, celeb_tier'

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const monologueOnly = new URL(req.url).searchParams.get('monologueOnly') === '1'

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
      review, source_url,
      contents!inner(
        id, type, thumbnail_url, publish_year,
        content_locales(title, creator, locale)
      )
    `)
    .eq('user_id', profile.id)
    .eq('visibility', 'public')
    .eq('contents.type', 'BOOK')

  return NextResponse.json({ profile, books: books ?? [] })
}
