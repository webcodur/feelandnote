/**
 * 4-sub-check.ts — 음성 파이프라인 4단계 검증: sub 필드 누락·깨짐 확인
 *
 * voiceTimings의 각 세그먼트가 의미 단위 sub를 가지고 있는지,
 * sub.join(' ') === text 불변식을 지키는지 검사한다.
 *
 * 기본 동작은 **30자 초과 세그먼트**만 누락 기준으로 본다
 * (analyze 경고 기준과 동일). 30자 이하는 tts.md 규칙상 "하나의 짧은
 * 의미 덩어리"로 취급되어 sub 불필요.
 *
 * Usage:
 *   pnpm sub:check -- --episode <name>            # 30자 초과만 검사 (기본)
 *   pnpm sub:check -- --episode <name> --strict   # 모든 세그먼트 검사
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { ROOT, findEpisodeDir, resolveTimingPath, parseEpName } from '../lib/episode.js'

const args = process.argv.slice(2)
const epIdx = args.indexOf('--episode')
const epName = epIdx >= 0 ? args[epIdx + 1] : null
const strictMode = args.includes('--strict')
const MIN_SUB_LEN = 30  // analyze 3-timings 경고 기준과 동일

if (!epName) {
  console.error('Usage: pnpm sub:check -- --episode <name> [--strict]')
  process.exit(1)
}

const isEn = epName.endsWith('-en')
const base = isEn ? epName.slice(0, -3) : epName
const partMatch = base.match(/-(\d+)$/)
const person = partMatch ? base.slice(0, -partMatch[0].length) : base
const locale = isEn ? 'en' : 'ko'
const part = partMatch ? parseInt(partMatch[1]) : 1
const filename = part > 1 ? `${locale}-${part}.json` : `${locale}.json`
const epPath = join(findEpisodeDir(person), filename)

const episode = JSON.parse(readFileSync(epPath, 'utf-8'))
// timing.json에서 voiceTimings 로드
const timingPath = resolveTimingPath(epName)
try {
  const timing = JSON.parse(readFileSync(timingPath, 'utf-8'))
  if (timing.voiceTimings) episode.voiceTimings = timing.voiceTimings
} catch { /* timing.json 없으면 content에서 fallback */ }
const vt = episode.voiceTimings as Record<string, any[]> | undefined

if (!vt) {
  console.error('voiceTimings 없음')
  process.exit(1)
}

let total = 0, withSub = 0
const broken: string[] = []
const missing: string[] = []
const shortSkipped: string[] = []  // 30자 이하 & sub 없음 — 기본 모드에서는 검사 생략

for (const [key, segs] of Object.entries(vt)) {
  for (let i = 0; i < segs.length; i++) {
    total++
    const seg = segs[i]
    if (seg.sub) {
      withSub++
      const joined = (seg.sub as string[]).join(' ')
      if (joined !== seg.text) {
        broken.push(`  ${key}[${i}]: sub.join(' ') !== text`)
        broken.push(`    text:   ${seg.text}`)
        broken.push(`    joined: ${joined}`)
      }
    } else if (seg.text?.length > 0) {
      const entry = `  ${key}[${i}]: (${seg.text.length}자) ${seg.text.slice(0, 50)}`
      if (strictMode || seg.text.length > MIN_SUB_LEN) {
        missing.push(entry)
      } else {
        shortSkipped.push(entry)
      }
    }
  }
}

console.log(`=== ${epName} ===`)
console.log(`전체: ${total} / sub 있음: ${withSub} (${Math.round(withSub / total * 100)}%)`)
if (!strictMode) {
  console.log(`검사 기준: ${MIN_SUB_LEN}자 초과 세그먼트 (--strict로 전체 검사)`)
}

if (broken.length > 0) {
  console.error(`\n❌ 깨진 sub ${broken.length / 3}건:`)
  broken.forEach(b => console.error(b))
} else {
  console.log(`깨진 sub: 0`)
}

if (missing.length > 0) {
  console.warn(`\n⚠ sub 누락: ${missing.length}건${strictMode ? '' : ' (30자 초과)'}`)
  missing.forEach(m => console.warn(m))
} else {
  console.log(`sub 누락: 0 ✅`)
}

if (!strictMode && shortSkipped.length > 0) {
  console.log(`\nℹ 짧은 세그먼트 ${shortSkipped.length}건은 sub 불필요로 판정 (${MIN_SUB_LEN}자 이하)`)
}
