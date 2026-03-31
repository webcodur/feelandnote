/**
 * render-all.ts — 롱폼 + 쇼츠 MP4/SRT 일괄 렌더
 *
 * Usage:
 *   pnpm render:all                              # 전체 에피소드
 *   pnpm render:all -- --episode alexander-the-great  # 특정 에피소드
 *   pnpm render:all -- --only longform            # 롱폼만
 *   pnpm render:all -- --only shorts              # 쇼츠만
 */
import { execSync } from 'child_process'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { buildLongformSubs, buildShortsSubs, subsToSrt } from '../srt/srt-builder'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// --- 에피소드 로드 ---
import { episodes } from '../../src/compositions/BookRecommend/script'
import type { BookRecommendScript } from '../../src/compositions/BookRecommend/types'

// --- Args ---
const args = process.argv.slice(2)
const epFlag = args.indexOf('--episode')
const epFilter = epFlag >= 0 ? args[epFlag + 1] : null
const onlyFlag = args.indexOf('--only')
const only = onlyFlag >= 0 ? args[onlyFlag + 1] : null // 'longform' | 'shorts'

const OUT_DIR = join(__dirname, '..', '..', 'out')
mkdirSync(OUT_DIR, { recursive: true })

// --- 렌더 실행 ---
/** Root.tsx groupByPerson 로직과 동일: -en 접미사 분리 → baseName PascalCase + lang */
function toCompId(name: string) {
  const isEn = name.endsWith('-en')
  const baseName = isEn ? name.slice(0, -3) : name
  const label = baseName.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
  const lang = isEn ? 'EN' : 'KO'
  return { label, lang }
}

const targetEpisodes = epFilter
  ? Object.fromEntries(
      Object.entries(episodes as Record<string, BookRecommendScript>)
        .filter(([k]) => k === epFilter || k === `${epFilter}-en`)
    )
  : episodes as Record<string, BookRecommendScript>

for (const [name, script] of Object.entries(targetEpisodes)) {
  if (!script) { console.error(`에피소드 '${name}' 없음`); continue }
  const { label, lang } = toCompId(name)
  const compPrefix = `${label}-${lang}`

  // 에피소드별 서브폴더: out/{Label}/{Lang}/
  const epDir = join(OUT_DIR, label, lang)
  mkdirSync(epDir, { recursive: true })

  // 롱폼
  if (!only || only === 'longform') {
    const compId = `${compPrefix}-L-VID`
    console.log(`\n▶ 롱폼 렌더: ${compId}`)
    const mp4 = join(epDir, 'L-VID.mp4')
    execSync(`pnpm.cmd render ${compId} "${mp4}" --concurrency=75% --timeout=60000`, { stdio: 'inherit', cwd: join(__dirname, '..', '..') })

    const srt = subsToSrt(buildLongformSubs(script))
    const srtPath = join(epDir, 'L-VID.srt')
    writeFileSync(srtPath, srt, 'utf-8')
    console.log(`  ✓ SRT: ${srtPath}`)

    // 롱폼 썸네일
    const thumbId = `${compPrefix}-L-THUMB`
    const lt = join(epDir, 'L-THUMB.png')
    execSync(`pnpm.cmd remotion still ${thumbId} "${lt}" --frame=0 --image-format=png --gl=angle`, { stdio: 'inherit', cwd: join(__dirname, '..', '..') })
    console.log(`  ✓ 롱폼 썸네일: ${lt}`)
  }

  // 쇼츠
  if ((!only || only === 'shorts') && script.shorts) {
    const compId = `${compPrefix}-S-VID`
    console.log(`\n▶ 쇼츠 렌더: ${compId}`)
    const mp4 = join(epDir, 'S-VID.mp4')
    execSync(`pnpm.cmd render ${compId} "${mp4}" --concurrency=75% --timeout=60000`, { stdio: 'inherit', cwd: join(__dirname, '..', '..') })

    const srt = subsToSrt(buildShortsSubs(script))
    const srtPath = join(epDir, 'S-VID.srt')
    writeFileSync(srtPath, srt, 'utf-8')
    console.log(`  ✓ SRT: ${srtPath}`)

  }
}

console.log(`\n✅ 완료. 출력: ${OUT_DIR}`)
