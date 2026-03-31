/**
 * check-sub.ts — voiceTimings sub 정합성 검증
 *
 * Usage:
 *   pnpm sub:check -- --episode <name>
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { ROOT, findEpisodeDir } from '../lib/episode.js'

const args = process.argv.slice(2)
const epIdx = args.indexOf('--episode')
const epName = epIdx >= 0 ? args[epIdx + 1] : null

if (!epName) {
  console.error('Usage: pnpm sub:check -- --episode <name>')
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
const vt = episode.voiceTimings as Record<string, any[]> | undefined

if (!vt) {
  console.error('voiceTimings 없음')
  process.exit(1)
}

let total = 0, withSub = 0
const broken: string[] = []
const missing: string[] = []

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
      missing.push(`  ${key}[${i}]: (${seg.text.length}자) ${seg.text.slice(0, 50)}`)
    }
  }
}

console.log(`=== ${epName} ===`)
console.log(`전체: ${total} / sub 있음: ${withSub} (${Math.round(withSub / total * 100)}%)`)

if (broken.length > 0) {
  console.error(`\n❌ 깨진 sub ${broken.length / 3}건:`)
  broken.forEach(b => console.error(b))
} else {
  console.log(`깨진 sub: 0`)
}

if (missing.length > 0) {
  console.warn(`\n⚠ sub 누락: ${missing.length}건`)
  missing.forEach(m => console.warn(m))
} else {
  console.log(`sub 누락: 0 ✅`)
}
