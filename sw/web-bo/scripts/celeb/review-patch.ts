/**
 * 재채점 패치 판정 도구 — 16축을 눈으로 보고, 그대로 반영까지 한다.
 *
 *   pnpm celeb:spectrum:review --slug <slug>            # 축·글자 수 출력 + dry-run
 *   pnpm celeb:spectrum:review --slug <slug> --apply    # 반영
 *   pnpm celeb:spectrum:review --file <패치.json>       # 파일을 직접 지정
 *
 * 패치 기본 경로는 `.tmp-spectrum-audit/patch-<slug>.json`이다.
 * 기계 검사(`celeb:spectrum:check`)가 통과시킨 뒤에도 사람이 봐야 하는 것은 이것들이다.
 *  - 축에 맞지 않는 근거 — 기부를 충성 축에, 회사의 사업 목표를 공정 축에 넣지 않았는가
 *  - 점수 인플레 — 척도 상단(85+)은 역사적 최상위 몫이다
 *  - 무력 raw — 운동 성과가 있는데 낮게 주지 않았는가(여성 보정은 저장할 때 도구가 한다)
 *  - 사소한 방송 일화, 인물·작품 혼동, 동명이인, 정치 성향 과잉 추정
 *
 * 반영이 끝난 패치와 노트는 같은 회차의 중복 반영을 막기 위해 `.tmp-spectrum-audit/done/`으로 옮긴다.
 * 감사 회차가 종료되고 최종 검증이 끝나면 `.tmp-spectrum-audit/` 전체를 폐기한다.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, renameSync } from 'node:fs'
import path from 'node:path'

const GROUPS = ['abilities', 'inner_virtues', 'outer_virtues', 'dispositions'] as const

function argOf(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const has = (flag: string) => process.argv.includes(`--${flag}`)

const slug = argOf('slug')
const file = argOf('file') ?? (slug ? path.join('.tmp-spectrum-audit', `patch-${slug}.json`) : undefined)
if (!file) {
  console.error('사용법: pnpm celeb:spectrum:review --slug <slug> [--apply]')
  process.exit(2)
}
if (!existsSync(file)) {
  console.error(`패치 없음: ${file}`)
  process.exit(2)
}

const parsed = JSON.parse(readFileSync(file, 'utf8'))
const entry = (Array.isArray(parsed) ? parsed[0] : parsed) as {
  slug?: string
  spectrum?: Record<string, unknown>
  persona?: Record<string, unknown>
}
const target = slug ?? entry.slug
if (!target) { console.error('slug을 찾지 못함'); process.exit(2) }
const spectrum = entry.spectrum ?? entry.persona ?? {}

for (const g of GROUPS) {
  const group = spectrum[g]
  if (!group || typeof group !== 'object' || Array.isArray(group)) continue
  for (const [axis, v] of Object.entries(group as Record<string, unknown>)) {
    const e = v as { score?: number; reason_ko?: string }
    const ko = String(e?.reason_ko ?? '')
    console.log(`${axis.padEnd(26)} ${String(e?.score).padStart(4)} | ${ko} (${ko.length}자)`)
  }
}
if (typeof spectrum.rationale_ko === 'string') console.log(`\nrationale_ko: ${spectrum.rationale_ko}`)

const args = ['exec', 'tsx', 'scripts/celeb/fill.ts', 'apply', '--file', file, '--only-slugs', target, '--replace-spectrum']
if (has('apply')) args.push('--apply')
const r = spawnSync('pnpm', args, { encoding: 'utf8', shell: true })
const output = (r.stdout + r.stderr).trim()
console.log('\n' + output.split('\n').slice(-4).join('\n'))
if (r.status !== 0 || /FAILED:\s*[1-9]/.test(output)) process.exit(r.status || 1)

if (has('apply')) {
  const doneDir = path.join(path.dirname(file), 'done')
  mkdirSync(doneDir, { recursive: true })
  renameSync(file, path.join(doneDir, path.basename(file)))
  const notes = path.join(path.dirname(file), `notes-${target}.md`)
  if (existsSync(notes)) renameSync(notes, path.join(doneDir, path.basename(notes)))
  console.log(`완료 이력 이동: ${path.join(doneDir, path.basename(file))}`)
}
