/**
 * migrate-voice-names.ts — 음성 파일명 마이그레이션
 *
 * 알파벳 순 = 재생 순서가 되도록 파일명을 변경한다.
 *
 * Usage:
 *   npx tsx scripts/migrate-voice-names.ts                    # dry run
 *   npx tsx scripts/migrate-voice-names.ts --apply            # 실제 적용
 *   npx tsx scripts/migrate-voice-names.ts --episode elon-musk  # 특정 에피소드만
 */
import { readdir, readFile, writeFile, rename, stat } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { oldToNew, vnTimingKey } from '../src/compositions/BookRecommend/voice-names'
import type { BookRecommendScript } from '../src/compositions/BookRecommend/types'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const VOICE_DIR = path.join(ROOT, 'public', 'voice')
const EPISODES_DIR = path.join(ROOT, 'episodes', 'book-recommend')

// --- CLI ---
const args = process.argv.slice(2)
const applyMode = args.includes('--apply')
const epIdx = args.indexOf('--episode')
const epFilter = epIdx >= 0 ? args[epIdx + 1] : null

type RenameEntry = { old: string; new: string; dir: string }

async function loadEpisode(name: string): Promise<BookRecommendScript | null> {
  try {
    const raw = await readFile(path.join(EPISODES_DIR, `${name}.json`), 'utf-8')
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
  const epVoiceDir = path.join(VOICE_DIR, epName)

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
    const rel = path.relative(VOICE_DIR, r.dir)
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

  // r2-manifest.json 키 변경
  const r2ManifestPath = path.join(epVoiceDir, 'r2-manifest.json')
  let r2Manifest: Record<string, unknown> | null = null
  const r2Renames: { old: string; new: string }[] = []
  try {
    const raw = await readFile(r2ManifestPath, 'utf-8')
    r2Manifest = JSON.parse(raw)
    if (r2Manifest) {
      for (const oldKey of Object.keys(r2Manifest)) {
        // oldKey can be "book-0-title.wav" or "gemini/book-0-title.wav"
        const parts = oldKey.split('/')
        const fileName = parts[parts.length - 1]
        const prefix = parts.length > 1 ? parts.slice(0, -1).join('/') + '/' : ''
        const newFileName = oldToNew(fileName, bookCount, shortSegments)
        if (newFileName && newFileName !== fileName) {
          r2Renames.push({ old: oldKey, new: prefix + newFileName })
        }
      }
      if (r2Renames.length > 0) {
        console.log(`  r2-manifest.json 키 ${r2Renames.length}개 변경`)
      }
    }
  } catch { /* no manifest */ }

  console.log(`  합계: 파일 ${renames.length}개, voiceTimings ${timingRenames.length}개, r2-manifest ${r2Renames.length}개`)

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
    const epJsonPath = path.join(EPISODES_DIR, `${epName}.json`)
    await writeFile(epJsonPath, JSON.stringify(episode, null, 2) + '\n', 'utf-8')
    console.log(`  -> ${epName}.json voiceTimings 갱신 완료`)
  }

  // 3. r2-manifest.json 키 갱신
  if (r2Renames.length > 0 && r2Manifest) {
    for (const r of r2Renames) {
      r2Manifest[r.new] = r2Manifest[r.old]
      delete r2Manifest[r.old]
    }
    await writeFile(r2ManifestPath, JSON.stringify(r2Manifest, null, 2) + '\n', 'utf-8')
    console.log(`  -> r2-manifest.json 갱신 완료`)
  }

  return renames.length
}

async function main() {
  console.log(applyMode ? '*** APPLY 모드 — 실제 변경 적용 ***' : '*** DRY RUN — 변경 미적용 ***')

  let totalRenames = 0

  if (epFilter) {
    totalRenames = await migrateEpisode(epFilter)
  } else {
    // 모든 에피소드
    const entries = await readdir(VOICE_DIR)
    for (const entry of entries) {
      if (entry === 'common') continue
      const s = await stat(path.join(VOICE_DIR, entry)).catch(() => null)
      if (!s?.isDirectory()) continue
      totalRenames += await migrateEpisode(entry)
    }
  }

  console.log(`\n합계: ${totalRenames}개 파일 리네임 ${applyMode ? '완료' : '예정'}`)
  if (!applyMode && totalRenames > 0) {
    console.log('실제 적용: npx tsx scripts/migrate-voice-names.ts --apply')
  }
}

main().catch(console.error)
