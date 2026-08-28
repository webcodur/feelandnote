import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import {
  LANE_COUNT,
  HEADLINE_REVIEW_VERSION,
  argOf,
  connectDb,
  fetchCelebs,
  hasFlag,
  laneOf,
  packPath,
  parseLane,
  readLedger,
  reviewPath,
  toPack,
  type CelebRow,
  type LedgerEntry,
  type ReviewPerson,
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
  const recheck = hasFlag('recheck')
  const redo = hasFlag('redo')
  const targetSlug = argOf('slug')
  if (redo && recheck) throw new Error('--redo와 --recheck는 함께 쓸 수 없다')
  if (redo && !targetSlug) throw new Error('--redo에는 --slug가 필요하다')
  const db = connectDb()
  const rows = laneRows(await fetchCelebs(db), lane)
  const ledger = readLedger(lane)
  const byId = new Map(ledger.map((entry) => [entry.id, entry]))
  const pool = rows.filter((row) => {
    const previous = byId.get(row.id)
    if (redo) return previous !== undefined && row.slug === targetSlug
    return recheck
      ? previous !== undefined && previous.reviewVersion !== HEADLINE_REVIEW_VERSION
      : previous === undefined
  }).sort(sortClaim)
  const targetPool = targetSlug ? pool.filter((row) => row.slug === targetSlug) : pool
  if (targetSlug && targetPool.length === 0) {
    const row = rows.find((candidate) => candidate.slug === targetSlug)
    if (!row) throw new Error(`${targetSlug}: lane ${lane} 서비스 대상에 없음`)
    const previous = byId.get(row.id)
    const reason = redo
      ? '원장에 없어 redo 불가'
      : recheck
        ? previous === undefined
          ? '원장에 없어 recheck 불가'
          : `이미 reviewVersion=${previous.reviewVersion ?? '없음'}`
        : '원장에 이미 있어 new claim 불가'
    throw new Error(`${targetSlug}: ${reason}`)
  }
  const picked = targetPool.slice(0, targetSlug ? 1 : n)
  const mode = redo ? 'redo' : recheck ? 'recheck' : 'new'
  const claimedAt = new Date().toISOString()
  const pack = {
    lane,
    mode,
    reviewVersion: HEADLINE_REVIEW_VERSION,
    claimedAt,
    remainingAfter: pool.length - picked.length,
    people: picked.map(toPack),
  }
  const reviewPack = {
    lane,
    mode,
    reviewVersion: HEADLINE_REVIEW_VERSION,
    claimedAt,
    draftFile: `drafts/lane-${String(lane).padStart(2, '0')}.json`,
    people: picked.map((row): ReviewPerson => {
      const previous = byId.get(row.id)
      return {
        id: row.id,
        slug: row.slug,
        nickname: row.nickname,
        current: {
          headline: row.headline,
          headline_en: row.headline_en,
        },
        previous: previousCandidate(previous),
        draftKey: {
          id: row.id,
          slug: row.slug,
        },
      }
    }),
  }
  if (!dry) {
    const generatorFile = packPath(lane)
    const reviewerFile = reviewPath(lane)
    mkdirSync(path.dirname(generatorFile), { recursive: true })
    mkdirSync(path.dirname(reviewerFile), { recursive: true })
    writeFileSync(generatorFile, JSON.stringify(pack, null, 1), 'utf8')
    writeFileSync(reviewerFile, JSON.stringify(reviewPack, null, 1), 'utf8')
    console.log(`claim ${mode} lane=${lane} n=${picked.length} → ${generatorFile}`)
    console.log(`review 비교 팩 → ${reviewerFile}`)
  } else {
    console.log(`claim --dry ${mode} lane=${lane} n=${picked.length} (팩 안 씀)`)
  }
  console.log(`${mode} 잔여 ${pool.length} · 원장 ${ledger.length}`)
  for (const p of pack.people) console.log(`${p.slug ?? p.id} (${p.status})`)
}

function previousCandidate(entry: LedgerEntry | undefined): ReviewPerson['previous'] {
  if (!entry) return null
  return {
    phase: entry.phase,
    headline: entry.headline,
    headline_en: entry.headline_en,
    reviewVersion: entry.reviewVersion ?? null,
  }
}

export async function status(): Promise<void> {
  const db = connectDb()
  const rows = await fetchCelebs(db)
  const buckets = Array.from({ length: LANE_COUNT }, () => [] as CelebRow[])
  for (const r of rows) buckets[laneOf(r.id)].push(r)
  console.log('lane\tnewRemain\trecheckRemain\tledger')
  let newRemainAll = 0
  let recheckRemainAll = 0
  let ledgerAll = 0
  for (let lane = 0; lane < LANE_COUNT; lane++) {
    const ledger = readLedger(lane)
    const byId = new Map(ledger.map((entry) => [entry.id, entry]))
    const newRemain = buckets[lane].filter((row) => !byId.has(row.id)).length
    const recheckRemain = buckets[lane].filter((row) => {
      const entry = byId.get(row.id)
      return entry !== undefined && entry.reviewVersion !== HEADLINE_REVIEW_VERSION
    }).length
    newRemainAll += newRemain
    recheckRemainAll += recheckRemain
    ledgerAll += ledger.length
    const phases = ledger.reduce<Record<string, number>>((acc, e) => {
      acc[e.phase] = (acc[e.phase] ?? 0) + 1
      return acc
    }, {})
    const extra = Object.keys(phases).length
      ? ` ${Object.entries(phases).map(([k, v]) => `${k}:${v}`).join(',')}`
      : ''
    console.log(`${lane}\t${newRemain}\t${recheckRemain}\t${ledger.length}${extra}`)
  }
  console.log(`합\t${newRemainAll}\t${recheckRemainAll}\t${ledgerAll}`)
}
