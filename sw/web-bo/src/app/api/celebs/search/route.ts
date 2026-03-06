import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('q')

  if (!query || query.trim().length < 1) {
    return NextResponse.json({ celebs: [] })
  }

  const supabase = await createClient()
  const searchTerm = `%${query.trim()}%`

  const { data, error } = await supabase
    .from('profiles')
    .select('id, slug, nickname, nickname_en, avatar_url, profession')
    .eq('profile_type', 'CELEB')
    .or(`nickname.ilike.${searchTerm},nickname_en.ilike.${searchTerm}`)
    .order('nickname')
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    celebs: (data || []).map((c) => ({
      slug: c.slug,
      nickname: c.nickname,
      nickname_en: c.nickname_en,
      avatar_url: c.avatar_url,
      profession: c.profession,
    })),
  })
}
