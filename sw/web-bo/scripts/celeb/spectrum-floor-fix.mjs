/**
 * 스펙트럼 패치의 중립대 위반을 보정한다. 패치 파일을 제자리에서 고친다.
 *
 * `scripts/lib/spectrum-reason-check.ts` 가 「확인 안 됨」류 근거문을 쓴 FLOOR_AXES 축은
 * 점수를 48~52에 두라고 정한다. 근거가 없다는 것은 깎을 이유도 올릴 이유도 없다는 뜻이므로,
 * 근거문은 그대로 두고 점수만 중립값 50으로 옮긴다.
 *
 * 실행 (sw/web-bo 에서): node scripts/celeb/spectrum-floor-fix.mjs [--file <패치>]
 */

import path from 'node:path'
import fs from 'node:fs'

const arg = (f, d) => { const i = process.argv.indexOf(f); return i > -1 ? process.argv[i + 1] : d }
const FILE = path.resolve(process.cwd(), arg('--file', '../../data/celeb/gap-fill/patch-spectrum.json'))

// spectrum-reason-check.ts 와 같은 값. 그쪽이 바뀌면 여기도 맞춘다.
const NO_RECORD = /확인 안 됨|확인되지 않|확인 없음|기록 없음|기록이 없|찾지 못|남아 있지 않/
const FLOOR_AXES = new Set(['fairness', 'benevolence', 'temperance', 'reflection', 'humility'])
const NEUTRAL = 50
const GROUPS = {
  abilities: ['command', 'martial', 'intellect', 'charm'],
  inner_virtues: ['temperance', 'diligence', 'reflection', 'courage'],
  outer_virtues: ['loyalty', 'benevolence', 'fairness', 'humility'],
  dispositions: ['pessimism_optimism', 'conservative_progressive', 'individual_social', 'cautious_bold'],
}

const all = JSON.parse(fs.readFileSync(FILE, 'utf8'))
let fixed = 0
for (const x of all) {
  for (const [g, axes] of Object.entries(GROUPS)) {
    for (const a of axes) {
      if (!FLOOR_AXES.has(a)) continue
      const cell = x.spectrum?.[g]?.[a]
      if (!cell) continue
      if (!NO_RECORD.test(cell.reason_ko)) continue
      if (cell.score >= 48 && cell.score <= 52) continue
      console.log(`${x.slug} ${a}: ${cell.score} → ${NEUTRAL}  «${cell.reason_ko}»`)
      cell.score = NEUTRAL
      fixed++
    }
  }
}
fs.writeFileSync(FILE, JSON.stringify(all, null, 2) + '\n', 'utf8')
console.log(`\n${fixed}건 보정`)
