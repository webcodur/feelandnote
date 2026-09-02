/*
  세력도감 사진류를 데이터단에서 출간한다 — 출간 패널과 같은 라이브러리(publishEpisode)를
  지정 범위로 호출한다. 멱등이라 여러 번 돌려도 안전하다.

  실행:  npx tsx scripts/publish-faction-logos.ts [--dry] [--folder=Streaming-Empire] [--scope=logos,personImages,teamImages]
  범위 기본값은 logos.
*/
import { existsSync, readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import { boPath } from '../lib/paths'

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = boPath(f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
    }
  }
}
loadEnv()

async function main() {
  const dry = process.argv.includes('--dry')
  const only = process.argv.find(a => a.startsWith('--folder='))?.split('=')[1]
  const scopeArg = process.argv.find(a => a.startsWith('--scope='))?.split('=')[1] ?? 'logos'
  const scope: Record<string, boolean> = {}
  for (const k of scopeArg.split(',').map(s => s.trim()).filter(Boolean)) scope[k] = true

  const url = process.env.NEXT_PUBLIC_DB_API_URL
  const key = process.env.DB_SECRET_KEY
  if (!url || !key) throw new Error('DB 관리자 접속 환경변수 누락')
  const db = createClient(url, key)

  // 태그 연결 세력이 있는 편 전부 (로고 전용 범위면 로고 지정 편만)
  const { data, error } = await db
    .from('faction_groups')
    .select('tag_id, data, episode:faction_episodes(folder)')
    .not('tag_id', 'is', null)
  if (error) throw new Error(error.message)

  const logosOnly = Object.keys(scope).length === 1 && scope.logos
  const folders = [...new Set(
    (data ?? [])
      .filter(r => {
        if (!logosOnly) return true
        const d = r.data as Record<string, unknown> | null
        return typeof d?.logoImg === 'string' && (d.logoImg as string).trim() !== ''
      })
      .map(r => (r.episode as unknown as { folder: string } | null)?.folder)
      .filter((f): f is string => !!f),
  )].filter(f => !only || f === only)

  console.log(`대상 편 ${folders.length}개${dry ? ' (미리보기)' : ''}`)

  const { publishEpisode } = await import('../../src/lib/faction-sync/publish')

  let uploaded = 0, unchanged = 0, blocked = 0
  for (const folder of folders) {
    try {
      const result = await publishEpisode(db, { folder, scope, dryRun: dry })
      const media = result.items.filter(i => i.kind === 'logo' || i.kind === 'soloShot' || i.kind === 'teamShots')
      const up = media.filter(i => i.action === 'created' || i.action === 'updated').length
      const un = media.filter(i => i.action === 'skipped').length
      const bl = media.filter(i => i.action === 'blocked')
      uploaded += up; unchanged += un; blocked += bl.length
      console.log(`- ${folder}: 올림 ${up} · 그대로 ${un} · 막힘 ${bl.length}${bl.length ? ' — ' + [...new Set(bl.map(b => b.reason ?? ''))].slice(0, 4).join(', ') : ''}`)
    } catch (e) {
      blocked += 1
      console.log(`- ${folder}: 실패 — ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  console.log(`합계: 올림 ${uploaded} · 그대로 ${unchanged} · 막힘 ${blocked}`)
}

main().catch(e => { console.error(e); process.exit(1) })
