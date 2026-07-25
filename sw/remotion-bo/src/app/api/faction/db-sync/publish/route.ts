import { NextResponse } from 'next/server'
import { publishEpisode } from '@/lib/faction-sync/publish'
import { missingSupabaseEnv } from '@/lib/faction-sync/supabase'
import type { FactionPublishRequest, FactionPublishScope } from '@/lib/faction-sync/types'

/**
 * 출간 — POST { episode, groupIndex?, scope?, dryRun?, force? }
 *
 * 로컬 팩션 데이터를 본서비스 DB·R2에 반영한다. 항목별 결과 목록을 돌려준다
 * (응답 형태는 lib/faction-sync/types.ts 의 FactionPublishResult).
 * 항목 하나의 실패는 그 항목 blocked 로 담기고, DB 연결 같은 전역 실패만 500 이다.
 */

const SCOPE_KEYS: (keyof FactionPublishScope)[] = ['tag', 'assignments', 'descs', 'personImages', 'teamImages']

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: '요청 본문이 없습니다' }, { status: 400 })

  const raw = body as Record<string, unknown>
  const episode = typeof raw.episode === 'string' ? raw.episode.trim() : ''
  if (!episode) return NextResponse.json({ error: 'episode 필요' }, { status: 400 })

  const groupIndex = typeof raw.groupIndex === 'number' && Number.isInteger(raw.groupIndex) && raw.groupIndex >= 0
    ? raw.groupIndex
    : undefined

  const scopeRaw = raw.scope && typeof raw.scope === 'object' ? raw.scope as Record<string, unknown> : undefined
  const scope: FactionPublishScope | undefined = scopeRaw
    ? Object.fromEntries(SCOPE_KEYS.filter(k => scopeRaw[k] === true).map(k => [k, true]))
    : undefined

  const request: FactionPublishRequest = {
    episode,
    groupIndex,
    scope,
    dryRun: raw.dryRun === true,
    force: raw.force === true,
  }

  const missing = missingSupabaseEnv()
  if (missing.length) {
    return NextResponse.json({ error: `Supabase 환경변수 누락: ${missing.join(', ')}` }, { status: 500 })
  }

  try {
    return NextResponse.json(await publishEpisode(request))
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const notFound = /ENOENT|no such file|찾을 수 없습니다/i.test(msg)
    return NextResponse.json(
      { error: notFound ? `대상을 찾을 수 없습니다: ${msg}` : msg },
      { status: notFound ? 404 : 500 },
    )
  }
}
