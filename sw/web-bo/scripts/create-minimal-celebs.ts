/**
 * 이름만 있는 최소 셀럽 등록
 * 별도 로그인 계정 없이 celebs 행을 만들고 celeb_metrics를 초기화한다.
 *
 * 정보가 이름뿐이므로 항상 publication_status='inactive'로 만든다. 노출은 정보를 채운 뒤 따로 켠다.
 *
 * 입력: JSON [{nickname, nickname_en, expected_slug}]
 * 사용법 (sw/web-bo 디렉토리에서): npx tsx scripts/create-minimal-celebs.ts <배치경로>
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv(p: string) {
  const t = readFileSync(p, 'utf-8')
  for (const raw of t.split('\n')) {
    const line = raw.replace(/\r$/, '')
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) {
      const v = m[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[m[1]]) process.env[m[1]] = v
    }
  }
}

interface Person {
  nickname: string
  nickname_en: string
  expected_slug: string
}

async function createOne(sb: SupabaseClient, person: Person) {
  // 인물은 로그인 계정을 갖지 않는다. 도메인 식별자만 직접 발급한다.
  const celebId = crypto.randomUUID()
  try {
    const { data: created, error: insErr } = await sb.from('celebs').insert({
      id: celebId,
      nickname: person.nickname,
      nickname_en: person.nickname_en,
      celeb_tier: 'light',
      publication_status: 'inactive',
      is_verified: false,
    }).select('slug').single()
    if (insErr) throw insErr
    if (created.slug !== person.expected_slug) {
      throw new Error(`${person.nickname}: 생성된 slug ${created.slug} != 예상 ${person.expected_slug}`)
    }

    const { error: metricsError } = await sb
      .from('celeb_metrics')
      .upsert({ celeb_id: celebId, follower_count: 0, content_count: 0 })
    if (metricsError) throw metricsError

    return { id: celebId, slug: created.slug }
  } catch (error) {
    const cleanup = await sb.from('celebs').delete().eq('id', celebId)
    if (cleanup.error) {
      throw new AggregateError([error, cleanup.error], `${person.nickname_en}: 생성 실패 뒤 celebs 정리도 실패`)
    }
    throw error
  }
}

async function main() {
  const batchPath = process.argv[2]
  if (!batchPath) throw new Error('배치 JSON 경로를 인자로 넘겨라')

  loadEnv(resolve(__dirname, '..', '.env'))
  const { NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env as Record<string, string>
  if (!NEXT_PUBLIC_SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('.env 누락')

  const sb = createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const people: Person[] = JSON.parse(readFileSync(batchPath, 'utf-8'))

  for (const p of people) {
    // 같은 이름이 이미 있으면 만들지 않는다
    const { data: dup, error: duplicateError } = await sb.from('celebs')
      .select('id, slug').eq('nickname_en', p.nickname_en).maybeSingle()
    if (duplicateError) throw duplicateError
    if (dup) { console.log(`  건너뜀(이미 있음) ${p.nickname} -> ${dup.slug}`); continue }

    try {
      const r = await createOne(sb, p)
      console.log(`  ${p.nickname} (${r.slug}) id=${r.id}`)
    } catch (e) {
      console.error(`  실패 ${p.nickname}:`, (e as Error).message)
    }
  }
  console.log('=== 최소 등록 완료 ===')
}

main().catch((e) => { console.error(e); process.exit(1) })
