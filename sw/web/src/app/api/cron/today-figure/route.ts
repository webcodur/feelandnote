import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID!
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET!
const NEWS_BATCH_SIZE = 20

interface NaverNewsResponse {
  total: number
  items: { title: string; pubDate: string }[]
}

/** 네이버 뉴스 검색 - 최근 48시간 내 기사 수 반환 */
async function searchNews(nickname: string): Promise<number> {
  const url = `https://openapi.naver.com/v1/search/news.json?query="${encodeURIComponent(nickname)}"&sort=date&display=100`

  try {
    const res = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
      },
    })
    if (!res.ok) return 0

    const data: NaverNewsResponse = await res.json()
    if (!data.items?.length) return 0

    const cutoff = Date.now() - 48 * 60 * 60 * 1000
    return data.items.filter((item) => new Date(item.pubDate).getTime() >= cutoff).length
  } catch {
    return 0
  }
}

/** seed 기반 fallback (기존 알고리즘 동일) */
function calcSeed(dateStr: string): number {
  return dateStr.split('-').reduce((acc, n) => acc + parseInt(n), 0) + 1
}

export async function GET(request: Request) {
  // 1. 인증 체크
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // 2. 생존 eligible 셀럽 조회
  const { data: celebProfiles } = await supabase
    .from('profiles')
    .select('id, nickname, death_date')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')

  if (!celebProfiles?.length) {
    return NextResponse.json({ message: 'No celebs found' })
  }

  // 생존 셀럽만 필터 (death_date가 null이거나 빈 문자열)
  const aliveCelebs = celebProfiles.filter((c) => !c.death_date || c.death_date === '')

  if (!aliveCelebs.length) {
    return NextResponse.json({ message: 'No alive celebs' })
  }

  // 콘텐츠 5개 이상 필터
  const eligibleCelebs: { id: string; nickname: string }[] = []
  const DB_BATCH = 50

  for (let i = 0; i < aliveCelebs.length; i += DB_BATCH) {
    const batch = aliveCelebs.slice(i, i + DB_BATCH)
    const ids = batch.map((c) => c.id)

    const { data: ucData } = await supabase
      .from('user_contents')
      .select('user_id')
      .in('user_id', ids)
      .eq('status', 'FINISHED')
      .eq('visibility', 'public')

    if (!ucData) continue

    const countMap = new Map<string, number>()
    for (const item of ucData) {
      countMap.set(item.user_id, (countMap.get(item.user_id) || 0) + 1)
    }

    for (const celeb of batch) {
      if ((countMap.get(celeb.id) || 0) >= 5) {
        eligibleCelebs.push({ id: celeb.id, nickname: celeb.nickname })
      }
    }
  }

  if (!eligibleCelebs.length) {
    return NextResponse.json({ message: 'No eligible celebs' })
  }

  // 3. Naver 뉴스 병렬 검색 (NEWS_BATCH_SIZE씩)
  const newsResults: { id: string; nickname: string; count: number }[] = []

  for (let i = 0; i < eligibleCelebs.length; i += NEWS_BATCH_SIZE) {
    const batch = eligibleCelebs.slice(i, i + NEWS_BATCH_SIZE)
    const results = await Promise.all(
      batch.map(async (celeb) => ({
        id: celeb.id,
        nickname: celeb.nickname,
        count: await searchNews(celeb.nickname),
      }))
    )
    newsResults.push(...results)
  }

  // 4. 결과 처리
  const today = new Date().toISOString().slice(0, 10)
  const withNews = newsResults.filter((r) => r.count > 0).sort((a, b) => b.count - a.count)

  let selectedId: string
  let source: string
  let newsCount: number

  if (withNews.length > 0) {
    selectedId = withNews[0].id
    source = 'news'
    newsCount = withNews[0].count
    console.log(`[today-figure] 뉴스 1위: ${withNews[0].nickname} (${newsCount}건)`)
  } else {
    const seed = calcSeed(today)
    const idx = seed % eligibleCelebs.length
    selectedId = eligibleCelebs[idx].id
    source = 'seed'
    newsCount = 0
    console.log(`[today-figure] 뉴스 매칭 없음, seed fallback: ${eligibleCelebs[idx].nickname}`)
  }

  // 5. daily_figures UPSERT
  const { error: upsertError } = await supabase.from('daily_figures').upsert(
    {
      date: today,
      celeb_id: selectedId,
      source,
      news_count: newsCount,
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
    news_count: newsCount,
  })
}
