/**
 * 세력도감 인물 음원 재배치 코어 — 서버 전용, 인증 밖.
 *
 * 음원 파일명은 "인물 자리"(F{세력}C{묶음}P{인물}-quote.wav) 기반이라, 편집기에서 인물 순서를
 * 바꾸면 그 자리의 옛 음원이 그대로 남아 다른 인물 목소리가 재생된다. 이 함수가 순서 변경에 맞춰
 * voice/ 안에서 음원 파일을 안전하게 옮긴다.
 *
 * 음원만이 아니다. 그 음원에서 뽑은 **발화 시각 산출물의 이름표도 같은 대응으로 옮긴다**:
 *   - `data.timing.p<N>.<lang>.json` (최상위 키 = 파일명에서 확장자를 뗀 이름)
 *   - `voice/2-word-timings.json` (targets 하위 키)
 * 셋 중 하나만 옮기면 음성과 자막이 서로 다른 인물을 가리킨다 — 이 단계의 최대 위험이다.
 *
 * 창구(`api/faction/voice/[episode]/reorder`)는 사람 확인만 하고 이 함수를 부른다.
 * 창구 안에 두면 Next 밖에서 부를 수 없어 검증이 불가능하다.
 */

import { rename, readFile, writeFile, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { factionVoiceDir } from './faction-paths'

export type FactionRenamePair = { from: string; to: string }

export interface ReorderResult {
  /** 사람이 읽을 수 있는 처리 내역 */
  moved: string[]
  /** 개별 실패 — 전체를 중단시키지 않는다(음원 하나가 잠겨도 나머지는 옮겨야 한다) */
  errors: string[]
}

/**
 * 파일명이 안전한지 — 경로 구분자·상위 이동·절대경로 거부. basename 과 같아야 통과.
 * 이 값이 그대로 파일 경로가 되므로 여기서 막지 않으면 폴더 밖을 건드릴 수 있다.
 */
export function isSafeVoiceFilename(f: unknown): f is string {
  if (typeof f !== 'string' || !f) return false
  if (f.includes('..')) return false
  if (f.includes('/') || f.includes('\\')) return false
  if (path.isAbsolute(f)) return false
  if (path.basename(f) !== f) return false
  return true
}

/** 요청에서 실제로 처리할 항목만 걸러낸다 */
export function sanitizeRenames(list: unknown): FactionRenamePair[] {
  if (!Array.isArray(list)) return []
  return list.filter(
    (r): r is FactionRenamePair =>
      !!r && isSafeVoiceFilename(r.from) && isSafeVoiceFilename(r.to) && r.from !== r.to,
  )
}

/**
 * 음원과 발화 시각 이름표를 함께 옮긴다.
 *
 * @param episode 에피소드 폴더명
 * @param renames 옮길 목록. from/to 집합이 겹칠 수 있다(자리 맞바꾸기는 항상 겹친다).
 */
export async function reorderFactionVoiceFiles(
  episode: string,
  renames: FactionRenamePair[],
): Promise<ReorderResult> {
  const dir = factionVoiceDir(episode)
  const moved: string[] = []
  const errors: string[] = []

  // from/to 집합이 겹치므로 항상 임시명 경유 2단계로 처리한다.
  const tmpSuffix = `.__reorder_tmp_${Date.now()}`

  // 1단계 — 옮길 파일을 먼저 임시명으로 피신(없는 파일은 건너뜀 = 음원 미생성 인물)
  const staged: FactionRenamePair[] = []
  for (const { from, to } of renames) {
    const src = path.join(dir, from)
    if (!existsSync(src)) continue
    try {
      await rename(src, path.join(dir, `${from}${tmpSuffix}`))
      staged.push({ from, to })
    } catch (e) {
      errors.push(`stage1 ${from}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // 2단계 — 임시명 → 최종 이름
  for (const { from, to } of staged) {
    try {
      await rename(path.join(dir, `${from}${tmpSuffix}`), path.join(dir, to))
      moved.push(`${from} → ${to}`)
    } catch (e) {
      errors.push(`stage2 ${from}→${to}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // ── 발화 시각 산출물의 이름표도 음원과 똑같이 옮긴다 ──
  const stemMap: Record<string, string> = {}
  for (const { from, to } of renames) {
    stemMap[from.replace(/\.wav$/i, '')] = to.replace(/\.wav$/i, '')
  }
  const stemFrom = new Set(Object.keys(stemMap))

  /**
   * 음원 이동과 같은 의미로 키를 옮긴다.
   *   - 있는 키만 옮긴다(없으면 옛 대상 키 값을 보존 — 음원 건너뜀과 정합)
   *   - 옮겨간 원본 키는 지운다
   *   - 최상위 키는 정렬한다(파일 비교 안정)
   */
  function remapStemKeys(obj: Record<string, unknown>): { result: Record<string, unknown>; changed: boolean } {
    const stagedKeys: Record<string, unknown> = {}
    for (const k of stemFrom) if (k in obj) stagedKeys[stemMap[k]] = obj[k]
    const stagedTo = new Set(Object.keys(stagedKeys))
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (stemFrom.has(k) || stagedTo.has(k)) continue
      out[k] = v
    }
    Object.assign(out, stagedKeys)
    const sorted: Record<string, unknown> = {}
    for (const k of Object.keys(out).sort()) sorted[k] = out[k]
    return { result: sorted, changed: Object.keys(stagedKeys).length > 0 }
  }

  const epDir = path.dirname(dir)

  // data.timing.*.json — 편별·언어별 전부
  try {
    const files = (await readdir(epDir)).filter(f => /^data\.timing\..*\.json$/.test(f))
    for (const f of files) {
      const fp = path.join(epDir, f)
      try {
        const data = JSON.parse(await readFile(fp, 'utf8')) as Record<string, unknown>
        const { result, changed } = remapStemKeys(data)
        if (changed) {
          await writeFile(fp, JSON.stringify(result, null, 2) + '\n', 'utf8')
          moved.push(`${f} 키 재배치`)
        }
      } catch (e) {
        errors.push(`timing ${f}: ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  } catch { /* 에피소드 폴더 없음 — 건너뜀 */ }

  // voice/2-word-timings.json — targets 하위 키
  const wtPath = path.join(dir, '2-word-timings.json')
  if (existsSync(wtPath)) {
    try {
      const wt = JSON.parse(await readFile(wtPath, 'utf8')) as { targets?: Record<string, unknown> }
      if (wt.targets) {
        const { result, changed } = remapStemKeys(wt.targets)
        if (changed) {
          wt.targets = result
          await writeFile(wtPath, JSON.stringify(wt, null, 2) + '\n', 'utf8')
          moved.push('2-word-timings 키 재배치')
        }
      }
    } catch (e) {
      errors.push(`2-word-timings: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return { moved, errors }
}
