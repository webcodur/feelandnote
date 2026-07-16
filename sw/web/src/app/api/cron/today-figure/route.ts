import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { LISTING_DEFAULT_TIERS } from '@feelandnote/shared/constants/celeb-tiers'

/** seed 기반 fallback */
function calcSeed(dateStr: string): number {
  return dateStr.split('-').reduce((acc, n) => acc + parseInt(n), 0) + 1
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const today = new Date().toISOString().slice(0, 10)
  const monthDay = today.slice(5) // "MM-DD"

  // 1. 오늘 생일인 셀럽 조회 (birth_date LIKE '%-MM-DD')
  const { data: birthdayCelebs } = await supabase
    .from('profiles')
    .select('id, nickname')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    // 신화·관계 인물은 목록에서 제외
    .in('celeb_tier', [...LISTING_DEFAULT_TIERS])
    .like('birth_date', `%-${monthDay}`)

  let selectedId: string
  let source: string

  if (birthdayCelebs?.length) {
    // 생일 셀럽 중 콘텐츠 5개 이상인 셀럽 우선
    const ids = birthdayCelebs.map((c) => c.id)

    const { data: ucData } = await supabase
      .from('user_contents')
      .select('user_id')
      .in('user_id', ids)
      .eq('status', 'FINISHED')
      .eq('visibility', 'public')

    const countMap = new Map<string, number>()
    if (ucData) {
      for (const item of ucData) {
        countMap.set(item.user_id, (countMap.get(item.user_id) || 0) + 1)
      }
    }

    // 콘텐츠 많은 순 정렬, 5개 이상 우선
    const sorted = birthdayCelebs
      .map((c) => ({ ...c, count: countMap.get(c.id) || 0 }))
      .sort((a, b) => b.count - a.count)

    const rich = sorted.find((c) => c.count >= 5)
    selectedId = rich ? rich.id : sorted[0].id
    source = 'birthday'
  } else {
    // 2. 생일 셀럽 없으면 seed fallback
    const { data: celebProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('profile_type', 'CELEB')
      .eq('status', 'active')
      // 신화·관계 인물은 목록에서 제외
      .in('celeb_tier', [...LISTING_DEFAULT_TIERS])

    if (!celebProfiles?.length) {
      return NextResponse.json({ message: 'No celebs found' })
    }

    const seed = calcSeed(today)
    const idx = seed % celebProfiles.length
    selectedId = celebProfiles[idx].id
    source = 'seed'
  }

  // 3. daily_figures UPSERT
  const { error: upsertError } = await supabase.from('daily_figures').upsert(
    {
      date: today,
      celeb_id: selectedId,
      source,
      news_count: 0,
    },
    { onConflict: 'date' }
  )

  if (upsertError) {
    console.error('[today-figure] UPSERT 실패:', upsertError)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }

  return NextResponse.json({
    date: today,
    celeb_id: selectedId,
    source,
  })
}
