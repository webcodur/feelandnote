#!/usr/bin/env tsx
/**
 * generate-srt.ts — 에피소드 JSON에서 SRT 자막 파일 생성 (렌더 없이 단독 실행)
 *
 * Usage: tsx scripts/srt/generate-srt.ts <episode-name>
 * Example: tsx scripts/srt/generate-srt.ts alexander-the-great
 *
 * Output:
 *   out/{Label}/{Lang}/L-VID.srt
 *   out/{Label}/{Lang}/S-VID.srt
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import type { BookRecommendScript, EpisodeTimingData } from '../../src/compositions/BookRecommend/types'
import { buildLongformSubs, buildShortsSubs, subsToSrt } from './srt-builder'
import { mergeEpisode } from '../../src/compositions/BookRecommend/merge-episode'
import { ROOT, findEpisodeDir, parseEpName, resolveEpisodePath } from '../lib/episode.js'

const outDir = join(ROOT, 'out')

/** slug → PascalCase label + lang */
function toCompId(name: string) {
  const isEn = name.endsWith('-en')
  const baseName = isEn ? name.slice(0, -3) : name
  const label = baseName.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
  const lang = isEn ? 'EN' : 'KO'
  return { label, lang }
}

// ── main ──

const epName = process.argv[2]
if (!epName) {
  console.error('Usage: tsx scripts/srt/generate-srt.ts <episode-name>')
  console.error('Example: tsx scripts/srt/generate-srt.ts alexander-the-great')
  process.exit(1)
}

const targets = [epName]
const enPath = resolveEpisodePath(`${epName}-en`)
if (existsSync(enPath)) targets.push(`${epName}-en`)

for (const name of targets) {
  const jsonPath = resolveEpisodePath(name)
  if (!existsSync(jsonPath)) {
    console.error(`에피소드 없음: ${jsonPath}`)
    continue
  }
  const { label, lang } = toCompId(name)
  const epOutDir = join(outDir, label, lang)
  mkdirSync(epOutDir, { recursive: true })

  const content = JSON.parse(readFileSync(jsonPath, 'utf-8')) as BookRecommendScript
  const timingPath = jsonPath.replace(/\.json$/, '.timing.json')
  const timing = existsSync(timingPath)
    ? JSON.parse(readFileSync(timingPath, 'utf-8')) as EpisodeTimingData
    : undefined
  const script = timing ? mergeEpisode(content, timing) : content

  // longform
  const longSrt = subsToSrt(buildLongformSubs(script))
  const longPath = join(epOutDir, 'L-VID.srt')
  writeFileSync(longPath, longSrt, 'utf-8')
  console.log(`OK ${longPath}`)

  // shorts
  const shortSubs = buildShortsSubs(script)
  if (shortSubs.length > 0) {
    const shortSrt = subsToSrt(shortSubs)
    const shortPath = join(epOutDir, 'S-VID.srt')
    writeFileSync(shortPath, shortSrt, 'utf-8')
    console.log(`OK ${shortPath}`)
  } else {
    console.log(`  (${name}: shorts 없음)`)
  }
}
