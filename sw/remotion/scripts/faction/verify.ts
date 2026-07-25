/**
 * verify.ts — 팩션 DB 왕복 검증 5종
 *
 * 사용:
 *   pnpm faction:verify -- --episode AI-Supremacy
 *   pnpm faction:verify -- --all
 *
 * 원본 faction-data.json 과 「DB 왕복(import → export)」 결과가 **렌더 결과까지 동일**한지 본다.
 * 단순 JSON 비교로는 부족하다 — 필드가 살아도 컷 길이·음성 파일명·자막이 어긋나면 영상이 바뀐다.
 * 그래서 렌더 측 함수를 직접 import 해 같은 입력으로 돌려 대조한다(로직 복제 없음).
 *
 *  ① 정규화 JSON 비교   원본 ≡ 왕복 (키순 무시·부재/빈값 동일시·음성 길이 2자리). 불일치는 JSON Pointer 전량 출력
 *  ② 영상 종류          factionVariants 의 fileSuffix 집합 동일 (편 분할·롱폼 편 경계가 안 흔들렸나)
 *  ③ 컷 길이            analyzeTiming.totalFrames 가 전 종류에서 일치 (영상 길이 불변)
 *  ④ 음성 잡            buildVoiceJobs 의 file·text·chunks 완전 일치 (음원 파일명·합성 텍스트 불변)
 *  ⑤ 자막               buildFactionSubs → subsToSrt 결과 바이트 동일
 *  ⑥ 한글 무결          왕복 결과에 U+FFFD(치환문자)가 없나
 *
 * 등록 에피소드(_episodes.json)는 전 항목을, 미등록분은 ①·⑥ 을 기준으로 판정한다.
 */

import { diffPointers, findReplacementChars } from '@feelandnote/shared/lib/faction-schema'
import { factionVariants } from '@feelandnote/shared/lib/youtube-faction-meta'
import { readdirSync, readFileSync } from 'fs'
import path from 'path'
import { adminClient, readFactionData, parseArgs, selectEpisodes, pad } from './lib.js'
import { exportEpisode } from './export.js'

import { analyzeTiming } from '../../src/compositions/Faction/timing.js'
import { buildFactionSubs } from '../../src/compositions/Faction/subs.js'
import { vnPersonQuote, vnTimingKey, clampRate } from '../../src/compositions/Faction/voice-names.js'
import { subsToSrt } from '../srt/srt-builder.js'

/**
 * 음성 잡 빌더는 CLI 모듈(voice/faction/cli.ts)을 물고 있고, 그 모듈이 로드 시각에 argv 를
 * 파싱해 `--episode` 가 없으면 process.exit(1) 한다. 원본을 고치지 않기 위해
 * **argv 를 잠시 바꿔치기한 뒤 동적 import** 한다. 얻는 것은 LANG='ko' 고정이며,
 * buildVoiceJobs 는 script 를 인자로 받으므로 DATA_PATH 에 의존하지 않는다(전 편에 재사용 가능).
 */
async function loadVoiceJobBuilder() {
  const saved = process.argv
  process.argv = [saved[0], 'faction-verify', '--episode', 'shim']
  try {
    const mod = await import('../voice/faction/data.js')
    return mod.buildVoiceJobs
  } finally {
    process.argv = saved
  }
}

type Script = Record<string, unknown>
type Any = Record<string, unknown>

/* ── 발화 시각 glue — faction-srt.ts main() 과 같은 절차 ──
 * ⚠ 이 glue 는 원본·왕복 **양쪽에 똑같이** 적용된다. 따라서 glue 자체가 정확하지 않더라도
 *   비교의 타당성은 유지된다(차이는 오직 왕복에서만 나온다). 배속(quotePlaybackRate)은
 *   data jsonb 로 왕복하므로 스케일 결과도 양쪽이 같아야 한다. */
function loadVoiceTimings(episodeDir: string): Any {
  const merged: Any = {}
  for (const fn of readdirSync(episodeDir)) {
    if (/^data\.timing(\.p\d+)?\.ko\.json$/.test(fn)) {
      Object.assign(merged, JSON.parse(readFileSync(path.join(episodeDir, fn), 'utf-8')) as Any)
    }
  }
  return merged
}

const scaleSegs = (segs: Any[], rate: number): Any[] =>
  segs.map(s => ({
    ...s,
    start: ((s.start as number) ?? 0) / rate,
    end: ((s.end as number) ?? 0) / rate,
    subTimings: (s.subTimings as number[] | undefined)?.map(t => t / rate),
    words: (s.words as Any[] | undefined)?.map(w => ({
      ...w, start: (w.start as number) / rate, end: (w.end as number) / rate,
    })),
  }))

