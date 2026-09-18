/*
  파일명: /app/api/cron/today-figure/route.ts
  기능: 오늘의 인물 편성 — 매일 한 명을 골라 daily_figures에 저장한다
  책임: 선정 순위와 그 근거(source)를 정한다. 화면은 이 표를 먼저 읽고, 없으면 스스로
        생일·시드로 되짚는다(actions/library/today-figure.ts). 그래서 이 크론이 하루 걸러도
        화면이 비지 않는다 — 여기서만 할 수 있는 일은 "뉴스 화제도" 수집이다.

  선정 순위
    1. 뉴스  — 최근 48시간 제목 언급이 임계 이상인 인물 중 최다. 최근 재등장은 막는다
    2. 생일  — 오늘이 생일인 인물 중 기록이 많은 순(5건 이상 우선)
    3. 시드  — 날짜 시드로 고정 선택

  세 갈래 모두 추천 노출 제외 인물(shared/constants/celeb-feature-exclusion.ts)은 후보에서 뺀다.
  뉴스 규칙은 화제도만 보므로 독재자가 뉴스에 오르면 그대로 세웠다(26.09.18 시진핑).
*/

import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient as DatabaseClient } from '@supabase/supabase-js'
import { LISTING_DEFAULT_REALITIES } from '@feelandnote/shared/constants/celeb-tiers'
import { countRecentTitleMentions } from '@feelandnote/content-search/naver-news'
import { getKSTDateKey } from '@/lib/game/date-seed'
import { fetchFeatureExcludedCelebIds } from '@/lib/celeb-feature-exclusion'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'

/* 뉴스 조회를 후보 수만큼 이어 부르므로 기본 상한(10초)으로는 모자란다 */
export const maxDuration = 300

/** 뉴스 화제도를 물어볼 인물 수. 네이버 검색 API를 이 횟수만큼 부른다 */
const NEWS_CANDIDATE_LIMIT = 120

/** 이만큼은 제목에 올라야 "오늘 화제"로 인정한다. 한두 건은 우연이다 */
const NEWS_MIN_MENTIONS = 5

/** 최근 며칠 안에 뽑힌 인물은 다시 세우지 않는다 — 화제도만 보면 같은 사람이 계속 나온다 */
const RECENT_EXCLUSION_DAYS = 14

/** 뉴스를 훑는 시간 창 */
const NEWS_WINDOW_HOURS = 48

/** seed 기반 fallback */
function calcSeed(dateStr: string): number {
  return dateStr.split('-').reduce((acc, n) => acc + parseInt(n), 0) + 1
}

/** 인물별 공개 기록 수 */
async function countPublicContents(
  db: DatabaseClient,
  ids: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (ids.length === 0) return counts

  /* 후보가 천여 명이라 한 번에 .in()으로 물으면 주소가 길어 요청이 실패하고, 그 실패를 삼키면 기록 수가
     전원 0이 되어 「기록 많은 순」이 id 순으로 굴러갔다(26.09.14). 200명씩 나눠, 묶음마다 끝까지 받는다 */
  const chunks = Array.from({ length: Math.ceil(ids.length / 200) }, (_, i) => ids.slice(i * 200, (i + 1) * 200))
  const rows = (await Promise.all(chunks.map((chunk) =>
    selectAllPages<{ celeb_id: string }>((from, to) => db
      .from('celeb_contents')
      .select('celeb_id')
      .in('celeb_id', chunk)
      .eq('status', 'FINISHED')
      .eq('visibility', 'public')
      .order('id', { ascending: true })
      .range(from, to)),
  ))).flat()

  for (const row of rows) {
    counts.set(row.celeb_id, (counts.get(row.celeb_id) ?? 0) + 1)
  }
  return counts
}

/**
 * 오늘 뉴스에서 가장 많이 다뤄진 인물. 임계 미달이면 null.
 *
 * 후보를 좁히는 이유: 이름이 뉴스에 오를 수 있는 사람은 생존 인물이고, 전원(1,700여 명)에게
 * 매일 물으면 외부 API를 그만큼 두드린다. 기록이 많은 순으로 상한을 둔다.
 */
