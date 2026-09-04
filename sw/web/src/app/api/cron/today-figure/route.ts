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
*/

import { NextResponse } from 'next/server'
import { createClient, type SupabaseClient as DatabaseClient } from '@supabase/supabase-js'
import { LISTING_DEFAULT_REALITIES } from '@feelandnote/shared/constants/celeb-tiers'
import { countRecentTitleMentions } from '@feelandnote/content-search/naver-news'
import { getKSTDateKey } from '@/lib/game/date-seed'

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

  const { data } = await db
    .from('celeb_contents')
    .select('celeb_id')
    .in('celeb_id', ids)
    .eq('status', 'FINISHED')
    .eq('visibility', 'public')

  for (const row of (data ?? []) as { celeb_id: string }[]) {
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
): Promise<{ id: string; mentions: number } | null> {
  const { data: alive } = await db
    .from('celebs')
    .select('id, nickname')
    .eq('publication_status', 'active')
    .in('celeb_reality', [...LISTING_DEFAULT_REALITIES])
    .is('death_date', null)
    .not('nickname', 'is', null)

  const rows = (alive ?? []) as { id: string; nickname: string }[]
  if (rows.length === 0) return null

  // 최근에 세운 인물은 후보에서 뺀다
  const since = new Date(Date.parse(`${today}T00:00:00Z`) - RECENT_EXCLUSION_DAYS * 86400000)
    .toISOString()
    .slice(0, 10)
  const { data: recent } = await db
    .from('daily_figures')
    .select('celeb_id')
    .gte('date', since)
  const excluded = new Set((recent ?? []).map((r) => (r as { celeb_id: string }).celeb_id))

  const fresh = rows.filter((r) => !excluded.has(r.id))
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
async function pickBirthdayCeleb(db: DatabaseClient, today: string): Promise<string | null> {
  const monthDay = today.slice(5) // "MM-DD"

  const { data } = await db
    .from('celebs')
    .select('id')
    .eq('publication_status', 'active')
    // 신화·관계 인물은 목록에서 제외
    .in('celeb_reality', [...LISTING_DEFAULT_REALITIES])
    .like('birth_date', `%-${monthDay}`)

  const ids = ((data ?? []) as { id: string }[]).map((c) => c.id)
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

  // 1. 뉴스 — 오늘 실제로 화제인 사람
  const news = await pickNewsCeleb(db, today)
  if (news) {
    selectedId = news.id
    source = 'news'
    newsCount = news.mentions
  } else {
    // 2. 생일
    const birthday = await pickBirthdayCeleb(db, today)
    if (birthday) {
      selectedId = birthday
      source = 'birthday'
    } else {
      // 3. 시드
      const { data: celebProfiles } = await db
        .from('celebs')
        .select('id')
        .eq('publication_status', 'active')
        // 신화·관계 인물은 목록에서 제외
        .in('celeb_reality', [...LISTING_DEFAULT_REALITIES])

      const pool = (celebProfiles ?? []) as { id: string }[]
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
