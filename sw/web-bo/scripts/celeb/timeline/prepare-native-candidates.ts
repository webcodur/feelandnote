/**
 * Kiro 내장 에이전트용 실존 인물 타임라인 seed를 라이브 DB에서 읽어 로컬에 저장한다.
 * DB를 수정하거나 외부 모델·모델 CLI를 호출하지 않는다.
 *
 * pnpm exec tsx scripts/celeb/timeline/prepare-native-candidates.ts --slugs a,b
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function argOf(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`)
  if (index >= 0) return process.argv[index + 1]
  const inline = process.argv.find((arg) => arg.startsWith(`--${name}=`))
  return inline?.slice(name.length + 3)
}

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

if (!process.env.NEXT_PUBLIC_DB_API_URL || !process.env.DB_SECRET_KEY) {
  throw new Error('DB 환경변수가 없다')
}

const db = createClient(
  process.env.NEXT_PUBLIC_DB_API_URL,
  process.env.DB_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

function fingerprint(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

async function main() {
  const root = resolve(argOf('root') ?? '.tmp-celeb-timeline-agent')
  const slugs = (argOf('slugs') ?? '').split(',').map((slug) => slug.trim()).filter(Boolean)
  if (slugs.length === 0) throw new Error('--slugs가 필요하다')

  for (const slug of slugs) {
    const { data: celeb, error: celebError } = await db
      .from('celebs')
      .select('id,slug,nickname,nickname_en,birth_date,death_date,headline,bio,profession,nationality')
      .eq('slug', slug)
      .maybeSingle()
    if (celebError) throw new Error(`${slug}: 인물 조회 실패: ${celebError.message}`)
    if (!celeb) throw new Error(`${slug}: 인물이 없다`)

    const { data: events, error: eventsError } = await db
      .from('celeb_timeline_events')
      .select('*')
      .eq('celeb_id', celeb.id)
      .order('sort_order')
      .order('id')
    if (eventsError) throw new Error(`${slug}: 연표 조회 실패: ${eventsError.message}`)

    const beforeEvents = events ?? []
    const directory = resolve(root, slug)
    mkdirSync(directory, { recursive: true })
    writeFileSync(resolve(directory, 'seed.json'), `${JSON.stringify({
      slug,
      celeb_id: celeb.id,
      celeb,
      before_events: beforeEvents,
      event_origins: beforeEvents.map((event) => event.id),
      before_fingerprint: fingerprint(beforeEvents),
    }, null, 2)}\n`, 'utf8')
    console.log(`SEED ${slug} — ${beforeEvents.length}행 ${fingerprint(beforeEvents)}`)
  }
}

main().catch((error) => { console.error(error); process.exit(1) })
