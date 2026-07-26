/**
 * verify.ts — 담화 DB 왕복 검증 7종 + 반증 시험
 *
 * 사용:
 *   pnpm discourse:verify -- --episode musk-altman
 *   pnpm discourse:verify -- --all
 *   pnpm discourse:verify -- --all --drift      # 파일 ↔ DB 대조만(쓰기 없음)
 *   pnpm discourse:verify -- --all --falsify    # 검증기가 실제로 잡는지 되묻는 반증 시험
 *
 * 세 파일을 합친 원본과 「DB 왕복(import → export)」 결과가 **렌더 결과까지 동일**한지 본다.
 * 단순 JSON 비교로는 부족하다 — 필드가 살아도 컷 길이·음성 파일명·자막이 어긋나면 영상이 바뀐다.
 * 그래서 렌더 측 함수를 직접 import 해 같은 입력으로 돌려 대조한다(로직 복제 없음).
 *
 *  ① 정규화 JSON   원본 ≡ 왕복 (키순 무시·부재/빈값 동일시·음성 길이 2자리). 불일치는 JSON Pointer 전량
 *  ② 세 파일 분해  cast·turns 가 메타 파일로 새지 않는 불변식 (discourse-utils.ts:95 와 같은 규칙)
 *  ③ 영상 종류     컴포지션 ID 집합 동일 (쇼츠 편·롱폼 편 경계가 안 흔들렸나)
 *  ④ 컷 길이       calcTotalFrames 가 전 종류에서 일치 (영상 길이 불변)
 *  ⑤ 컷 구성       buildCues 결과 완전 일치 (컷 종류·시작·길이)
 *  ⑥ 음성 계약     vnTurn/vnCastEpithet 파일명 + 합성 텍스트(turnText·epithet) 완전 일치
 *                  — **wav 0개인 지금 계약을 고정한다**(음성 착수 후에는 되돌릴 수 없다)
 *  ⑦ 자막·한글     buildDiscourseSubs → subsToSrt 바이트 동일 + 왕복 결과에 U+FFFD 없음
 */

import {
  diffPointers, findReplacementChars, splitDiscourseFiles,
} from '@feelandnote/shared/lib/discourse-schema'
import { readdirSync, readFileSync } from 'fs'
import path from 'path'
import { adminClient, readDiscourseData, parseArgs, selectEpisodes, pad, type EpisodeFolder } from './lib.js'
import { exportEpisode, inspectFiles } from './export.js'

import {
  buildCues, calcTotalFrames, turnText,
  shortsPartNumbers, longformPartNumbers,
} from '../../src/compositions/Discourse/timing.js'
import { buildDiscourseSubs } from '../../src/compositions/Discourse/subs.js'
import { vnTurn, vnCastEpithet, vnTimingKey, clampRate } from '../../src/compositions/Discourse/voice-names.js'
import type { DiscourseScript } from '../../src/compositions/Discourse/types.js'
import { subsToSrt } from '../srt/srt-builder.js'

type Script = Record<string, unknown>
type Any = Record<string, unknown>

/* ────────────────────────── 영상 종류 ────────────────────────── */

/**
 * 이 편이 만들어 내는 컴포지션 목록.
 *
 * ⚠ Root.tsx(:308~360)가 컴포지션을 다는 절차와 **같은 순서·같은 조건**이어야 한다.
 *   편 번호 산출(shortsPartNumbers·longformPartNumbers)과 길이 산출(calcTotalFrames)은
 *   렌더 측 함수를 그대로 부르므로 복제가 아니다. 남은 것은 이름 규칙뿐이다.
 *   Phase 3 에서 이 함수를 packages/shared 의 youtube-discourse-meta 로 올려
 *   Root.tsx 와 단일원천화한다(설계 §4 ③ · Root.tsx 의 TODO).
 */
interface Variant { fileSuffix: string; isShorts: boolean; part?: number; lvPart?: number }