async function pickNewsCeleb(
  db: DatabaseClient,
  today: string,
  excluded: ReadonlySet<string>,
): Promise<{ id: string; mentions: number } | null> {
  /* 생존 인물이 1,500명을 넘어 한 번에 받으면 1,000명에서 잘린다 — 나눠 받는다 */
  const rows = await selectAllPages<{ id: string; nickname: string }>((from, to) => db
    .from('celebs')
    .select('id, nickname')
    .eq('publication_status', 'active')
    .in('celeb_reality', [...LISTING_DEFAULT_REALITIES])
    .is('death_date', null)
    .not('nickname', 'is', null)
    .order('id', { ascending: true })
    .range(from, to))
  if (rows.length === 0) return null

  // 최근에 세운 인물은 후보에서 뺀다
  const since = new Date(Date.parse(`${today}T00:00:00Z`) - RECENT_EXCLUSION_DAYS * 86400000)
    .toISOString()
    .slice(0, 10)
  const { data: recent } = await db
    .from('daily_figures')
    .select('celeb_id')
    .gte('date', since)
  const recentIds = new Set((recent ?? []).map((r) => (r as { celeb_id: string }).celeb_id))

  const fresh = rows.filter((r) => !recentIds.has(r.id) && !excluded.has(r.id))
  if (fresh.length === 0) return null

  // 기록이 많은 순으로 후보를 자른다(동수는 id 순으로 고정)
  const counts = await countPublicContents(db, fresh.map((r) => r.id))
  const candidates = [...fresh]
    .sort((a, b) => {
      const diff = (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0)
      return diff !== 0 ? diff : a.id.localeCompare(b.id)
    })
    .slice(0, NEWS_CANDIDATE_LIMIT)

  let best: { id: string; mentions: number } | null = null
  for (const candidate of candidates) {
    let mentions = 0
    try {
      mentions = await countRecentTitleMentions(candidate.nickname, NEWS_WINDOW_HOURS)
    } catch (error) {
      // 한 명의 조회 실패로 편성을 멈추지 않는다
      console.error('[today-figure] 뉴스 조회 실패:', candidate.nickname, error)
      continue
    }
    if (mentions >= NEWS_MIN_MENTIONS && (!best || mentions > best.mentions)) {
      best = { id: candidate.id, mentions }
    }
  }
  return best
}

/** 오늘 생일인 인물 중 기록이 많은 한 명. 없으면 null */
async function pickBirthdayCeleb(
  db: DatabaseClient,
  today: string,
  excluded: ReadonlySet<string>,
): Promise<string | null> {
  const monthDay = today.slice(5) // "MM-DD"

  const { data } = await db
    .from('celebs')
    .select('id')
    .eq('publication_status', 'active')
    // 신화·관계 인물은 목록에서 제외
    .in('celeb_reality', [...LISTING_DEFAULT_REALITIES])
    .like('birth_date', `%-${monthDay}`)

  const ids = ((data ?? []) as { id: string }[]).map((c) => c.id).filter((id) => !excluded.has(id))
  if (ids.length === 0) return null

  const counts = await countPublicContents(db, ids)
  const sorted = [...ids].sort((a, b) => {
    const diff = (counts.get(b) ?? 0) - (counts.get(a) ?? 0)
    return diff !== 0 ? diff : a.localeCompare(b)
  })
  return sorted.find((id) => (counts.get(id) ?? 0) >= 5) ?? sorted[0]
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_DB_API_URL!,
    process.env.DB_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // KST 기준 날짜다. UTC로 잡으면 이 크론이 도는 시각(UTC 15:05 = KST 익일 00:05)에
  // 전날 날짜로 저장되고, 화면은 KST 날짜로 찾다가 못 만나 온종일 seed로 흘렀다.
  const today = getKSTDateKey()

  let selectedId: string
  let source: 'news' | 'birthday' | 'seed'
  let newsCount = 0

  const excluded = await fetchFeatureExcludedCelebIds(db)

  // 1. 뉴스 — 오늘 실제로 화제인 사람
  const news = await pickNewsCeleb(db, today, excluded)
  if (news) {
    selectedId = news.id
    source = 'news'
    newsCount = news.mentions
  } else {
    // 2. 생일
    const birthday = await pickBirthdayCeleb(db, today, excluded)
    if (birthday) {
      selectedId = birthday
      source = 'birthday'
    } else {
      // 3. 시드
      // 신화·관계 인물은 목록에서 제외한다. 활성 인물이 3천 명을 넘어 나눠 받고,
      // 시드가 날마다 같은 사람을 짚도록 id로 줄을 고정한다(전에는 DB가 내주는 순서대로 앞 1,000명만 받았다)
      const pool = (await selectAllPages<{ id: string }>((from, to) => db
        .from('celebs')
        .select('id')
        .eq('publication_status', 'active')
        .in('celeb_reality', [...LISTING_DEFAULT_REALITIES])
        .order('id', { ascending: true })
        .range(from, to))).filter((c) => !excluded.has(c.id))
      if (pool.length === 0) {
        return NextResponse.json({ message: 'No celebs found' })
      }
      selectedId = pool[calcSeed(today) % pool.length].id
      source = 'seed'
    }
  }

  const { error: upsertError } = await db.from('daily_figures').upsert(
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

  return NextResponse.json({ date: today, celeb_id: selectedId, source, news_count: newsCount })
}
