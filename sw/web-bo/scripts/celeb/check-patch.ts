/**
 * 스펙트럼 재채점 패치 자가 검사(읽기 전용, DB 접속 없음).
 *
 *   pnpm celeb:spectrum:check --file .tmp-spectrum-audit/patch-<slug>.json
 *   pnpm celeb:spectrum:check --file a.json --file b.json
 *
 * 조사자가 패치를 제출하기 전에 직접 돌린다. 판정 규칙은 `scripts/lib/spectrum-reason-check.ts`가 쥔다.
 * ERROR가 하나라도 있으면 exit 1이다. 반영 도구(`celeb:fill`)가 같은 규칙으로 다시 막으므로,
 * 여기서 통과시키지 못한 패치는 반영되지 않는다.
 *
 * 여기서 잡지 못하는 것은 사람이 본다 — 인물·작품 혼동, 동명이인, 정치 성향 과잉 추정,
 * 그룹·회사 명의 행위를 개인 근거로 쓴 것.
 */
import { readFileSync } from 'node:fs'
import { findContentIssues, personaToRows, type ReasonRow } from '../lib/spectrum-reason-check'

function argsOf(name: string): string[] {
  const out: string[] = []
  for (let i = 0; i < process.argv.length; i++) if (process.argv[i] === `--${name}`) out.push(process.argv[i + 1])
  return out.filter(Boolean)
}

const files = argsOf('file')
if (!files.length) {
  console.error('사용법: pnpm celeb:spectrum:check --file <패치.json> [--file <패치.json> ...]')
  process.exit(2)
}

let errors = 0
let warns = 0
for (const file of files) {
  let rows: ReasonRow[] = []
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    const list = Array.isArray(parsed) ? parsed : [parsed]
    for (const p of list) {
      const slug = String(p?.slug ?? '')
      if (!slug) throw new Error('slug 없음')
      const spectrum = p?.spectrum ?? p?.persona
      if (!spectrum) throw new Error('spectrum 없음')
      // 성별은 무력 보정에만 쓰이고 내용 검수와 무관하다.
      rows.push(...personaToRows(slug, null, spectrum))
    }
  } catch (e) {
    console.error(`${file} — 읽기 실패: ${(e as Error).message}`)
    errors++
    continue
  }

  const issues = findContentIssues(rows, { yearWarning: true, strictFloor: true })
  const e = issues.filter((i) => i.level === 'ERROR')
  const w = issues.filter((i) => i.level === 'WARN')
  errors += e.length
  warns += w.length
  console.log(`\n${file} — 축 ${rows.length}개 · ERROR ${e.length} · WARN ${w.length}`)
  for (const i of [...e, ...w]) console.log(`  ${i.level} ${i.detail}${i.reason_ko ? ` — 「${i.reason_ko}」` : ''}`)
}

console.log(`\n합계 ERROR ${errors} · WARN ${warns}`)
if (errors) {
  console.log('ERROR를 모두 고쳐야 반영된다. WARN(연도 없음)은 행적으로 다시 쓸 수 있는지 확인한다.')
  process.exit(1)
}
