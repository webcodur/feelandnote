import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ contents: [] })
  }

  const supabase = await createClient()
  const searchTerm = `%${query.trim()}%`

  // content_locales에서 검색 → content_id 추출
  const { data: matchIds } = await supabase
    .from('content_locales')
    .select('content_id')
    .ilike('title', searchTerm)

  if (!matchIds?.length) {
    return NextResponse.json({ contents: [] })
  }

  const ids = [...new Set(matchIds.map(m => m.content_id))]

  const { data, error } = await supabase
    .from('contents')
    .select('id, type, content_locales(locale, title, creator, thumbnail_url)')
    .in('id', ids)
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const contents = (data || []).map((c: any) => {
    const ko = c.content_locales?.find((l: any) => l.locale === 'ko')
    const en = c.content_locales?.find((l: any) => l.locale === 'en')
    return {
      id: c.id,
      title: ko?.title || en?.title || '',
      type: c.type,
      creator: ko?.creator || en?.creator || null,
      thumbnail_url: ko?.thumbnail_url || en?.thumbnail_url || null,
    }
  })

  return NextResponse.json({ contents })
}
