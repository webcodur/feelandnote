/**
 * 가상 독백 확정 잠금 CLI
 *
 * celebs.virtual_monologue_locked_at 을 채우거나 비운다.
 * 잠긴 인물의 독백은 DB 트리거(guard_virtual_monologue_lock)가 모든 경로의 UPDATE 를 차단한다
 * — 관리자 폼·게시 RPC·번역/생성 스크립트 전부. 해제와 수정은 별도 문장으로만 가능하다.
 * (마이그레이션: sw/web/database/migrations/20260802220500_add_virtual_monologue_lock.sql)
 *
 * [명령]  sw/web-bo 에서
 *   node --env-file=.env --import tsx scripts/celeb/monologue-lock.ts --slugs a,b            # 잠금
 *   node --env-file=.env --import tsx scripts/celeb/monologue-lock.ts --unlock --slugs a,b   # 해제
 *   node --env-file=.env --import tsx scripts/celeb/monologue-lock.ts --list                 # 잠긴 인물 목록
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

function loadEnv() {
  const p = resolve(process.cwd(), '.env')
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf-8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const db = createClient(
  process.env.NEXT_PUBLIC_DB_API_URL!,
  process.env.DB_SECRET_KEY!,
)

const UNLOCK = process.argv.includes('--unlock')
const LIST = process.argv.includes('--list')
const SLUGS = (() => {
  const i = process.argv.indexOf('--slugs')
  return i >= 0 ? process.argv[i + 1].split(',').map((s) => s.trim()).filter(Boolean) : []
})()

async function main() {
  if (LIST) {
    const { data, error } = await db
      .from('celebs')
      .select('slug, nickname, virtual_monologue_locked_at')
      .not('virtual_monologue_locked_at', 'is', null)
      .order('virtual_monologue_locked_at', { ascending: false })
    if (error) throw error
    console.log(`잠긴 인물 ${data.length}명`)
    for (const r of data) console.log(`  ${r.slug}  ${r.nickname}  (${r.virtual_monologue_locked_at})`)
    return
  }

  if (SLUGS.length === 0) {
    console.error('대상 없음. --slugs a,b 로 지정하거나 --list 로 조회한다.')
    process.exit(1)
  }

  const { data: rows, error } = await db
    .from('celebs')
    .select('slug, nickname, virtual_monologue, virtual_monologue_locked_at')
    .in('slug', SLUGS)
  if (error) throw error

  const found = new Set(rows.map((r) => r.slug))
  for (const s of SLUGS.filter((s) => !found.has(s))) console.error(`  ✗ ${s}: CELEB 프로필 없음`)

  for (const r of rows) {
    if (UNLOCK) {
      if (!r.virtual_monologue_locked_at) {
        console.log(`  - ${r.slug}: 이미 잠금 없음`)
        continue
      }
      const { error: e } = await db
        .from('celebs')
        .update({ virtual_monologue_locked_at: null })
        .eq('slug', r.slug)
      console.log(e ? `  ✗ ${r.slug}: ${e.message}` : `  ✓ ${r.slug} (${r.nickname}) 잠금 해제`)
    } else {
      if (!r.virtual_monologue?.trim()) {
        console.error(`  ✗ ${r.slug}: 독백이 비어 있어 잠그지 않음`)
        continue
      }
      if (r.virtual_monologue_locked_at) {
        console.log(`  - ${r.slug}: 이미 잠김 (${r.virtual_monologue_locked_at})`)
        continue
      }
      const { error: e } = await db
        .from('celebs')
        .update({ virtual_monologue_locked_at: new Date().toISOString() })
        .eq('slug', r.slug)
      console.log(e ? `  ✗ ${r.slug}: ${e.message}` : `  ✓ ${r.slug} (${r.nickname}) 확정 잠금`)
    }
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
