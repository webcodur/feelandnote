import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.json({ error: 'Missing env vars', url: !!url, key: !!key })
  }

  try {
    const supabase = createClient(url, key)
    const { data, error, count } = await supabase
      .from('profiles')
      .select('slug', { count: 'exact', head: true })
      .eq('profile_type', 'CELEB')
      .eq('status', 'active')
      .not('slug', 'is', null)

    return NextResponse.json({ count, error: error?.message ?? null })
  } catch (e: any) {
    return NextResponse.json({ error: e.message })
  }
}
