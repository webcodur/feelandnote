/**
 * apply-sub.ts — sub 매핑을 에피소드 JSON에 적용
 *
 * Usage:
 *   pnpm sub:apply -- --episode <name> --input subs.json
 *
 * subs.json 형태:
 *   { "D01b-summary": { "0": ["청크1", "청크2"] }, ... }
 *
 * 불변식: sub.join(' ') === text (공백 조인)
 */
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { ROOT, findEpisodeDir, resolveTimingPath, parseEpName } from '../lib/episode.js'

const args = process.argv.slice(2)
const epIdx = args.indexOf('--episode')
const epName = epIdx >= 0 ? args[epIdx + 1] : null
const inputIdx = args.indexOf('--input')
const inputPath = inputIdx >= 0 ? args[inputIdx + 1] : null

if (!epName || !inputPath) {
  console.error('Usage: pnpm sub:apply -- --episode <name> --input subs.json')
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
const subsMap: Record<string, Record<string, string[]>> = JSON.parse(readFileSync(inputPath, 'utf-8'))

// timing.json에서 voiceTimings 로드
const timingPath = resolveTimingPath(epName)
let timing: any = {}
try { timing = JSON.parse(readFileSync(timingPath, 'utf-8')) } catch { /* */ }
if (timing.voiceTimings) episode.voiceTimings = timing.voiceTimings

if (!episode.voiceTimings) {
  console.error('voiceTimings 없음')
  process.exit(1)
}

let applied = 0, skipped = 0, errors = 0

for (const [key, indices] of Object.entries(subsMap)) {
  const segs = episode.voiceTimings[key]
  if (!segs) {
    console.error(`❌ 키 없음: ${key}`)
    errors++
    continue
  }
  for (const [idx, sub] of Object.entries(indices)) {
    const i = parseInt(idx)
    const seg = segs[i]
    if (!seg) {
      console.error(`❌ ${key}[${idx}] 인덱스 없음`)
      errors++
      continue
    }
    if (seg.sub) {
      skipped++
      continue
    }
    const joined = sub.join(' ')
    if (joined !== seg.text) {
      console.error(`❌ ${key}[${idx}] 텍스트 불일치`)
      console.error(`   원문:  ${seg.text}`)
      console.error(`   조인:  ${joined}`)
      errors++
      continue
    }
    seg.sub = sub
    applied++
  }
}

// voiceTimings를 timing.json에 저장 (content JSON은 건드리지 않음)
timing.voiceTimings = episode.voiceTimings
writeFileSync(timingPath, JSON.stringify(timing, null, 2) + '\n', 'utf-8')
console.log(`\n✅ ${applied}건 적용 / ⏭ ${skipped}건 스킵(기존) / ❌ ${errors}건 실패`)
