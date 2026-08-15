/**
 * 릴레이 단건 결과 회수기.
 * 에이전트가 만들어 둔 <결과폴더>/<slug>.json 중 아직 DB에 반영되지 않은 것을 찾아,
 * updated_at을 현재 DB 값으로 맞춘 뒤 반영 관문에 다시 태운다.
 *
 * 낡은 스냅샷 때문에 "충돌"로 튕긴 원고를 버리지 않고 살리는 용도다.
 * 이미 검수 완료(ai_reviewed)인 행은 건드리지 않는다.
 *
 * 실행:
 *   pnpm exec tsx scripts/recover-celeb-reading-singles.ts --dir=<결과폴더> [--dry]
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const file = resolve(process.cwd(), '.env')
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
    }
  }
}
loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

async function main() {
  const args = process.argv.slice(2)
  const dir = args.find((a) => a.startsWith('--dir='))?.slice(6)
  const dry = args.includes('--dry')
  if (!dir) throw new Error('--dir=<결과폴더> 가 필요하다.')

  const files = readdirSync(dir).filter((f) => f.endsWith('.json'))
  let recovered = 0
  let skipped = 0
  let failed = 0

  for (const f of files) {
    const path = resolve(dir, f)
    const items = JSON.parse(readFileSync(path, 'utf8'))
    if (!Array.isArray(items) || items.length !== 1) {
      console.log(`건너뜀 ${f}: 단건 배열이 아니다`)
      skipped++
      continue
    }
    const item = items[0]

    const { data: celeb } = await supabase.from('celebs').select('id').eq('slug', item.slug).single()
    if (!celeb) {
      console.log(`건너뜀 ${item.slug}: 프로필 없음`)
      skipped++
      continue
    }
    const { data: current } = await supabase
      .from('celeb_explanations')
      .select('review_status,updated_at')
      .eq('profile_id', celeb.id)
      .maybeSingle()
    if (!current) {
      console.log(`건너뜀 ${item.slug}: 읽어보기 행 없음`)
      skipped++
      continue
    }
    if (current.review_status) {
      // 이미 처리된 행이다. 덮어쓰지 않는다.
      skipped++
      continue
    }

    // 갱신 시각을 현재 DB 값으로 맞춰 다시 태운다.
    item.updated_at = current.updated_at
    writeFileSync(path, JSON.stringify([item], null, 1), 'utf8')

    if (dry) {
      console.log(`[dry] 회수 대상 ${item.slug}`)
      recovered++
      continue
    }

    try {
      const out = execFileSync(
        'pnpm',
        ['exec', 'tsx', 'scripts/apply-celeb-reading-relay.ts', `--file=${path}`],
        { encoding: 'utf8', shell: true },
      )
      if (/"updated":1|"passMarked":1/.test(out)) {
        recovered++
      } else {
        console.log(`실패 ${item.slug}: ${out.trim().split('\n').pop()}`)
        failed++
      }
    } catch (error) {
      console.log(`실패 ${item.slug}: ${(error as Error).message.split('\n')[0]}`)
      failed++
    }
  }

  console.log(JSON.stringify({ files: files.length, recovered, skipped, failed }))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
