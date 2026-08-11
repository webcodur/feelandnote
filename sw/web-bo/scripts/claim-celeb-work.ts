/**
 * 작업 선점기. 레인(worker)마다 독립적으로 다음 인물 묶음을 집어간다.
 * 다른 레인을 기다리지 않으며, 같은 인물을 두 레인이 집는 것도 막는다.
 *
 *   pnpm exec tsx scripts/claim-celeb-work.ts --worker lane-a --count 4
 *   pnpm exec tsx scripts/claim-celeb-work.ts --worker lane-a --count 4 --class heavy
 *   pnpm exec tsx scripts/claim-celeb-work.ts --worker lane-a --count 3 --target influence-spectrum
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
const HEAVY_MARKERS = ['influence:row', 'spectrum:row', 'speech:dialogue_row']

/**
 * 대상 결손 묶음. `--target` 으로 고른다.
 * 이 저장소는 트랙별로 회차를 나눠 돌리므로, 한 회차가 다른 트랙 결손자를 집어가지 않게 좁힌다.
 */
const TARGETS: Record<string, string[]> = {
  /** 직군·국적·성별 3필드 */
  basic3: ['basic:profession', 'basic:nationality', 'basic:gender'],
  /** 영향력 7축 + 스펙트럼 16축. 행 자체가 없는 인물이 대부분이다 */
  'influence-spectrum': [
    'influence:row',
    'spectrum:row',
    'spectrum:detail',
    'spectrum:rationale_ko',
    'spectrum:rationale_en',
  ],
  /** 영문 번역 — 수식어·소개·영향력 설명·명언·대사 */
  i18n: [
    'i18n:title_en',
    'i18n:bio_en',
    'i18n:political_exp_en',
    'i18n:strategic_exp_en',
    'i18n:tech_exp_en',
    'i18n:social_exp_en',
    'i18n:economic_exp_en',
    'i18n:cultural_exp_en',
    'i18n:transhistoricity_exp_en',
    'i18n:quote_en',
    'i18n:lines_en',
  ],
  /**
   * 수식어·말투·대사 21개 — 신규 등록 인물의 한국어 기본 정비.
   * `speech:quote`(명언)는 일부러 뺐다. 확인된 실제 발언이 없으면 비워 두는 것이 정상인데,
   * 결손으로는 계속 잡혀서 그 한 칸만 빈 인물이 큐 앞단을 반복해 차지한다.
   */
  'speech-basic': ['basic:title', 'speech:tone', 'speech:dialogue_row', 'speech:lines_ko'],
}

/** 외부 자동화가 넘길 수 있는 폐기 전 CLI 값만 입력 경계에서 정규화한다. */
const LEGACY_TARGET_ALIASES: Record<string, string> = {
  'influence-persona': 'influence-spectrum',
}

/** 개수 꼬리표와 폐기 전 gap prefix를 정식 spectrum marker로 정규화한다. */
const normGap = (g: string) => g
  .replace(/\(\d+\)$/, '')
  .replace(/^persona:/, 'spectrum:')

/**
 * 대상 묶음별 제외 조건. 이 결손을 가진 인물은 그 묶음에서 뺀다.
 * 선행 트랙이 안 끝나 번역할 원문 자체가 없는 인물이 큐 앞단을 막을 때 쓴다.
 * 26.08.07 기준 실제로 걸리는 조건은 없다(소개는 전원 채워져 있다).
 */
const EXCLUDE: Record<string, string[]> = {}

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
  const requestedTargetName = argOf('target', 'basic3')
  const targetName = LEGACY_TARGET_ALIASES[requestedTargetName] ?? requestedTargetName
  const TARGET = TARGETS[targetName]
  if (!TARGET) throw new Error(`--target 은 ${Object.keys(TARGETS).join(' | ')} 중 하나여야 한다: ${targetName}`)

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

  // Windows 에서 .cmd 셸 실행을 위해 shell 옵션 사용 (execFileSync('pnpm') 는 .cmd 를 못 찾는다)
  const raw = execFileSync('pnpm', ['exec', 'tsx', 'scripts/audit-celeb-track-gaps.ts', '--json'], {
    encoding: 'utf8',
    maxBuffer: 200 * 1024 * 1024,
    shell: true,
  })
  const audit = JSON.parse(raw.slice(raw.indexOf('{'))) as { rows: Gap[]; withGaps: number }

  const isHeavy = (r: Gap) => r.gaps.some((g) => HEAVY_MARKERS.includes(normGap(g)))
  let pool = audit.rows
  if (cls === 'heavy') pool = pool.filter(isHeavy)
  else if (cls === 'light') pool = pool.filter((r) => !isHeavy(r))
  // 이번 회차 대상 결손을 가진 인물만 남긴다
  pool = pool.filter((r) => r.gaps.some((g) => TARGET.includes(normGap(g))))

  // 선행 트랙이 안 끝난 인물은 뺀다
  const exclude = EXCLUDE[targetName] ?? []
  let excludedByPrereq = 0
  if (exclude.length > 0) {
    pool = pool.filter((r) => {
      const blocked = r.gaps.some((g) => exclude.includes(normGap(g)))
      if (blocked) excludedByPrereq++
      return !blocked
    })
  }

  // 보류 장부에 걸린 항목만 남은 인물은 선점 대상에서 뺀다 (큐 앞단 막힘 방지)
  let deferred: { slug: string; gaps: string[] }[] = []
  try {
    deferred = JSON.parse(await readFile(path.join(DIR, 'deferred.json'), 'utf8'))
  } catch {
    /* 장부 없으면 무시 */
  }
  const deferredBySlug = new Map(deferred.map((d) => [d.slug, new Set(d.gaps.map(normGap))]))
  let deferredSkipped = 0
  pool = pool.filter((r) => {
    const d = deferredBySlug.get(r.slug)
    if (!d) return true
    // 대상 결손 중 보류되지 않은 것이 남아 있는지만 본다 (보류된 필드만 남으면 제외)
    const remaining = r.gaps.filter((g) => TARGET.includes(normGap(g)) && !d.has(normGap(g)))
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

  console.log(`worker=${worker} class=${cls} target=${targetName}`)
  if (requestedTargetName !== targetName) {
    console.warn(`legacy target alias: ${requestedTargetName} -> ${targetName}`)
  }
  console.log(
    `전체 결손 ${audit.withGaps}명 · 대상 풀 ${pool.length}명` +
      ` (보류 제외 ${deferredSkipped}명, 선행 트랙 미완 제외 ${excludedByPrereq}명)`,
  )
  console.log(`이번에 선점 ${claimed.length}명 → ${out}`)
  if (claimed.length === 0) console.log('NO_WORK — 더 집을 것이 없다. 작업을 마쳐라.')
  else console.log(claimed.map((r) => `${r.slug}(${r.nickname}) [${r.gaps.length}]`).join('\n'))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