function discourseVariants(script: DiscourseScript): Variant[] {
  const out: Variant[] = []
  for (const p of shortsPartNumbers(script)) {
    const dur = calcTotalFrames(script, true, p)
    if (!Number.isFinite(dur) || dur <= 0) continue
    out.push({ fileSuffix: `KO-S${p}`, isShorts: true, part: p })
  }
  const lvParts = longformPartNumbers(script.longformLayout)
  const lvVariants: { suffix: string; lvPart: number | undefined }[] =
    lvParts.length === 0
      ? [{ suffix: 'LV', lvPart: undefined }]
      : lvParts.map(p => ({ suffix: `LV${p}`, lvPart: p }))
  for (const { suffix, lvPart } of lvVariants) {
    const dur = calcTotalFrames(script, false, undefined, lvPart)
    if (!Number.isFinite(dur) || dur <= 0) continue
    out.push({ fileSuffix: `KO-${suffix}`, isShorts: false, lvPart })
  }
  return out
}

/** 컴포지션 ID — Root.tsx 의 discourseCompBase(`Discourse-<폴더명>`) + 접미사 */
const compId = (folder: string, v: Variant) => `Discourse-${folder}-${v.fileSuffix}`

/* ── 발화 시각 glue — 로더(script.ts:82 scaleVoiceTimings)와 같은 절차 ──
 * ⚠ 이 glue 는 원본·왕복 **양쪽에 똑같이** 적용된다. 따라서 glue 자체가 정확하지 않더라도
 *   비교의 타당성은 유지된다(차이는 오직 왕복에서만 나온다).
 *   담화는 아직 data.timing 파일이 0개라 현재는 빈 맵이지만, 생기는 즉시 검증에 들어온다. */
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
  const cast = (script.cast ?? []) as Any[]
  const turns = (script.turns ?? []) as Any[]
  turns.forEach((t, i) => {
    const rate = clampRate(t.playbackRate as number | undefined)
    const stem = vnTimingKey(vnTurn(i, cast[t.cast as number]?.slug as string | undefined))
    if (rate === 1 || !vt[stem]) return
    if (!out) out = { ...vt }
    out[stem] = scaleSegs(vt[stem] as Any[], rate)
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

/**
 * ② 세 파일 분해 재현.
 *
 * 담화는 디스크에서 세 파일로 나뉘므로, 왕복 결과를 다시 나눴을 때
 *   - 메타 파일에 cast·turns 가 남지 않고(두 곳에 같은 값이 생기면 갈린다)
 *   - 셋을 도로 합치면 원본과 같아야 한다.
 * 이 불변식이 깨지면 export 가 인물·발언을 메타에 흘려 넣거나 통째로 잃는다.
 */
function checkFileSplit(original: Script, roundtrip: Script): Check {
  const { meta, cast, turns } = splitDiscourseFiles(roundtrip)
  const details: string[] = []
  if ('cast' in meta) details.push('메타 파일에 cast 가 남았다')
  if ('turns' in meta) details.push('메타 파일에 turns 가 남았다')
  const origCast = (original.cast ?? []) as unknown[]
  const origTurns = (original.turns ?? []) as unknown[]
  if (cast.length !== origCast.length) details.push(`인물 수 ${origCast.length} ≠ ${cast.length}`)
  if (turns.length !== origTurns.length) details.push(`발언 수 ${origTurns.length} ≠ ${turns.length}`)
  // 나눈 셋을 도로 합쳐 원본과 대조 — 분해에서 새는 필드가 있으면 여기서 잡힌다
  const remerged = { ...meta, cast, turns }
  const diffs = diffPointers(original, remerged)
  if (diffs.length) details.push(...diffs.map(d => `재병합 차이 ${d}`))
  return details.length === 0
    ? pass(`인물 ${cast.length}·발언 ${turns.length}`)
    : fail(`불일치 ${details.length}건`, details)
}

/** ③ 컴포지션 ID 집합 동일 */
function checkVariants(folder: string, original: Script, roundtrip: Script): Check {
  const a = discourseVariants(original as unknown as DiscourseScript).map(v => compId(folder, v))
  const b = discourseVariants(roundtrip as unknown as DiscourseScript).map(v => compId(folder, v))
  const sa = [...a].sort().join(',')
  const sb = [...b].sort().join(',')
  return sa === sb ? pass(`${a.length}종`) : fail('종류 불일치', [`원본 [${sa}]`, `왕복 [${sb}]`])
}

/** ④ 컷 길이 — 영상 종류마다 총 프레임 대조 */
function checkTiming(original: Script, roundtrip: Script): Check {
  const variants = discourseVariants(original as unknown as DiscourseScript)
  const details: string[] = []
  for (const v of variants) {
    const fa = calcTotalFrames(original as unknown as DiscourseScript, v.isShorts, v.part, v.lvPart)
    const fb = calcTotalFrames(roundtrip as unknown as DiscourseScript, v.isShorts, v.part, v.lvPart)
    if (fa !== fb) details.push(`${v.fileSuffix}: ${fa} ≠ ${fb} 프레임`)
  }
  return details.length === 0 ? pass(`${variants.length}종`) : fail(`불일치 ${details.length}건`, details)
}

/** ⑤ 컷 구성 — buildCues 결과 완전 일치 */
function checkCues(original: Script, roundtrip: Script): Check {
  const variants = discourseVariants(original as unknown as DiscourseScript)
  const details: string[] = []
  let compared = 0
  for (const v of variants) {
    const ca = buildCues(original as unknown as DiscourseScript, v.isShorts, v.part, v.lvPart)
    const cb = buildCues(roundtrip as unknown as DiscourseScript, v.isShorts, v.part, v.lvPart)
    if (ca.length !== cb.length) {
      details.push(`${v.fileSuffix}: 컷 수 ${ca.length} ≠ ${cb.length}`)
      continue
    }
    compared += ca.length
    for (let i = 0; i < ca.length; i++) {
      if (JSON.stringify(ca[i]) !== JSON.stringify(cb[i])) {
        details.push(`${v.fileSuffix}[${i}] 컷 불일치: ${JSON.stringify(ca[i])} ≠ ${JSON.stringify(cb[i])}`)
      }
    }
  }
  return details.length === 0 ? pass(`${compared}컷`) : fail(`불일치 ${details.length}건`, details)
}

/**
 * ⑥ 음성 계약 — 파일명과 합성 텍스트.
 *
 * 담화는 아직 wav 가 0개다. 그래서 지금이 **계약을 고정할 유일한 시점**이다.
 * 음원이 생긴 뒤에 파일명 규칙이 흔들리면 이미 만든 음원이 통째로 어긋난다.
 */
function checkVoiceContract(original: Script, roundtrip: Script): Check {
  const jobs = (s: Script): string[] => {
    const cast = (s.cast ?? []) as Any[]
    const turns = (s.turns ?? []) as Any[]
    const out: string[] = []
    cast.forEach((sp, i) => {
      if (sp.disabled) return
      out.push(`${vnCastEpithet(i, sp.slug as string | undefined)}\t${String(sp.epithet ?? '')}`)
    })
    turns.forEach((t, i) => {
      if (t.disabled) return
      const sp = cast[t.cast as number]
      out.push(`${vnTurn(i, sp?.slug as string | undefined)}\t${turnText(t as never)}`)
    })
    return out
  }
  const ja = jobs(original)
  const jb = jobs(roundtrip)
  const details: string[] = []
  if (ja.length !== jb.length) {
    details.push(`잡 수 ${ja.length} ≠ ${jb.length}`)
  } else {
    for (let i = 0; i < ja.length; i++) {
      if (ja[i] === jb[i]) continue
      const [fa] = ja[i].split('\t')
      const [fb] = jb[i].split('\t')
      details.push(fa !== fb ? `[${i}] 파일명 ${fa} ≠ ${fb}` : `[${i}] (${fa}) 합성 텍스트 불일치`)
    }
  }
  return details.length === 0 ? pass(`${ja.length}건`) : fail(`불일치 ${details.length}건`, details)
}

/** ⑦ 자막 SRT 바이트 동일 + 한글 무결(U+FFFD) */
function checkSrtAndEncoding(original: Script, roundtrip: Script, episodeDir: string): Check {
  const details: string[] = []
  const vt = loadVoiceTimings(episodeDir)
  const a: Script = { ...original, voiceTimings: scaleVoiceTimings(original, vt) }
  const b: Script = { ...roundtrip, voiceTimings: scaleVoiceTimings(roundtrip, vt) }
  const variants = discourseVariants(original as unknown as DiscourseScript)
  for (const v of variants) {
    const sa = subsToSrt(buildDiscourseSubs(a as unknown as DiscourseScript, v.isShorts, v.part, v.lvPart) as never)
    const sb = subsToSrt(buildDiscourseSubs(b as unknown as DiscourseScript, v.isShorts, v.part, v.lvPart) as never)
    if (sa !== sb) details.push(`${v.fileSuffix}: SRT 불일치 (${sa.length} vs ${sb.length} 바이트)`)
  }
  const hits = findReplacementChars(roundtrip)
  for (const h of hits) details.push(`치환문자(U+FFFD) ${h}`)
  return details.length === 0 ? pass(`${variants.length}종`) : fail(`불일치 ${details.length}건`, details)
}

const LABELS = ['①JSON', '②세파일', '③종류', '④길이', '⑤컷', '⑥음성', '⑦자막']

function runChecks(folder: string, original: Script, roundtrip: Script, episodeDir: string): Check[] {
  return [
    checkJson(original, roundtrip),
    checkFileSplit(original, roundtrip),
    checkVariants(folder, original, roundtrip),
    checkTiming(original, roundtrip),
    checkCues(original, roundtrip),
    checkVoiceContract(original, roundtrip),
    checkSrtAndEncoding(original, roundtrip, episodeDir),
  ]
}

/* ────────────────────────── 반증 시험 ────────────────────────── */

/**
 * 검증기가 **실제로 잡는지** 되묻는다(설계 §4).
 *
 * 통과만 보고 안심하면 "아무것도 검사하지 않는 검증기"와 구별할 수 없다.
 * 그래서 원본을 일부러 한 곳씩 망가뜨린 뒤 같은 7종을 돌려, 각 망가뜨림이 **반드시 걸리는지** 본다.
 * 걸리지 않으면 그 종류의 손실을 검증기가 못 잡는다는 뜻이다.
 */
interface Mutation {
  name: string
  /** 못 쓰면(해당 필드가 없는 편이면) undefined 를 돌려 건너뛴다 */
  apply: (s: Script) => Script | undefined
}

const clone = (s: Script): Script => JSON.parse(JSON.stringify(s)) as Script
const turnsOf = (s: Script) => (s.turns ?? []) as Any[]
const castOf = (s: Script) => (s.cast ?? []) as Any[]

const MUTATIONS: Mutation[] = [
  {
    name: 'to 삭제', apply: s => {
      const c = clone(s); const i = turnsOf(c).findIndex(t => t.to !== undefined)
      if (i < 0) return undefined
      delete turnsOf(c)[i].to; return c
    },
  },
  {
    name: 'chunks 제거', apply: s => {
      const c = clone(s); const i = turnsOf(c).findIndex(t => Array.isArray(t.chunks) && (t.chunks as unknown[]).length > 1)
      if (i < 0) return undefined
      delete turnsOf(c)[i].chunks; return c
    },
  },
  {
    name: 'part 변경', apply: s => {
      const c = clone(s); const i = turnsOf(c).findIndex(t => t.part != null)
      if (i < 0) return undefined
      turnsOf(c)[i].part = (turnsOf(c)[i].part as number) + 10; return c
    },
  },
  {
    name: 'turn 경계 ±1', apply: s => {
      const c = clone(s)
      const layout = c.longformLayout as Any[] | undefined
      const i = (layout ?? []).findIndex(it => 'turn' in it)
      if (!layout || i < 0) return undefined
      layout[i] = { turn: (layout[i].turn as number) + 1 }; return c
    },
  },
  {
    name: 'originRef 삭제', apply: s => {
      const c = clone(s); const i = turnsOf(c).findIndex(t => t.originRef)
      if (i < 0) return undefined
      delete turnsOf(c)[i].originRef; return c
    },
  },
  {
    name: 'color 변경', apply: s => {
      const c = clone(s); const i = castOf(c).findIndex(x => x.color)
      if (i < 0) return undefined
      castOf(c)[i].color = '#000000'; return c
    },
  },
  {
    name: 'voice.style 변경(jsonb 생존)', apply: s => {
      const c = clone(s); const i = castOf(c).findIndex(x => (x.voice as Any | undefined)?.style)
      if (i < 0) return undefined
      ;(castOf(c)[i].voice as Any).style = '망가뜨린 지시'; return c
    },
  },
  {
    name: 'living 뒤집기', apply: s => {
      const c = clone(s); const i = castOf(c).findIndex(x => x.living === true)
      if (i < 0) return undefined
      delete castOf(c)[i].living; return c
    },
  },
  {
    name: '인물 순서 교체', apply: s => {
      const c = clone(s)
      const cast = castOf(c)
      if (cast.length < 2) return undefined
      ;[cast[0], cast[1]] = [cast[1], cast[0]]; return c
    },
  },
  {
    name: 'imageChanges 삭제', apply: s => {
      const c = clone(s); const i = turnsOf(c).findIndex(t => Array.isArray(t.imageChanges))
      if (i < 0) return undefined
      delete turnsOf(c)[i].imageChanges; return c
    },
  },
]

async function runFalsify(db: ReturnType<typeof adminClient>, eps: EpisodeFolder[]) {
  console.log('── 반증 시험 (원본을 일부러 망가뜨려 검증기가 잡는지 본다 · 쓰기 없음) ──')
  // 망가뜨림별로 「어느 편에서 걸렸나 / 어느 검사가 걸었나」를 모은다
  const caught = new Map<string, { eps: number; skipped: number; labels: Set<string> }>()
  for (const m of MUTATIONS) caught.set(m.name, { eps: 0, skipped: 0, labels: new Set() })

  for (const ep of eps) {
    const original = readDiscourseData(ep)
    const roundtrip = await exportEpisode(db, ep.folder, original)
    const marks: string[] = []
    for (const m of MUTATIONS) {
      const rec = caught.get(m.name)!
      const broken = m.apply(original)
      if (!broken) { rec.skipped++; marks.push(`${m.name}:－`); continue }
      const checks = runChecks(ep.folder, broken, roundtrip, ep.dir)
      const hit = checks.map((c, i) => (c.ok ? null : LABELS[i])).filter(Boolean) as string[]
      if (hit.length) {
        rec.eps++
        for (const h of hit) rec.labels.add(h)
        marks.push(`${m.name}:${hit.join('')}`)
      } else {
        marks.push(`${m.name}:✗못잡음`)
      }
    }
    console.log(`  ${pad(ep.folder, 24)} ${marks.join('  ')}`)
  }

  console.log('\n── 반증 결과표 ──')
  console.log(`${pad('망가뜨림', 30)}${pad('적용편', 8)}${pad('해당없음', 10)}잡은 검사`)
  let missed = 0
  for (const m of MUTATIONS) {
    const rec = caught.get(m.name)!
    const ok = rec.eps > 0
    if (!ok) missed++
    console.log(
      `${ok ? ' ' : '⚠'}${pad(m.name, 29)}${pad(String(rec.eps), 8)}${pad(String(rec.skipped), 10)}` +
      (ok ? [...rec.labels].join(' ') : '못 잡음 — 검증기 구멍'),
    )
  }
  console.log(`\n망가뜨림 ${MUTATIONS.length}종 중 ${MUTATIONS.length - missed}종 검출`)
  if (missed) process.exitCode = 1
}

/* ────────────────────────── 드리프트 ────────────────────────── */

/**
 * --drift — 파일 ↔ DB 대조만 한다(쓰기 없음).
 *
 * 파일이 내보낸 그대로인지(체크섬), 사람이 고쳤는지, DB 가 앞서 있어 재export 가 필요한지 본다.
 * 상시 감시용이라 렌더 함수는 돌리지 않고 문서 비교만 한다.
 */
async function runDrift(db: ReturnType<typeof adminClient>, eps: EpisodeFolder[]) {
  type DriftRow = { folder: string; state: string; detail: string; ok: boolean }
  const rows: DriftRow[] = []

  for (const ep of eps) {
    const st = inspectFiles(ep.paths)
    if (st.kind === 'absent') {
      rows.push({ folder: ep.folder, state: '파일없음', detail: `${st.missing.join('·')} 없음 — export 필요`, ok: false })
      continue
    }
    if (st.kind === 'pristine') {
      // 마커가 없어 체크섬으로는 손 편집을 못 가린다 → 내용을 DB 와 직접 대조해
      // 첫 export 로 덮어써도 안전한지(=파일에만 있는 변경이 없는지) 알려준다.
      const fresh = await exportEpisode(db, ep.folder, st.doc)
      const diffs = diffPointers(st.doc, fresh)
      rows.push({
        folder: ep.folder, state: '미발효',
        detail: diffs.length
          ? `⚠ 파일이 DB와 다르다 — 차이 ${diffs.length}곳. 덮어쓰면 파일 쪽 변경이 사라진다(먼저 discourse:import)`
          : 'DB와 내용 동일 — 첫 export 안전',
        ok: false,
      })
      continue
    }
    if (st.kind === 'hand-edited') {
      const fresh = await exportEpisode(db, ep.folder, st.doc)
      const diffs = diffPointers(st.doc, fresh)
      rows.push({
        folder: ep.folder, state: '손편집',
        detail: `체크섬 ${st.actual.slice(0, 8)} ≠ ${st.marker.checksum.slice(0, 8)}` +
          (diffs.length ? ` · DB와 의미차 ${diffs.length}곳` : ' · DB와 의미차 없음(형식만 바뀜)'),
        ok: false,
      })
      continue
    }
    // 체크섬 일치 — DB 가 그 사이 바뀌었는지 본다
    const fresh = await exportEpisode(db, ep.folder, st.doc)
    const diffs = diffPointers(st.doc, fresh)
    rows.push(diffs.length
      ? { folder: ep.folder, state: 'DB앞섬', detail: `재export 필요 — 차이 ${diffs.length}곳`, ok: false }
      : { folder: ep.folder, state: '동일', detail: `내보낸 시각 ${st.marker.at}`, ok: true })
  }

  console.log('── 드리프트 점검 (쓰기 없음) ──')
  console.log(`${pad('에피소드', 26)}${pad('상태', 12)}비고`)
  for (const r of rows) {
    console.log(`${r.ok ? ' ' : '⚠'} ${pad(r.folder, 25)}${pad(r.state, 12)}${r.detail}`)
  }
  const bad = rows.filter(r => !r.ok)
  console.log(`\n동일 ${rows.length - bad.length}편 · 조치 필요 ${bad.length}편`)
  if (bad.length) process.exitCode = 1
}

/* ────────────────────────── main ────────────────────────── */

const USAGE = '사용: pnpm discourse:verify -- (--episode <폴더명> | --all) [--drift] [--falsify]'

async function main() {
  const args = parseArgs(process.argv, USAGE)
  const eps = selectEpisodes(args)
  const db = adminClient()

  if (args.drift) return runDrift(db, eps)
  if (args.falsify) return runFalsify(db, eps)

  const rows: { folder: string; registered: boolean; checks: Check[] }[] = []

  for (const ep of eps) {
    // 세 파일 병합 + 마커 제거는 readDiscourseData 가 한다(마커는 DB 산출물에 없는 파일 전용 키)
    const original = readDiscourseData(ep)
    let roundtrip: Script
    try {
      roundtrip = await exportEpisode(db, ep.folder, original)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      rows.push({ folder: ep.folder, registered: ep.registered, checks: LABELS.map(() => fail(`export 실패: ${msg}`)) })
      console.log(`  ✗ ${pad(ep.folder, 24)} export 실패 — ${msg}`)
      continue
    }

    const checks = runChecks(ep.folder, original, roundtrip, ep.dir)
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
  console.log(`${pad('에피소드', 26)}${pad('등록', 6)}${LABELS.map(l => pad(l, 9)).join('')}`)
  for (const r of rows) {
    console.log(
      pad(r.folder, 26) + pad(r.registered ? 'O' : '-', 6) +
      r.checks.map(c => pad(c.ok ? '✓' : '✗', 9)).join(''),
    )
  }

  const failed = rows.filter(r => r.checks.some(c => !c.ok))
  console.log('')
  console.log(`${rows.length}편 — 7종 전부 통과 ${rows.length - failed.length}편, 실패 ${failed.length}편`)

  if (failed.length) process.exitCode = 1
  else console.log('\n왕복 검증 전량 통과.')
}

main().catch(e => {
  console.error(`✗ ${e instanceof Error ? e.message : String(e)}`)
  process.exit(1)
})
