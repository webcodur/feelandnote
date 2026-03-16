import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { listEpisodes } from '@/lib/server-utils'
import { SERIES } from '@/lib/series-registry'

const SELECT = `
  id, slug, nickname, nickname_en, title, profession, nationality,
  bio, avatar_url, speech_tone, has_voice, voice_id_ko, voice_id_en,
  birth_date, death_date, celeb_tier
`

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() ?? ''
  const profession = url.searchParams.get('profession')
  const hasVoice = url.searchParams.get('hasVoice')
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100)

  let query = supabase
    .from('profiles')
    .select(SELECT)
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .order('nickname')
    .limit(limit)

  if (q) {
    query = query.or(`nickname.ilike.%${q}%,nickname_en.ilike.%${q}%,slug.ilike.%${q}%`)
  }
  if (profession) {
    query = query.eq('profession', profession)
  }
  if (hasVoice === 'true') {
    query = query.eq('has_voice', true)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // 기존 에피소드 존재 여부 매핑
  const episodeMap = new Map<string, string>()
  for (const s of SERIES) {
    const eps = await listEpisodes(s.id)
    for (const ep of eps) episodeMap.set(ep, s.id)
  }

  const results = (data ?? []).map(celeb => ({
    ...celeb,
    existingEpisode: celeb.slug ? episodeMap.get(celeb.slug) ?? null : null,
  }))

  return NextResponse.json(results)
}
