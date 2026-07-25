import { NextResponse } from 'next/server'
import { rename, readFile, writeFile, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { factionVoiceDir } from '@/lib/faction-paths'
import { guardFactionRoute } from '@/lib/faction-route'

// ── 세력도 인물 음원 재배치(자리 맞바꾸기)
//
// 음원 파일명은 "인물 자리"(F{세력}C{묶음}P{인물}-quote.wav) 기반이라, 편집기에서 인물 순서를
// 바꾸면 그 자리의 옛 음원이 그대로 남아 다른 인물 목소리가 재생된다. 이 창구가 인물 순서 변경에
// 맞춰 voice/ 안에서 음원 파일을 안전하게 재배치한다.
//
// 음원뿐 아니라 그 음원에서 뽑은 발화 시각 산출물의 이름표도 같은 대응으로 옮긴다:
//   - data.timing.p<N>.<lang>.json (최상위 키 = 파일명에서 확장자를 뗀 이름)
//   - voice/2-word-timings.json (targets 하위 키)
// 이걸 안 하면 순서를 바꾼 뒤 발화 시각이 옛 자리에 남아 자막 페이지 전환·글자 점등이 어긋난다.
// ⚠ 이 세 곳을 함께 옮기는 것이 이 단계의 최대 위험(문서 §11 R2)이다. 셋 중 하나만 옮기면
//   음성과 자막이 서로 다른 인물을 가리킨다.
//
// 요청 body:
//   { renames: Array<{ from: string, to: string }> }
//     - from/to 는 파일명(예: 'F01C01P01-quote.wav'). 폴더 경로 없이 파일명 전체.
//     - from 과 to 집합이 겹칠 수 있으므로(자리 맞바꾸기는 항상 겹침) 임시명 경유 2단계 처리.
//   - 파일이 없으면 그 항목은 조용히 건너뛴다(에러 아님 — 음원 미생성 인물).
//   - 경로 이탈 방어: '..' 또는 절대경로·경로 구분자가 들어오면 그 항목만 건너뛴다.

type RenamePair = { from: string; to: string }

// 안전한 파일명인지 — 경로 구분자·상위 이동·절대경로 거부. basename 과 같아야 통과.
function isSafeFile(f: unknown): f is string {
  if (typeof f !== 'string' || !f) return false
  if (f.includes('..')) return false
  if (f.includes('/') || f.includes('\\')) return false
  if (path.isAbsolute(f)) return false
  if (path.basename(f) !== f) return false
  return true
}

export async function POST(req: Request, { params }: { params: Promise<{ episode: string }> }) {
  const denied = await guardFactionRoute()
  if (denied) return denied

  const { episode } = await params

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

  // from/to 집합이 겹치므로(자리 맞바꾸기) 항상 임시명 경유 2단계로 처리한다.
  const tmpSuffix = `.__reorder_tmp_${Date.now()}`

  // 1단계 — 옮길 파일을 먼저 임시명으로 피신(없는 파일은 건너뜀)
  const staged: RenamePair[] = []
  for (const { from, to } of renames) {
    const src = path.join(dir, from)
    if (!existsSync(src)) continue // 음원 미생성 인물
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

  // ── 발화 시각 산출물의 이름표도 음원과 똑같이 이동 ──
  const stemMap: Record<string, string> = {}
  for (const { from, to } of renames) {
    stemMap[from.replace(/\.wav$/i, '')] = to.replace(/\.wav$/i, '')
  }
  const stemFrom = new Set(Object.keys(stemMap))

  // 음원 이동과 같은 의미로 키를 옮긴다:
  //   - 있는 from 키만 to 로 이동(없으면 옛 to 값 보존 — 음원 건너뜀과 정합)
  //   - 옮겨간 원본 키 제거, 덮어쓸 대상 키는 이동분이 채운다
  //   - 최상위 키는 정렬(비교 안정)
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

  return NextResponse.json({ moved, errors })
}
