import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  LANE_COUNT,
  argOf,
  connectDb,
  fetchCelebs,
  hasFlag,
  laneOf,
  ledgerIds,
  packPath,
  parseLane,
  readLedger,
  toPack,
  type CelebRow,
} from './lib'

function laneRows(rows: CelebRow[], lane: number): CelebRow[] {
  return rows.filter((r) => laneOf(r.id) === lane)
}

function sortClaim(a: CelebRow, b: CelebRow): number {
  const act = (r: CelebRow) => (r.publication_status === 'active' ? 0 : 1)
  if (act(a) !== act(b)) return act(a) - act(b)
  return (a.slug ?? a.id).localeCompare(b.slug ?? b.id)
}

export async function claim(): Promise<void> {
  const lane = parseLane(argOf('lane'))
  const n = Math.max(1, Number(argOf('n') ?? '10'))
  const dry = hasFlag('dry')
  const db = connectDb()
  const rows = laneRows(await fetchCelebs(db), lane)
  const done = ledgerIds(lane)
  const pool = rows.filter((r) => !done.has(r.id)).sort(sortClaim)
  const picked = pool.slice(0, n)
  const pack = {
    lane,
    claimedAt: new Date().toISOString(),
    remainingAfter: pool.length - picked.length,
    people: picked.map(toPack),
  }
  if (!dry) {
    const file = packPath(lane)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify(pack, null, 1), 'utf8')
    console.log(`claim lane=${lane} n=${picked.length} → ${file}`)
  } else {
    console.log(`claim --dry lane=${lane} n=${picked.length} (팩 안 씀)`)
  }
  console.log(`레인 잔여 ${pool.length} · 원장 ${done.size}`)
  for (const p of pack.people) console.log(`${p.slug ?? p.id} (${p.status})`)
}

export async function status(): Promise<void> {
  const db = connectDb()
  const rows = await fetchCelebs(db)
  const buckets = Array.from({ length: LANE_COUNT }, () => [] as CelebRow[])
  for (const r of rows) buckets[laneOf(r.id)].push(r)
  console.log('lane\tremain\tledger\tactiveRemain')
  let remainAll = 0
  let ledgerAll = 0
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const done = ledgerIds(lane)
    const remain = buckets[lane].filter((r) => !done.has(r.id))
    const activeRemain = remain.filter((r) => r.publication_status === 'active').length
    remainAll += remain.length
    ledgerAll += done.size
    const phases = readLedger(lane).reduce<Record<string, number>>((acc, e) => {
      acc[e.phase] = (acc[e.phase] ?? 0) + 1
      return acc
    }, {})
    const extra = Object.keys(phases).length
      ? ` ${Object.entries(phases).map(([k, v]) => `${k}:${v}`).join(',')}`
      : ''
    console.log(`${lane}\t${remain.length}\t${done.size}\t${activeRemain}${extra}`)
  }
  console.log(`합\t${remainAll}\t${ledgerAll}\t-`)
}
