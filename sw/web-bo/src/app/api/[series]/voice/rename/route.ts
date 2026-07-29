import { NextResponse } from 'next/server'
import { readFile, writeFile, rename, mkdir, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { voiceDir, parseEpisodeId, findEpisodeDir, isNewLayout } from '@/features/book-recommend/lib/server-utils'
import { isValidSeries } from '@/features/book-recommend/lib/series-registry'

/**
 * 음성 식별자(sectionKey) 일괄 rename.
 *
 *   body: { episode: string, renames: Array<{ from: string, to: string }> }
 *
 * 처리 대상:
 *   1) 모든 엔진 디렉토리(gemini / elevenlabs / common / fallback) 내 `{from}.wav` → `{to}.wav`
 *   2) 레이아웃에 맞는 timing JSON의 `voiceTimings` 키 일괄 갱신
 *   3) `voice-select.json` 의 `slots` 키 일괄 갱신 (`{from}.wav` → `{to}.wav`)
 *
 * 충돌 회피: from 집합과 to 집합이 겹치는 경우(예: S01↔S02 swap, S01→S02 이동) 두 단계로 처리한다.
 *   - 단계 1: from → from + 임시 suffix
 *   - 단계 2: 임시 → to
 *
 * path traversal 방지: from/to 에 `..` 또는 절대경로가 들어오면 그 항목만 건너뛴다.
 */
type RenamePair = { from: string; to: string }

function isSafeKey(k: string): boolean {
  if (typeof k !== 'string' || !k) return false
  if (k.includes('..')) return false
  if (path.isAbsolute(k)) return false
  return true
}

export async function POST(req: Request, { params }: { params: Promise<{ series: string }> }) {
  const { series } = await params
  if (!isValidSeries(series)) return NextResponse.json({ error: 'invalid series' }, { status: 404 })

  let body: { episode?: string; renames?: RenamePair[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const episode = body.episode?.trim()
  const renames = (body.renames ?? []).filter(r => r && isSafeKey(r.from) && isSafeKey(r.to) && r.from !== r.to)
  if (!episode || renames.length === 0) {
    return NextResponse.json({ error: 'episode + 유효한 renames 가 필요하다' }, { status: 400 })
  }

  const base = voiceDir(episode)
  const moved: string[] = []
  const errors: string[] = []

  // 엔진 디렉토리 탐색 — voice-select.json·기타 파일은 디렉토리가 아니므로 자동 제외
  const engines: string[] = []
  if (existsSync(base)) {
    try {
      const ents = await readdir(base, { withFileTypes: true })
      for (const e of ents) {
        if (!e.isDirectory()) continue
        if (e.name.startsWith('.') || e.name.startsWith('_')) continue
        engines.push(e.name)
      }
    } catch (e) {
      errors.push(`voiceDir 읽기 실패: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // 충돌 회피 필요 여부
  const fromSet = new Set(renames.map(r => r.from))
  const needsStaging = renames.some(r => fromSet.has(r.to))
  const tmpSuffix = `.__rename_tmp_${Date.now()}`

  if (needsStaging) {
    for (const engine of engines) {
      for (const { from } of renames) {
        const src = path.join(base, engine, `${from}.wav`)
        if (!existsSync(src)) continue
        const dst = path.join(base, engine, `${from}.wav${tmpSuffix}`)
        try {
          await mkdir(path.dirname(dst), { recursive: true })
          await rename(src, dst)
        } catch (e) {
          errors.push(`stage1 ${engine}/${from}: ${e instanceof Error ? e.message : String(e)}`)
        }
      }
    }
  }

  for (const engine of engines) {
    for (const { from, to } of renames) {
      const src = needsStaging
        ? path.join(base, engine, `${from}.wav${tmpSuffix}`)
        : path.join(base, engine, `${from}.wav`)
      if (!existsSync(src)) continue
      const dst = path.join(base, engine, `${to}.wav`)
      try {
        await mkdir(path.dirname(dst), { recursive: true })
        await rename(src, dst)
        moved.push(`${engine}/${from}.wav → ${engine}/${to}.wav`)
      } catch (e) {
        errors.push(`stage2 ${engine}/${from}→${to}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  // timing.json 의 voiceTimings 키 갱신
  const { person, locale } = parseEpisodeId(episode)
  const found = findEpisodeDir(person)
  const timingPath = found
    ? path.join(found.dir, isNewLayout(found.dir) ? `meta.${locale}.timing.json` : `${locale}.timing.json`)
    : null
  if (timingPath && existsSync(timingPath)) {
    try {
      const raw = await readFile(timingPath, 'utf-8')
      const j = JSON.parse(raw)
      if (j && typeof j === 'object' && j.voiceTimings && typeof j.voiceTimings === 'object') {
        const map = new Map(renames.map(r => [r.from, r.to]))
        const renamed: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(j.voiceTimings)) {
          renamed[map.get(k) ?? k] = v
        }
        j.voiceTimings = renamed
        await writeFile(timingPath, JSON.stringify(j, null, 2) + '\n', 'utf-8')
      }
    } catch (e) {
      errors.push(`timing.json: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // voice-select.json 의 slots 키 갱신
  const vsPath = path.join(base, 'voice-select.json')
  if (existsSync(vsPath)) {
    try {
      const raw = await readFile(vsPath, 'utf-8')
      const j = JSON.parse(raw)
      if (j && typeof j === 'object' && j.slots && typeof j.slots === 'object') {
        const map = new Map(renames.map(r => [`${r.from}.wav`, `${r.to}.wav`]))
        const renamed: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(j.slots)) {
          renamed[map.get(k) ?? k] = v
        }
        j.slots = renamed
        await writeFile(vsPath, JSON.stringify(j, null, 2) + '\n', 'utf-8')
      }
    } catch (e) {
      errors.push(`voice-select.json: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return NextResponse.json({ moved, errors })
}
