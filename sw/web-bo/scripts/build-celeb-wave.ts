/**
 * 다음 파도(wave)의 배치 묶음을 만든다. 진행 상황은 DB 실측이 원천이라 매번 재감사한다.
 *
 *   pnpm exec tsx scripts/build-celeb-wave.ts --class light --agents 8 --per 8
 *   pnpm exec tsx scripts/build-celeb-wave.ts --class heavy --agents 8 --per 4
 *
 * --class light : 행은 있고 필드만 빈 인물 (주로 영문 결손) — 한 배치에 많이 담을 수 있다
 * --class heavy : 영향력·스펙트럼·대사 행 자체가 없는 인물 — 한 배치에 적게 담는다
 *
 * 우선순위: status='active' 먼저, 그다음 결손 개수 많은 순.
 * 산출물: .tmp-celeb-fill/chunk-NN.json (기존 chunk/patch 는 지우고 새로 만든다)
 */

import { mkdir, readdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const DIR = '.tmp-celeb-fill'
const HEAVY_MARKERS = ['influence:row', 'spectrum:row', 'speech:dialogue_row']

/** 과거 감사 산출물의 prefix는 입력 경계에서만 허용한다. */
const normGap = (gap: string): string => gap.replace(/^persona:/, 'spectrum:')

function argOf(name: string, dflt: string): string {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : dflt
}

type Gap = { slug: string; nickname: string; tier: string; status: string; gaps: string[] }

async function main() {
  const cls = argOf('class', 'light')
  const agents = Number(argOf('agents', '8'))
  const per = Number(argOf('per', '8'))

  const raw = execFileSync('pnpm', ['exec', 'tsx', 'scripts/audit-celeb-track-gaps.ts', '--json'], {
    encoding: 'utf8',
    maxBuffer: 200 * 1024 * 1024,
  })
  const audit = JSON.parse(raw.slice(raw.indexOf('{'))) as { rows: Gap[]; withGaps: number }

  const isHeavy = (r: Gap) => r.gaps.some((g) => HEAVY_MARKERS.includes(normGap(g)))
  let pool = audit.rows.filter((r) => (cls === 'heavy' ? isHeavy(r) : !isHeavy(r)))

  pool.sort((a, b) => {
    const act = (r: Gap) => (r.status === 'active' ? 0 : 1)
    if (act(a) !== act(b)) return act(a) - act(b)
    if (b.gaps.length !== a.gaps.length) return b.gaps.length - a.gaps.length
    return a.slug.localeCompare(b.slug)
  })

  const take = pool.slice(0, agents * per)
  await mkdir(DIR, { recursive: true })
  for (const f of await readdir(DIR)) {
    if (f.startsWith('chunk-') || f.startsWith('patch-')) await unlink(path.join(DIR, f))
  }

  const chunks: Gap[][] = Array.from({ length: agents }, () => [])
  take.forEach((r, i) => chunks[i % agents].push(r))

  let written = 0
  for (let i = 0; i < agents; i++) {
    if (chunks[i].length === 0) continue
    const id = String(i + 1).padStart(2, '0')
    await writeFile(path.join(DIR, `chunk-${id}.json`), JSON.stringify(chunks[i], null, 2))
    written++
  }

  console.log(`class=${cls} 잔여 풀 ${pool.length}명 (전체 결손 ${audit.withGaps}명)`)
  console.log(`이번 파도 ${take.length}명 → 배치 ${written}개 (크기 ${chunks.filter((c) => c.length).map((c) => c.length).join(',')})`)
  console.log(`active 포함 ${take.filter((r) => r.status === 'active').length}명`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
