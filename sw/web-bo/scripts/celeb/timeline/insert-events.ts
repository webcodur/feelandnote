/**
 * 에이전트가 만든 연표 JSON을 DB에 넣는다. 이미 사건이 있으면 건너뛴다(caps 제외).
 * 사용: pnpm exec tsx scripts/celeb/timeline/insert-events.ts <json경로>
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function loadEnv() {
  const file = resolve(process.cwd(), '.env')
  if (!existsSync(file)) return
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadEnv()

const db = createClient(
  process.env.NEXT_PUBLIC_DB_API_URL!,
  process.env.DB_SECRET_KEY!,
  { auth: { persistSession: false } },
)

type Event = Record<string, unknown>

async function main() {
  const path = process.argv[2]
  if (!path) throw new Error('JSON 경로가 필요하다')
  const payload = JSON.parse(readFileSync(path, 'utf8')) as {
    slug: string
    mode?: 'empty' | 'caps'
    events: Event[]
  }
  const { data: celeb, error } = await db
    .from('celebs')
    .select('id,slug,celeb_tier,celeb_reality,death_date')
    .eq('slug', payload.slug)
    .maybeSingle()
  if (error || !celeb) throw new Error(`인물 없음: ${payload.slug}`)

  const { data: existing } = await db
    .from('celeb_timeline_events')
    .select('id,kind,sort_order')
    .eq('celeb_id', celeb.id)
    .order('sort_order')
  const mode = payload.mode ?? 'empty'
  if (mode !== 'caps' && (existing?.length ?? 0) > 0) {
    console.log(`SKIPPED ${payload.slug} — 이미 ${existing?.length}건`)
    return
  }

  const kinds = payload.events.map((e) => e.kind)
  if (!kinds.includes('birth')) throw new Error(`${payload.slug}: birth 없음`)
  if (celeb.celeb_reality === 'REAL' && celeb.death_date && !kinds.includes('death')) {
    throw new Error(`${payload.slug}: 사망자인데 death 없음`)
  }

  const min = existing?.[0]?.sort_order ?? 0
  const max = existing?.[existing.length - 1]?.sort_order ?? 0
  const rows = payload.events.map((e, i) => {
    const sort_order = mode === 'caps' && e.kind === 'birth'
      ? min - 1 - i
      : mode === 'caps'
        ? max + 1 + i
        : (i + 1) * 10
    const fiction = celeb.celeb_reality !== 'REAL'
    return {
      celeb_id: celeb.id,
      year: fiction ? null : e.year ?? null,
      year_end: fiction ? null : e.year_end ?? null,
      sequence_label: fiction ? e.sequence_label : null,
      sequence_label_en: fiction ? e.sequence_label_en : null,
      title: e.title,
      title_en: e.title_en,
      description: e.description,
      description_en: e.description_en,
      kind: e.kind,
      place_name: e.place_name ?? null,
      place_name_en: e.place_name_en ?? null,
      lat: e.lat ?? null,
      lng: e.lng ?? null,
      source: 'research',
      sort_order,
    }
  })

  const { data: inserted, error: insErr } = await db
    .from('celeb_timeline_events')
    .insert(rows)
    .select('id,title,description')
  if (insErr || !inserted) throw new Error(`${payload.slug} 삽입 실패: ${insErr?.message}`)

  const { data: after } = await db
    .from('celeb_timeline_events')
    .select('id,title,description')
    .eq('celeb_id', celeb.id)
  const bad = inserted.filter((r) => {
    const found = after?.find((a) => a.id === r.id)
    return !found || found.title !== r.title || found.description !== r.description
  })
  if (bad.length) throw new Error(`${payload.slug} 왕복 검증 불일치 ${bad.length}건`)
  console.log(`OK ${payload.slug} ${inserted.length}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
