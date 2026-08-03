/*
  도감용으로 따로 세운 세력을 **같은 이름의 기존 회사 세력 안으로 합친다.**

  이관(migrate-atlas-manual-to-production)이 만든 「영상 제외」 세력이 기존 회사와 이름만
  같고 따로 서 있으면 편집기가 두 줄로 보인다. 사람을 기존 회사 세력의 첫 묶음에 넣고
  빈 세력은 지운다. 회사가 이 편에 없는 사람(혼다·어질리티 등)은 제자리에 남긴다.

  실행:  npx tsx scripts/merge-atlas-groups-into-companies.ts --folder=humanoids [--dry]
*/
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'
import { assembleFactionEpisode } from '@feelandnote/shared/lib/faction-assemble'
import { replaceFactionEpisode } from '../src/lib/faction-save'

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    const p = path.join(__dirname, '..', f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim()
    }
  }
}
loadEnv()

type Row = Record<string, unknown>

const firstLine = (v: unknown) => (typeof v === 'string' ? v.split('\n')[0].trim() : '')

async function main() {
  const dry = process.argv.includes('--dry')
  const folder = process.argv.find(a => a.startsWith('--folder='))?.split('=')[1] ?? 'humanoids'

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase 환경변수 누락')
  const db = createClient(url, key)

  const src = async (table: string, column: string, values: string[]) => {
    const { data, error } = await db.from(table).select('*').in(column, values)
    if (error) throw new Error(`${table}: ${error.message}`)
    return (data ?? []) as Row[]
  }

  const { script, row } = await assembleFactionEpisode(src, folder)
  const groups = [...((script.groups ?? []) as Row[])]

  // 영상에 나가는 세력(활성)을 이름으로 찾아 둔다 — 사람을 합칠 곳
  const hostByName = new Map<string, Row>()
  for (const g of groups) {
    if (g.disabled === true) continue
    hostByName.set(firstLine(g.name), g)
  }

  const moved: string[] = []
  const kept: string[] = []
  const nextGroups: Row[] = []

  for (const g of groups) {
    if (g.disabled !== true) { nextGroups.push(g); continue }

    const name = firstLine(g.name)
    const host = hostByName.get(name)
    const people = ((g.clusters ?? []) as Row[]).flatMap(c => (c.people ?? []) as Row[])

    if (!host || !people.length) {
      // 이 편에 같은 이름의 회사가 없다 — 제자리에 남긴다
      if (people.length) kept.push(`${name}(${people.map(p => p.name).join(', ')})`)
      nextGroups.push(g)
      continue
    }

    const hostClusters = (host.clusters ?? []) as Row[]
    if (!hostClusters.length) hostClusters.push({ people: [] })
    const target = hostClusters[0]
    target.people = [...((target.people ?? []) as Row[]), ...people]
    host.clusters = hostClusters
    moved.push(`${name} ← ${people.map(p => p.name).join(', ')}`)
    // 빈 세력은 버린다(nextGroups 에 넣지 않는다)
  }

  console.log(`${folder} — 회사 세력으로 합침 ${moved.length}건`)
  for (const m of moved) console.log(`  · ${m}`)
  if (kept.length) {
    console.log('이 편에 회사가 없어 제자리에 남긴 인물:')
    for (const k of kept) console.log(`  · ${k}`)
  }
  console.log(`세력 ${groups.length} → ${nextGroups.length}`)
  if (dry) { console.log('(dry-run — 저장하지 않았다)'); return }

  const result = await replaceFactionEpisode(
    db, folder, { ...script, groups: nextGroups }, row.updated_at as string,
  )
  console.log(`저장 완료 — 세력 ${result.counts.groups} · 인물 ${result.counts.people}`)
}

main().catch(e => { console.error(e); process.exit(1) })
