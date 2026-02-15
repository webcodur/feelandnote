'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export interface TodayFigureScheduleItem {
  date: string
  celeb: {
    id: string
    nickname: string | null
    avatar_url: string | null
    profession: string | null
    contentCount: number
  } | null
  source: 'news' | 'seed' | 'seed_prediction'
  newsCount: number
}

/**
 * 날짜 기반 seed 계산 (web과 동일 알고리즘)
 * seed = year + month + day + 1
 */
function calcSeed(dateStr: string): number {
  return dateStr.split('-').reduce((acc, n) => acc + parseInt(n), 0) + 1
}

/**
 * 주어진 날짜 범위에 대해 "오늘의 인물" 스케줄을 계산한다.
 * daily_figures에 저장된 데이터가 있으면 우선 사용하고, 없는 날짜는 seed 예측값 표시.
 */
export async function getTodayFigureSchedule(
  startDate: string,
  days: number
): Promise<TodayFigureScheduleItem[]> {
  const supabase = createAdminClient()

  // 날짜 목록 생성
  const dates: string[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    dates.push(d.toISOString().slice(0, 10))
  }

  // 1. daily_figures에서 해당 날짜 범위 데이터 조회
  const { data: dailyFigures } = await supabase
    .from('daily_figures')
    .select('date, celeb_id, source, news_count')
    .gte('date', dates[0])
    .lte('date', dates[dates.length - 1])

  const dailyMap = new Map(
    (dailyFigures || []).map(df => [df.date, df])
  )

  // 2. active CELEB 프로필 조회
  const { data: celebProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')

  if (!celebProfiles?.length) {
    return dates.map(date => {
      const df = dailyMap.get(date)
      return { date, celeb: null, source: df?.source || 'seed_prediction', newsCount: df?.news_count || 0 }
    })
  }

  const celebIds = celebProfiles.map(p => p.id)

  // 3. 콘텐츠 개수 집계 (배치 페이지네이션)
  const PAGE_SIZE = 1000
  const BATCH_SIZE = 50
  const countsData: { user_id: string }[] = []

  for (let b = 0; b < celebIds.length; b += BATCH_SIZE) {
    const batchIds = celebIds.slice(b, b + BATCH_SIZE)
    let from = 0
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from('user_contents')
        .select('user_id')
        .in('user_id', batchIds)
        .eq('status', 'FINISHED')
        .eq('visibility', 'public')
        .range(from, from + PAGE_SIZE - 1)

      if (error || !data?.length) break
      countsData.push(...data)
      hasMore = data.length === PAGE_SIZE
      from += PAGE_SIZE
    }
  }

  // 셀럽별 콘텐츠 개수
  const countMap = new Map<string, number>()
  for (const item of countsData) {
    countMap.set(item.user_id, (countMap.get(item.user_id) || 0) + 1)
  }

  // 5개 이상인 셀럽만 필터
  const eligibleCelebs = Array.from(countMap.entries())
    .filter(([, count]) => count >= 5)
    .map(([id, count]) => ({ id, count }))

  if (!eligibleCelebs.length) {
    return dates.map(date => {
      const df = dailyMap.get(date)
      return { date, celeb: null, source: df?.source || 'seed_prediction', newsCount: df?.news_count || 0 }
    })
  }

  // 4. 각 날짜별 셀럽 결정 (daily_figures 우선, 없으면 seed 예측)
  const selectedIds = new Set<string>()
  const schedule: { date: string; celebId: string; count: number; source: 'news' | 'seed' | 'seed_prediction'; newsCount: number }[] = []

  for (const date of dates) {
    const df = dailyMap.get(date)
    if (df) {
      // daily_figures에 저장된 데이터 사용
      selectedIds.add(df.celeb_id)
      const celebCount = countMap.get(df.celeb_id) || 0
      schedule.push({
        date,
        celebId: df.celeb_id,
        count: celebCount,
        source: df.source as 'news' | 'seed',
        newsCount: df.news_count || 0,
      })
    } else {
      // seed 예측
      const seed = calcSeed(date)
      const idx = seed % eligibleCelebs.length
      const selected = eligibleCelebs[idx]
      selectedIds.add(selected.id)
      schedule.push({
        date,
        celebId: selected.id,
        count: selected.count,
        source: 'seed_prediction',
        newsCount: 0,
      })
    }
  }

  // 5. 필요한 프로필만 일괄 조회
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url, profession')
    .in('id', Array.from(selectedIds))

  const profileMap = new Map(
    (profiles || []).map(p => [p.id, p])
  )

  return schedule.map(({ date, celebId, count, source, newsCount }) => {
    const profile = profileMap.get(celebId)
    return {
      date,
      celeb: profile
        ? {
            id: profile.id,
            nickname: profile.nickname,
            avatar_url: profile.avatar_url,
            profession: profile.profession,
            contentCount: count,
          }
        : null,
      source,
      newsCount,
    }
  })
}
