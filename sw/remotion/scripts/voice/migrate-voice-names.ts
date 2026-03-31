/**
 * migrate-voice-names.ts — 음성 파일명 마이그레이션
 *
 * 알파벳 순 = 재생 순서가 되도록 파일명을 변경한다.
 *
 * Usage:
 *   npx tsx scripts/voice/migrate-voice-names.ts                    # dry run
 *   npx tsx scripts/voice/migrate-voice-names.ts --apply            # 실제 적용
 *   npx tsx scripts/voice/migrate-voice-names.ts --episode elon-musk  # 특정 에피소드만
 */
import { readdir, readFile, writeFile, rename, stat } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { oldToNew, vnTimingKey } from '../../src/compositions/BookRecommend/voice-names'
import type { BookRecommendScript } from '../../src/compositions/BookRecommend/types'
import { ROOT, findEpisodeDir, parseEpName, resolveEpisodePath } from '../lib/episode.js'

// --- CLI ---
const args = process.argv.slice(2)
const applyMode = args.includes('--apply')
const epIdx = args.indexOf('--episode')
const epFilter = epIdx >= 0 ? args[epIdx + 1] : null

type RenameEntry = { old: string; new: string; dir: string }

async function loadEpisode(name: string): Promise<BookRecommendScript | null> {
  try {
    const raw = await readFile(resolveEpisodePath(name), 'utf-8')
    return JSON.parse(raw) as BookRecommendScript
  } catch { return null }
}

/** 디렉토리 내 .wav 파일 목록 (재귀 아님) */
async function listWavFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir)
    return entries.filter(f => f.endsWith('.wav') && !f.endsWith('.wav.bak'))
  } catch { return [] }
}

/** 엔진 서브디렉토리 목록 */
async function listEngineDirs(baseDir: string): Promise<string[]> {
  const known = ['gemini', 'cloud', 'elevenlabs']
  const found: string[] = []
  for (const name of known) {
    try {
      const s = await stat(path.join(baseDir, name))
      if (s.isDirectory()) found.push(name)
    } catch { /* skip */ }
  }
  return found
}

async function migrateEpisode(epName: string): Promise<number> {
  console.log(`\n=== ${epName} ===`)
  const episode = await loadEpisode(epName)
  if (!episode) {
    console.log('  에피소드 JSON 없음 — 건너뜀')
    return 0
  }

  const bookCount = episode.books.length
  const shortSegments = episode.shorts?.segments?.map(s => ({ id: s.id }))
  const { person, locale } = parseEpName(epName)
  const epVoiceDir = path.join(findEpisodeDir(person), 'voice', locale)

  const renames: RenameEntry[] = []

  // 루트 레벨 .wav 파일
  const rootFiles = await listWavFiles(epVoiceDir)
  for (const file of rootFiles) {
    const newName = oldToNew(file, bookCount, shortSegments)
    if (newName && newName !== file) {
      renames.push({ old: file, new: newName, dir: epVoiceDir })
    }
  }

  // 엔진 서브디렉토리
  const engineDirs = await listEngineDirs(epVoiceDir)
  for (const engine of engineDirs) {
    const engineDir = path.join(epVoiceDir, engine)
    const engineFiles = await listWavFiles(engineDir)
    for (const file of engineFiles) {
      const newName = oldToNew(file, bookCount, shortSegments)
      if (newName && newName !== file) {
        renames.push({ old: file, new: newName, dir: engineDir })
      }
    }
  }

  if (renames.length === 0) {
    console.log('  변경 대상 없음')
    return 0
  }

  // 파일 리네임 출력
  for (const r of renames) {
    const rel = path.relative(epVoiceDir, r.dir)
    console.log(`  ${rel ? rel + '/' : ''}${r.old} -> ${r.new}`)
  }

  // voiceTimings 키 변경
  const timingRenames: { old: string; new: string }[] = []
  if (episode.voiceTimings) {
    const oldKeys = Object.keys(episode.voiceTimings)
    for (const oldKey of oldKeys) {
      const oldFile = `${oldKey}.wav`
      const newFile = oldToNew(oldFile, bookCount, shortSegments)
      if (newFile) {
        const newKey = vnTimingKey(newFile)
        if (newKey !== oldKey) {
          timingRenames.push({ old: oldKey, new: newKey })
        }
      }
    }
    if (timingRenames.length > 0) {
      console.log(`  voiceTimings 키 ${timingRenames.length}개 변경:`)
      for (const t of timingRenames) {
        console.log(`    ${t.old} -> ${t.new}`)
      }
    }
  }

  console.log(`  합계: 파일 ${renames.length}개, voiceTimings ${timingRenames.length}개`)

  if (!applyMode) return renames.length

  // --- 실제 적용 ---

  // 1. 파일 리네임
  for (const r of renames) {
    await rename(path.join(r.dir, r.old), path.join(r.dir, r.new))
  }

  // 2. voiceTimings 키 갱신
  if (timingRenames.length > 0 && episode.voiceTimings) {
    for (const t of timingRenames) {
      episode.voiceTimings[t.new] = episode.voiceTimings[t.old]
      delete episode.voiceTimings[t.old]
    }
    const epJsonPath = resolveEpisodePath(epName)
    await writeFile(epJsonPath, JSON.stringify(episode, null, 2) + '\n', 'utf-8')
    console.log(`  -> ${epName}.json voiceTimings 갱신 완료`)
  }

  return renames.length
}

async function main() {
  console.log(applyMode ? '*** APPLY 모드 — 실제 변경 적용 ***' : '*** DRY RUN — 변경 미적용 ***')

  let totalRenames = 0

  if (epFilter) {
    totalRenames = await migrateEpisode(epFilter)
  } else {
    // 모든 에피소드: public/episodes/{todo|live|done}/{person}/voice/{locale} 순회
    const EPISODES_BASE = path.join(ROOT, 'public', 'episodes')
    for (const status of ['todo', 'live', 'done']) {
      const statusDir = path.join(EPISODES_BASE, status)
      const statusStat = await stat(statusDir).catch(() => null)
      if (!statusStat?.isDirectory()) continue
      const persons = await readdir(statusDir)
      for (const person of persons) {
        if (person.startsWith('_')) continue
        const personDir = path.join(statusDir, person)
        const s = await stat(personDir).catch(() => null)
        if (!s?.isDirectory()) continue
        const voiceDir = path.join(personDir, 'voice')
        const vs = await stat(voiceDir).catch(() => null)
        if (!vs?.isDirectory()) continue
        const locales = await readdir(voiceDir)
        for (const locale of locales) {
          const ls = await stat(path.join(voiceDir, locale)).catch(() => null)
          if (!ls?.isDirectory()) continue
          // locale → epName 재구성
          const parts = locale.split('-')
          const baseLang = parts[0]
          const partNum = parts[1] ? parseInt(parts[1]) : 0
          let epName = person
          if (partNum > 0) epName += `-${partNum}`
          if (baseLang === 'en') epName += '-en'
          totalRenames += await migrateEpisode(epName)
        }
      }
    }
  }

  console.log(`\n합계: ${totalRenames}개 파일 리네임 ${applyMode ? '완료' : '예정'}`)
  if (!applyMode && totalRenames > 0) {
    console.log('실제 적용: npx tsx scripts/voice/migrate-voice-names.ts --apply')
  }
}

main().catch(console.error)
