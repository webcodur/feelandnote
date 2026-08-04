/**
 * 작업 선점기. 레인(worker)마다 독립적으로 다음 인물 묶음을 집어간다.
 * 다른 레인을 기다리지 않으며, 같은 인물을 두 레인이 집는 것도 막는다.
 *
 *   pnpm exec tsx scripts/claim-celeb-work.ts --worker lane-a --count 4
 *   pnpm exec tsx scripts/claim-celeb-work.ts --worker lane-a --count 4 --class heavy
 *
 * 동작
 *  - DB를 재감사해 남은 결손 인물을 구한다(진행 상황의 원천은 DB다).
 *  - `.tmp-celeb-fill/claims/<slug>.json` 을 배타 생성(`wx`)해 선점한다. 이미 있으면 건너뛴다.
 *  - 선점 유효기간(lease)은 90분. 지난 선점은 회수한다.
 *  - 선점 결과를 `.tmp-celeb-fill/work-<worker>.json` 으로 쓴다. 남은 일이 없으면 빈 배열.
 *
 * 우선순위: status='active' → 결손 많은 순 → slug.
 */

import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const DIR = '.tmp-celeb-fill'
const CLAIMS = path.join(DIR, 'claims')
const LEASE_MS = 30 * 60 * 1000
const HEAVY_MARKERS = ['influence:row', 'persona:row', 'speech:dialogue_row']

function argOf(name: string, dflt: string): string {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : dflt
}

type Gap = { slug: string; nickname: string; tier: string; status: string; gaps: string[] }

async function main() {
  const worker = argOf('worker', '')
  if (!worker) throw new Error('--worker 필요')
  const count = Number(argOf('count', '4'))
  const cls = argOf('class', 'any')

  await mkdir(CLAIMS, { recursive: true })

  // 만료된 선점 회수
  const now = Date.now()
  for (const f of await readdir(CLAIMS)) {
    const p = path.join(CLAIMS, f)
    try {
      const s = await stat(p)
      if (now - s.mtimeMs > LEASE_MS) await unlink(p)
    } catch {
      /* 경쟁 상태로 이미 지워졌으면 무시 */
    }
  }

  const raw = execFileSync('pnpm', ['exec', 'tsx', 'scripts/audit-celeb-track-gaps.ts', '--json'], {
    encoding: 'utf8',
    maxBuffer: 200 * 1024 * 1024,
  })
  const audit = JSON.parse(raw.slice(raw.indexOf('{'))) as { rows: Gap[]; withGaps: number }

  const isHeavy = (r: Gap) => r.gaps.some((g) => HEAVY_MARKERS.includes(g))
  let pool = audit.rows
  if (cls === 'heavy') pool = pool.filter(isHeavy)
  else if (cls === 'light') pool = pool.filter((r) => !isHeavy(r))

  // 보류 장부에 걸린 항목만 남은 인물은 선점 대상에서 뺀다 (큐 앞단 막힘 방지)
  let deferred: { slug: string; gaps: string[] }[] = []
  try {
    deferred = JSON.parse(await readFile(path.join(DIR, 'deferred.json'), 'utf8'))
  } catch {
    /* 장부 없으면 무시 */
  }
  const deferredBySlug = new Map(deferred.map((d) => [d.slug, new Set(d.gaps)]))
  const norm = (g: string) => g.replace(/\(\d+\)$/, '')
  let deferredSkipped = 0
  pool = pool.filter((r) => {
    const d = deferredBySlug.get(r.slug)
    if (!d) return true
    const remaining = r.gaps.filter((g) => !d.has(norm(g)))
    if (remaining.length === 0) {
      deferredSkipped++
      return false
    }
    return true
  })

  pool.sort((a, b) => {
    const act = (r: Gap) => (r.status === 'active' ? 0 : 1)
    if (act(a) !== act(b)) return act(a) - act(b)
    if (b.gaps.length !== a.gaps.length) return b.gaps.length - a.gaps.length
    return a.slug.localeCompare(b.slug)
  })

  const claimed: Gap[] = []
  for (const r of pool) {
    if (claimed.length >= count) break
    const p = path.join(CLAIMS, `${r.slug}.json`)
    try {
      await writeFile(p, JSON.stringify({ worker, at: new Date().toISOString() }), { flag: 'wx' })
      claimed.push(r)
    } catch {
      /* 이미 다른 레인이 선점 */
    }
  }

  const out = path.join(DIR, `work-${worker}.json`)
  await writeFile(out, JSON.stringify(claimed, null, 2))

  console.log(`worker=${worker} class=${cls}`)
  console.log(`전체 결손 ${audit.withGaps}명 · 대상 풀 ${pool.length}명 (보류 제외 ${deferredSkipped}명)`)
  console.log(`이번에 선점 ${claimed.length}명 → ${out}`)
  if (claimed.length === 0) console.log('NO_WORK — 더 집을 것이 없다. 작업을 마쳐라.')
  else console.log(claimed.map((r) => `${r.slug}(${r.nickname}) [${r.gaps.length}]`).join('\n'))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
