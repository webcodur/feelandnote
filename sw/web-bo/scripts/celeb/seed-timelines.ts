/**
 * new-figures 타임라인 일괄 삽입 — timelines/*.json(닉네임 키) → celeb_timeline_events.
 *
 *   pnpm --dir sw/web-bo exec tsx scripts/celeb/seed-timelines.ts          # dry-run
 *   pnpm --dir sw/web-bo exec tsx scripts/celeb/seed-timelines.ts --apply  # 반영
 *
 * 규칙은 timeline/insert-events.ts와 같다:
 * - 이미 사건이 있는 인물은 건너뛴다.
 * - REAL은 year 그대로. birth kind 없는 인물(생년 미상 — D.B. 쿠퍼 등)은 경고만 남기고 삽입한다.
 * - 사망자인데 death 이벤트가 없으면 실패(검증된 바 0건).
 * - sort_order는 (i+1)*10, source는 'research'.
 */
import { config } from 'dotenv'
import { resolve } from 'node:path'
import { readFileSync, readdirSync } from 'node:fs'
import { createClient, type SupabaseClient as DatabaseClient } from '@supabase/supabase-js'

config({ path: resolve(process.cwd(), '.env'), quiet: true })

const APPLY = process.argv.includes('--apply')
const TL_DIR = resolve(__dirname, '../../../../data/celeb/new-figures/timelines')
const LEDGER_DIR = resolve(__dirname, '../../../../data/celeb/new-figures')

interface TimelineEvent {
  year?: number | null; year_end?: number | null
  title: string; title_en?: string | null
  description?: string | null; description_en?: string | null
  kind: string; place_name?: string | null; place_name_en?: string | null
  lat?: number | null; lng?: number | null
}

async function main() {
  const url = process.env.NEXT_PUBLIC_DB_API_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.DB_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('DB 접속 env 필요')
  const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })

  const ledger = new Map<string, { celeb_id: string; slug: string }>()
  for (const f of readdirSync(LEDGER_DIR)) {
    if (!f.endsWith('.json')) continue
    const rows = JSON.parse(readFileSync(resolve(LEDGER_DIR, f), 'utf8'))
    if (!Array.isArray(rows)) continue
    for (const r of rows) if (r.nickname && r.celeb_id) ledger.set(r.nickname, { celeb_id: r.celeb_id, slug: r.slug })
  }

  const timelines = new Map<string, TimelineEvent[]>()
  for (const f of readdirSync(TL_DIR)) {
    if (!f.endsWith('.json') || f.startsWith('_')) continue
    const d = JSON.parse(readFileSync(resolve(TL_DIR, f), 'utf8'))
    for (const [nick, r] of Object.entries(d as Record<string, { events: TimelineEvent[] }>)) {
      timelines.set(nick, r.events)
    }
  }

  const plans: Array<{ nick: string; celeb_id: string; slug: string; events: TimelineEvent[] }> = []
  const problems: string[] = []
  for (const [nick, events] of timelines) {
    const rec = ledger.get(nick)
    if (!rec) { problems.push(`원장에 없음: ${nick}`); continue }
    plans.push({ nick, celeb_id: rec.celeb_id, slug: rec.slug, events })
  }

  // celeb 메타(reality·death_date) + 기존 이벤트 유무
  const ids = plans.map(p => p.celeb_id)
  const meta = new Map<string, { death_date: string | null }>()
  const hasEvents = new Set<string>()
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    const { data: cs, error } = await db.from('celebs').select('id,death_date').in('id', chunk)
    if (error) throw error
    for (const c of cs ?? []) meta.set(c.id, { death_date: c.death_date })
    const { data: ev, error: e2 } = await db.from('celeb_timeline_events').select('celeb_id').in('celeb_id', chunk)
    if (e2) throw e2
    for (const e of ev ?? []) hasEvents.add(e.celeb_id)
  }

  let skippedExisting = 0, noBirth = 0, totalEvents = 0
  const rows: object[] = []
  for (const p of plans) {
    if (hasEvents.has(p.celeb_id)) { skippedExisting++; continue }
    const kinds = p.events.map(e => e.kind)
    if (!kinds.includes('birth')) noBirth++
    const m = meta.get(p.celeb_id)
    if (m?.death_date && !kinds.includes('death')) { problems.push(`${p.nick}: 사망자인데 death 없음`); continue }
    p.events.forEach((e, i) => {
      rows.push({
        celeb_id: p.celeb_id,
        year: e.year ?? null, year_end: e.year_end ?? null,
        title: e.title, title_en: e.title_en ?? null,
        description: e.description ?? null, description_en: e.description_en ?? null,
        kind: e.kind,
        place_name: e.place_name ?? null, place_name_en: e.place_name_en ?? null,
        lat: e.lat ?? null, lng: e.lng ?? null,
        source: 'research', sort_order: (i + 1) * 10,
      })
    })
    totalEvents += p.events.length
  }

  console.log(`=== ${APPLY ? 'APPLY' : 'DRY-RUN'} ===`)
  console.log(`대상 ${plans.length}명 / 삽입 예정 이벤트 ${rows.length}건`)
  console.log(`기존 이벤트 있어 스킵: ${skippedExisting}명 / birth 없음(생년 미상): ${noBirth}명`)
  if (problems.length) { console.log('⛔ 문제:'); problems.slice(0, 20).forEach(p => console.log('  -', p)); process.exit(1) }
  if (!APPLY) { console.log('(dry-run — --apply로 반영)'); return }

  const CHUNK = 200
  let inserted = 0
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await db.from('celeb_timeline_events').insert(rows.slice(i, i + CHUNK))
    if (error) { console.log(`⛔ 삽입 실패(${i}~): ${error.message}`); process.exit(1) }
    inserted += Math.min(CHUNK, rows.length - i)
  }
  console.log(`삽입: ${inserted}건`)

  // readback — 인물당 건수가 원본과 일치하는지
  let bad = 0
  for (let i = 0; i < plans.length; i += 50) {
    const batch = plans.slice(i, i + 50).filter(p => !hasEvents.has(p.celeb_id))
    for (const p of batch) {
      const { count } = await db.from('celeb_timeline_events')
        .select('*', { count: 'exact', head: true }).eq('celeb_id', p.celeb_id)
      if ((count ?? 0) !== p.events.length) { bad++; console.log(`⚠ ${p.nick}: DB ${count} ≠ 원본 ${p.events.length}`) }
    }
  }
  console.log(`readback — 불일치 ${bad}명`)
  if (bad) process.exit(1)
  console.log('완료')
}

main().catch(e => { console.error(e); process.exit(1) })
