import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.trim().length < 2) {
    return NextResponse.json({ contents: [] })
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contents')
    .select('id, title, type, creator, thumbnail_url')
    .ilike('title', `%${query.trim()}%`)
    .order('title')
    .limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ contents: data || [] })
}
