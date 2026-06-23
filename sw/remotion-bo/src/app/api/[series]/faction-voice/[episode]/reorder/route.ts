import { NextResponse } from 'next/server'
import { rename, readFile, writeFile, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { isValidSeries, isFactionSeries } from '@/lib/series-registry'
import { factionVoiceDir } from '@/lib/faction-utils'

// ── 세력도 인물 음원 재배치(swap) 라우트
//
// 음원 파일명은 "인물 위치"(F{세력}C{묶음}P{인물}-quote.wav) 기반이라, 편집기에서 인물 순서를
// 바꾸면 그 자리의 옛 음원이 그대로 남아 다른 인물 목소리가 재생된다. 이 라우트가 인물 순서 변경에
// 맞춰 voice/ 디렉토리 안에서 음원 파일을 안전하게 재배치한다.
//
// 음원뿐 아니라 그 음원에서 뽑은 발화 시각 산출물의 stem 키도 같은 매핑으로 옮긴다:
//   - data.timing.p<N>.<lang>.json (최상위 키 = stem)
//   - voice/2-word-timings.json (targets 하위 키 = stem)
// 이걸 안 하면 인물 순서를 바꾼 뒤 발화 시각이 옛 자리에 남아 자막 페이지 전환·글자 점등이 어긋난다.
//
// 음원은 public/factions/{episode}/voice/ 에 flat 하게 놓인다(엔진 하위 디렉토리 없음).
// 기존 /voice/rename 라우트는 episodes/{person}/voice/{engine}/ 구조 전제라 세력도엔 맞지 않다.
//
// 요청 body:
//   { renames: Array<{ from: string, to: string }> }
//     - from/to 는 파일명(예: 'F01C01P01-quote.wav'). 디렉토리 경로·확장자 포함 전체 파일명.
//     - from 과 to 집합이 겹칠 수 있으므로(swap 은 항상 겹침) 임시명 경유 2단계 처리.
//   - 파일이 없으면 그 항목은 조용히 skip(에러 아님).
//   - path traversal 방어: '..' 또는 절대경로·경로 구분자가 들어오면 그 항목만 건너뛴다.

type RenamePair = { from: string; to: string }

// 안전한 파일명인지 — 경로 구분자·상위 이동·절대경로 거부. basename 과 동일해야 통과.
function isSafeFile(f: unknown): f is string {
  if (typeof f !== 'string' || !f) return false
  if (f.includes('..')) return false
  if (f.includes('/') || f.includes('\\')) return false
  if (path.isAbsolute(f)) return false
  if (path.basename(f) !== f) return false
  return true
}

export async function POST(req: Request, { params }: { params: Promise<{ series: string; episode: string }> }) {
  const { series, episode } = await params
  if (!isValidSeries(series) || !isFactionSeries(series)) {
    return NextResponse.json({ error: 'invalid series' }, { status: 404 })
  }

  let body: { renames?: RenamePair[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 })
  }

  const renames = (body.renames ?? []).filter(
    r => r && isSafeFile(r.from) && isSafeFile(r.to) && r.from !== r.to,
  )
  if (renames.length === 0) {
    return NextResponse.json({ error: '유효한 renames 가 필요하다' }, { status: 400 })
  }

  const ep = decodeURIComponent(episode)
  const dir = factionVoiceDir(ep)

  const moved: string[] = []
  const errors: string[] = []

  // from/to 집합이 겹치므로(swap) 항상 임시명 경유 2단계로 처리한다.
  // 1단계: 존재하는 from → from + 임시 suffix
  // 2단계: 임시 → to
  const tmpSuffix = `.__reorder_tmp_${Date.now()}`

  // 1단계 — 옮길 파일을 먼저 임시명으로 피신(없는 파일은 skip)
  const staged: RenamePair[] = []
  for (const { from, to } of renames) {
    const src = path.join(dir, from)
    if (!existsSync(src)) continue // 음원 미생성 인물 — 조용히 skip
    const tmp = path.join(dir, `${from}${tmpSuffix}`)
    try {
      await rename(src, tmp)
      staged.push({ from, to })
    } catch (e) {
      errors.push(`stage1 ${from}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // 2단계 — 임시명 → 최종 to
  for (const { from, to } of staged) {
    const tmp = path.join(dir, `${from}${tmpSuffix}`)
    const dst = path.join(dir, to)
    try {
      await rename(tmp, dst)
      moved.push(`${from} → ${to}`)
    } catch (e) {
      errors.push(`stage2 ${from}→${to}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  // ── 발화 시각 산출물의 stem 키도 음원과 동일하게 이동 ──
  // 파일명(F..-quote.wav)에서 확장자를 뗀 stem(F..-quote)이 타이밍 파일의 키다.
  const stemMap: Record<string, string> = {}
  for (const { from, to } of renames) {
    stemMap[from.replace(/\.wav$/i, '')] = to.replace(/\.wav$/i, '')
  }
  const stemFrom = new Set(Object.keys(stemMap))

  // 음원 rename(staged)과 같은 의미로 키를 옮긴다:
  //   - obj 에 있는 from 키만 to 로 이동(없으면 옛 to 값 보존 — 음원 skip 과 정합)
  //   - 옮겨간 원본 키 제거, 덮어쓸 대상 키는 staged 가 채움
  //   - 최상위 키는 stem 정렬(diff 안정)
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
  } catch { /* 에피소드 디렉토리 없음 — skip */ }

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

  return NextResponse.json({ moved, errors })
}