function scaleVoiceTimings(script: Script, vt: Any): Any {
  let out: Any | undefined
  const groups = (script.groups ?? []) as Any[]
  groups.forEach((g, gi) => {
    if (g.disabled) return
    ;((g.clusters ?? []) as Any[]).forEach((c, ci) => {
      ;((c.people ?? []) as Any[]).forEach((p, pi) => {
        const stem = vnTimingKey(vnPersonQuote(gi, pi, ci))
        const rate = clampRate(p.quotePlaybackRate as number | undefined)
        if (rate === 1 || !vt[stem]) return
        if (!out) out = { ...vt }
        out[stem] = scaleSegs(vt[stem] as Any[], rate)
      })
    })
  })
  return out ?? vt
}

/* ────────────────────────── 검사 ────────────────────────── */

interface Check { ok: boolean; note: string; details: string[] }
const pass = (note = ''): Check => ({ ok: true, note, details: [] })
const fail = (note: string, details: string[] = []): Check => ({ ok: false, note, details })

/** ① 정규화 JSON 비교 */
function checkJson(original: Script, roundtrip: Script): Check {
  const diffs = diffPointers(original, roundtrip)
  return diffs.length === 0 ? pass() : fail(`불일치 ${diffs.length}곳`, diffs)
}

/** ⑥ 한글 무결 — U+FFFD 검사 */
function checkEncoding(roundtrip: Script): Check {
  const hits = findReplacementChars(roundtrip)
  return hits.length === 0 ? pass() : fail(`치환문자 ${hits.length}곳`, hits)
}

/** ② 영상 종류(fileSuffix) 집합 동일 */
function checkVariants(original: Script, roundtrip: Script): Check {
  const a = factionVariants(
    (original.groups ?? []) as never[], original.longformLayout as never[] | undefined,
  ).map(v => v.fileSuffix)
  const b = factionVariants(
    (roundtrip.groups ?? []) as never[], roundtrip.longformLayout as never[] | undefined,
  ).map(v => v.fileSuffix)
  const sa = [...a].sort().join(',')
  const sb = [...b].sort().join(',')
  return sa === sb ? pass(`${a.length}종`) : fail('종류 불일치', [`원본 [${sa}]`, `왕복 [${sb}]`])
}

/** ③ 컷 길이 — 영상 종류마다 totalFrames 대조 */
function checkTiming(original: Script, roundtrip: Script): Check {
  const variants = factionVariants(
    (original.groups ?? []) as never[], original.longformLayout as never[] | undefined,
  )
  const details: string[] = []
  for (const v of variants) {
    const ra = analyzeTiming(original as never, v.isShorts, v.part, v.lvPart)
    const rb = analyzeTiming(roundtrip as never, v.isShorts, v.part, v.lvPart)
    if (ra.totalFrames !== rb.totalFrames) {
      details.push(`${v.fileSuffix}: ${ra.totalFrames} ≠ ${rb.totalFrames} 프레임`)
    }
    if (ra.cueCount !== rb.cueCount) {
      details.push(`${v.fileSuffix}: 컷 수 ${ra.cueCount} ≠ ${rb.cueCount}`)
    }
  }
  return details.length === 0 ? pass(`${variants.length}종`) : fail(`불일치 ${details.length}건`, details)
}

/** ④ 음성 잡 — file·text·chunks 완전 일치 */
function checkVoiceJobs(
  original: Script, roundtrip: Script,
  build: (s: never, part?: number) => { file: string; text: string; chunks: string[] }[],
): Check {
  const parts: (number | undefined)[] = [undefined]
  for (const v of factionVariants((original.groups ?? []) as never[], original.longformLayout as never[] | undefined)) {
    if (v.isShorts && v.part != null) parts.push(v.part)
  }
  const details: string[] = []
  let compared = 0
  for (const part of parts) {
    const ja = build(original as never, part)
    const jb = build(roundtrip as never, part)
    const label = part == null ? '전체' : `p${part}`
    if (ja.length !== jb.length) {
      details.push(`${label}: 잡 수 ${ja.length} ≠ ${jb.length}`)
      continue
    }
    compared += ja.length
    for (let i = 0; i < ja.length; i++) {
      const a = ja[i], b = jb[i]
      if (a.file !== b.file) details.push(`${label}[${i}] file: ${a.file} ≠ ${b.file}`)
      if (a.text !== b.text) details.push(`${label}[${i}] (${a.file}) text 불일치`)
      if (JSON.stringify(a.chunks) !== JSON.stringify(b.chunks)) {
        details.push(`${label}[${i}] (${a.file}) chunks 불일치`)
      }
    }
  }
  return details.length === 0 ? pass(`${compared}건`) : fail(`불일치 ${details.length}건`, details)
}

