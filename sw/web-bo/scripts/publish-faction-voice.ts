/**
 * 팩션 편을 명령줄에서 출간한다 — 관리 화면 「진단」 패널의 「전체 출간」과 같은 코드를 부른다.
 *
 * 왜 두는가: 한 편이 인물 수십 명이면 화보·음성 업로드가 몇 분씩 걸려 브라우저 쪽이 먼저 지친다.
 * 여러 편을 잇달아 올릴 때 화면을 붙잡고 있을 이유가 없다.
 *
 * 판정·쓰기는 전부 `lib/faction-sync/publish` 소유다. 이 파일은 사람 확인을 대신하지 않고
 * (서버 액션의 `requireFactionAdmin` 자리) 로컬 실행 전제만 확인한 뒤 그대로 넘긴다.
 *
 *   pnpm faction:publish <편 폴더> [<편 폴더> ...] [--dry]
 */

import path from 'path'
import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

config({ path: path.join(process.cwd(), '.env') })

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry')
  const folders = args.filter(a => !a.startsWith('--'))
  if (!folders.length) {
    throw new Error('편 폴더명을 하나 이상 적어라 — 예: pnpm faction:publish PayPal-Mafia --dry')
  }

  // 로컬 파일(화보·음성)을 읽는 출간이라 렌더 저장소가 이 컴퓨터에 있어야 한다
  if (!process.env.FACTION_LOCAL) throw new Error('FACTION_LOCAL 없음 — 렌더 저장소가 연결된 컴퓨터에서만 돈다')
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 없음')

  const { publishEpisode } = await import('../src/lib/faction-sync/publish')
  const db = createClient(url, key, { auth: { persistSession: false } })

  for (const folder of folders) {
    console.log(`\n=== ${folder} ${dryRun ? '(미리보기)' : ''} ===`)
    const result = await publishEpisode(db, { folder, dryRun, scope: {
      tag: true, personImages: true, logos: true, teamImages: true, videos: true, music: true,
    } })

    const { created, updated, skipped, blocked } = result.summary
    console.log(`만듦 ${created} · 갱신 ${updated} · 건너뜀 ${skipped} · 막힘 ${blocked}`)
    for (const item of result.items) {
      if (item.action === 'skipped') continue
      const who = 'person' in item && item.person ? ` / ${item.person}` : ''
      console.log(`  [${item.action}] ${item.kind}${who} — ${item.reason ?? ''}`)
    }
    for (const w of result.warnings ?? []) console.log(`  ! ${w}`)
  }
}

main().catch(e => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
