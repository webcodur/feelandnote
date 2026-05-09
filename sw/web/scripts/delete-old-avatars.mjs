#!/usr/bin/env node
/**
 * Supabase Storage 의 옛 avatar 파일 일괄 삭제
 *
 * 배경: 인물 아바타를 Cloudflare R2 로 이전한 뒤에도 Supabase Storage 의
 * `avatars` 버킷(`celebs/{uuid}/avatar.webp`)에 옛 파일 852개가 남아 있다.
 * 구글봇이 옛 URL을 계속 크롤링해 egress 누수 원인이 된다.
 *
 * 안전 점검: 2026-05-09 시점 모든 활성 셀럽(1079명)의 avatar_url 은
 * R2(`https://pub-...r2.dev/...`)를 가리킨다. Supabase Storage URL을 가리키는
 * 셀럽은 0명이므로 852개 전부 안전하게 삭제 가능.
 *
 * 사용 (sw/web 디렉토리에서):
 *   node scripts/delete-old-avatars.mjs              # 실제 삭제
 *   node scripts/delete-old-avatars.mjs --dry-run    # 목록만 출력 (삭제 안 함)
 *
 * 환경: sw/web/.env 의
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * 한도 차단 상태에서도 Storage delete API 는 보통 작동한다(아웃바운드 트래픽 거의 0).
 * 차단되면 Pro 결제 후 재실행.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = join(__dirname, '..')
const REPO_ROOT = join(WEB_ROOT, '..', '..')

function loadEnv(filePath) {
  if (!existsSync(filePath)) return {}
  const text = readFileSync(filePath, 'utf8')
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    out[m[1]] = v
  }
  return out
}

const env = {
  ...loadEnv(join(REPO_ROOT, 'sw/web-bo/.env')),
  ...loadEnv(join(WEB_ROOT, '.env')),
  ...process.env,
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 가 .env 에 없다')
  process.exit(1)
}

const dryRun = process.argv.includes('--dry-run')

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

console.log(`옛 avatar 일괄 ${dryRun ? '점검(dry-run)' : '삭제'} 시작`)
console.log(`Supabase: ${SUPABASE_URL}`)

async function main() {
  const allDirs = []
  let offset = 0
  const PAGE = 1000

  while (true) {
    const { data, error } = await supabase.storage
      .from('avatars')
      .list('celebs', { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } })

    if (error) {
      console.error('list 실패:', error.message)
      process.exit(1)
    }
    if (!data || data.length === 0) break

    for (const item of data) {
      allDirs.push(item.name)
    }
    if (data.length < PAGE) break
    offset += PAGE
  }

  console.log(`celebs/ 하위 항목 ${allDirs.length}개 발견`)

  const paths = allDirs.map(name => `celebs/${name}/avatar.webp`)

  if (dryRun) {
    console.log('(dry-run) 삭제 대상 처음 5개:')
    paths.slice(0, 5).forEach(p => console.log('  -', p))
    console.log(`총 ${paths.length}개. 실제 삭제하려면 --dry-run 빼고 다시 실행.`)
    return
  }

  const BATCH = 100
  let deleted = 0
  let failed = 0

  for (let i = 0; i < paths.length; i += BATCH) {
    const chunk = paths.slice(i, i + BATCH)
    const { data, error } = await supabase.storage.from('avatars').remove(chunk)
    if (error) {
      console.error(`배치 ${Math.floor(i / BATCH) + 1} 실패: ${error.message}`)
      failed += chunk.length
      continue
    }
    deleted += data?.length ?? chunk.length
    console.log(`  ${i + chunk.length} / ${paths.length}`)
  }

  console.log('')
  console.log(`완료: 삭제 ${deleted}개, 실패 ${failed}개`)

  const { data: remaining } = await supabase.storage
    .from('avatars')
    .list('celebs', { limit: 1 })
  if (remaining && remaining.length > 0) {
    console.warn(`경고: celebs/ 에 아직 ${remaining.length}개 이상 남음. 재실행 필요.`)
  } else {
    console.log('검증 통과: celebs/ 비어 있음')
  }
}

main().catch(err => {
  console.error('스크립트 오류:', err)
  process.exit(1)
})