/** ⑤ 자막 SRT 바이트 동일 */
function checkSrt(original: Script, roundtrip: Script, episodeDir: string): Check {
  const vt = loadVoiceTimings(episodeDir)
  // 발화 시각을 각 스크립트의 배속으로 스케일해 주입(로더와 동일 절차)
  const a: Script = { ...original, voiceTimings: scaleVoiceTimings(original, vt) }
  const b: Script = { ...roundtrip, voiceTimings: scaleVoiceTimings(roundtrip, vt) }
  const variants = factionVariants(
    (original.groups ?? []) as never[], original.longformLayout as never[] | undefined,
  )
  const details: string[] = []
  for (const v of variants) {
    const sa = subsToSrt(buildFactionSubs(a as never, v.isShorts, v.part, v.lvPart))
    const sb = subsToSrt(buildFactionSubs(b as never, v.isShorts, v.part, v.lvPart))
    if (sa !== sb) {
      details.push(`${v.fileSuffix}: SRT 불일치 (${sa.length} vs ${sb.length} 바이트)`)
    }
  }
  return details.length === 0 ? pass(`${variants.length}종`) : fail(`불일치 ${details.length}건`, details)
}

/* ────────────────────────── main ────────────────────────── */

const USAGE = '사용: pnpm faction:verify -- (--episode <폴더명> | --all)'
const LABELS = ['①JSON', '②종류', '③길이', '④음성', '⑤자막', '⑥한글']

async function main() {
  const args = parseArgs(process.argv, USAGE)
  const eps = selectEpisodes(args)
  const db = adminClient()
  const buildVoiceJobs = await loadVoiceJobBuilder()

  const rows: { folder: string; registered: boolean; checks: Check[] }[] = []

  for (const ep of eps) {
    const original = readFactionData(ep.dataPath)
    let roundtrip: Script
    try {
      roundtrip = await exportEpisode(db, ep.folder, original)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      rows.push({ folder: ep.folder, registered: ep.registered, checks: LABELS.map(() => fail(`export 실패: ${msg}`)) })
      console.log(`  ✗ ${pad(ep.folder, 24)} export 실패 — ${msg}`)
      continue
    }

    const checks: Check[] = [
      checkJson(original, roundtrip),
      checkVariants(original, roundtrip),
      checkTiming(original, roundtrip),
      checkVoiceJobs(original, roundtrip, buildVoiceJobs as never),
      checkSrt(original, roundtrip, ep.dir),
      checkEncoding(roundtrip),
    ]
    rows.push({ folder: ep.folder, registered: ep.registered, checks })

    const mark = checks.map((c, i) => `${LABELS[i]}${c.ok ? '✓' : '✗'}`).join(' ')
    console.log(`  ${checks.every(c => c.ok) ? '✓' : '✗'} ${pad(ep.folder, 24)}${ep.registered ? '[등록]' : '     '} ${mark}`)
    for (const [i, c] of checks.entries()) {
      if (c.ok) continue
      console.log(`      ${LABELS[i]} ${c.note}`)
      for (const d of c.details.slice(0, 40)) console.log(`        · ${d}`)
      if (c.details.length > 40) console.log(`        … 외 ${c.details.length - 40}건`)
    }
  }

  // ── 요약표 ──
  console.log('\n── 검증 결과표 ──')
  console.log(`${pad('에피소드', 26)}${pad('등록', 6)}${LABELS.map(l => pad(l, 8)).join('')}`)
  for (const r of rows) {
    console.log(
      pad(r.folder, 26) + pad(r.registered ? 'O' : '-', 6) +
      r.checks.map(c => pad(c.ok ? '✓' : '✗', 8)).join(''),
    )
  }

  // 등록분은 전 항목, 미등록분은 ①·⑥ 을 기준으로 판정한다
  const REQUIRED_UNREGISTERED = [0, 5]
  const failedRegistered = rows.filter(r => r.registered && r.checks.some(c => !c.ok))
  const failedUnregistered = rows.filter(r => !r.registered && REQUIRED_UNREGISTERED.some(i => !r.checks[i].ok))

  console.log('')
  console.log(`등록 ${rows.filter(r => r.registered).length}편 — 5종 전부 통과 ${rows.filter(r => r.registered).length - failedRegistered.length}편, 실패 ${failedRegistered.length}편`)
  console.log(`미등록 ${rows.filter(r => !r.registered).length}편 — ①·⑥ 통과 ${rows.filter(r => !r.registered).length - failedUnregistered.length}편, 실패 ${failedUnregistered.length}편`)

  if (failedRegistered.length || failedUnregistered.length) process.exitCode = 1
  else console.log('\n왕복 검증 전량 통과.')
}

main().catch(e => {
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})
