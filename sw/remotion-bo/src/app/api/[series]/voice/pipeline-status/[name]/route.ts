/**
 * Voice Pipeline Status API — 위험지역·용의자 탐지 로직
 *
 * 카운트가 어떻게 올라가는지:
 *
 * ┌─ Synthesis (본문 vs tts.replace) ─────────────────────────────────
 * │ confirmed  tts-replace-missing
 * │   - 본문(narrator·host·books[].summary/contextMain/quotePairs 등)을
 * │     전부 훑어 \d+(?:,\d+)?[가-힣]+ 패턴(숫자+단위)을 추출
 * │   - ep.tts.replace 에 등록 안 된 토큰만 카운트 (중복 제거)
 * │   - "1865년"이 이미 등록돼 있으면 "1865년에"는 prefix 매칭으로 제외
 * │   → 새 본문에 새 연도/단위가 섞이면 여기 숫자가 올라감
 *
 * ┌─ Alignment (voiceTimings 검사) ───────────────────────────────────
 * │ confirmed  negative-duration
 * │   - seg.end - seg.start < 0 인 토막 전부
 * │
 * │ confirmed  compressed
 * │   - 5자 이상 토막 중 duration < chars * 0.13s * 0.5 (음절×130ms 기준 50% 미만)
 * │
 * │ suspect    replacement-suspect  ← ★ 카운트 급증의 주 원인
 * │   - 토막 text 에 tts.replace 키가 하나라도 포함된 모든 토막
 * │     (filter: 위의 negative/compressed 로 이미 걸린 건 제외)
 * │   - 링컨처럼 tts.replace 에 연도 30개 이상 등록된 에피소드는
 * │     거의 모든 contextMain·after 토막가 여기 잡힌다 = 본문이 풍부할수록 ↑
 * │   - 의미: "이 토막는 치환된 발음이라 Whisper가 시간을 잘못 잡았을 수 있다"는 감시 플래그
 * │
 * │ suspect    hold-overflow
 * │   - 인접 토막 gap 이 0.3초 ≤ gap < 0.5초 구간인 경우
 * │   - 이 범위에서 Typewriter 가 앞 sub를 hold 하여 늦게 꺼지는 시각 버그 발생
 *
 * ┌─ Composition (sub 분할 검사) ─────────────────────────────────────
 * │ confirmed  sub-broken   seg.sub 있는데 sub.join(' ') !== text
 * │ confirmed  sub-missing  seg.sub 없고 text.length > 30
 *
 * ─── 정렬·반환 ──────────────────────────────────────────────────────
 * issues[] 를 confirmed → suspect 순, 그룹 내에서는 synthesis→alignment→composition 순으로 정렬.
 * summary 는 그룹별 × severity별 카운트만 집계.
 *
 * ─── 갱신 시점 ──────────────────────────────────────────────────────
 * UI 에서 에피소드 로드 시 1회 호출 + reloadSignal 변경 시마다 재호출.
 * ScenarioView 는 VoiceTimingEditor 모달이 닫힐 때 reloadSignal++ 하여
 * 사용자가 처리한 항목이 패널에서 즉시 사라지게 연결.
 *
 * ─── 주의 ──────────────────────────────────────────────────────────
 * voiceTimings(ko.timing.json)는 예전 본문 기준일 수 있음. 본문(ko.json) 수정 후에는
 * voice:tts → voice-sync 로 재생성해야 alignment/composition 카운트가 새 본문을 반영한다.
 * 본문·timing 불일치 자체를 탐지하는 항목은 현재 없음(필요 시 별도 추가).
 */
import { NextResponse } from 'next/server'
import { readFileSync, existsSync } from 'fs'
import * as path from 'path'
import { parseEpisodeId, findEpisodeDir } from '@/lib/server-utils'

export const dynamic = 'force-dynamic'

const SEC_PER_SYL = 0.13
const COMPRESSED_THRESHOLD = 0.5
const MIN_CHARS_FOR_COMPRESS_CHECK = 5
const MIN_SUB_LEN = 30
const HOLD_GAP_MIN = 0.3   // Typewriter hold 위험 시작
const HOLD_GAP_MAX = 0.5   // FPS*0.5 — 이 이상이면 자기 end에서 꺼짐

type Severity = 'confirmed' | 'suspect'
type Issue = {
  group: 'synthesis' | 'alignment' | 'composition'
  severity: Severity
  kind: string
  key?: string
  segIdx?: number
  text?: string
  detail?: string
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ series: string; name: string }> }
) {
  const { name } = await context.params
  const { person, locale } = parseEpisodeId(name)
  const found = findEpisodeDir(person)
  if (!found) return NextResponse.json({ error: 'episode dir not found' }, { status: 404 })
  const epPath = path.join(found.dir, `${locale}.json`)
  const timingPath = path.join(found.dir, `${locale}.timing.json`)
  if (!existsSync(epPath)) {
    return NextResponse.json({ error: 'episode file not found' }, { status: 404 })
  }

  const ep = JSON.parse(readFileSync(epPath, 'utf-8'))
  const timing = existsSync(timingPath) ? JSON.parse(readFileSync(timingPath, 'utf-8')) : {}
  const vt: Record<string, any[]> = timing.voiceTimings ?? {}
  const replaceMap: Record<string, string> = (ep.tts?.replace as Record<string, string>) ?? {}
  const replaceKeys = Object.keys(replaceMap).sort((a, b) => b.length - a.length)

  const issues: Issue[] = []

  // ── Synthesis: tts.replace 누락 (confirmed) ──
  const texts: string[] = []
  const n = ep.narrator ?? {}
  for (const k of ['serviceGreeting', 'serviceIntro', 'celebIntro', 'bridge', 'outro', 'interlude', 'returnIntro', 'prevRecap']) {
    if (n[k]) texts.push(n[k])
  }
  const h = ep.host ?? {}
  for (const k of ['philosophy', 'featuredQuote', 'bio']) {
    if (h[k]) texts.push(h[k])
  }
  for (const b of (ep.books ?? [])) {
    for (const k of ['summary', 'contextMain']) {
      if (b[k]) texts.push(b[k])
    }
    for (const p of (b.quotePairs ?? [])) {
      for (const k of ['quote', 'after']) {
        if (p[k]) texts.push(p[k])
      }
    }
  }
  const existing = new Set(replaceKeys)
  const patternRe = /\d+(?:,\d+)?[가-힣]+/g
  const missingTokens = new Map<string, string>()
  for (const t of texts) {
    let m: RegExpExecArray | null
    while ((m = patternRe.exec(t)) !== null) {
      const token = m[0]
      if (existing.has(token)) continue
      let covered = false
      for (const k of existing) {
        if (token.startsWith(k)) { covered = true; break }
      }
      if (covered) continue
      if (!missingTokens.has(token)) {
        const s = Math.max(0, m.index - 25)
        const e = Math.min(t.length, m.index + token.length + 25)
        missingTokens.set(token, t.slice(s, e))
      }
    }
  }
  for (const [token, context] of missingTokens) {
    issues.push({ group: 'synthesis', severity: 'confirmed', kind: 'tts-replace-missing', text: token, detail: context })
  }

  // ── Alignment ──
  for (const [key, segs] of Object.entries(vt)) {
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]
      const text: string = seg.text ?? ''
      const chars = text.replace(/\s/g, '').length
      const dur = (seg.end ?? 0) - (seg.start ?? 0)

      // confirmed: 음수 duration
      if (dur < 0) {
        issues.push({ group: 'alignment', severity: 'confirmed', kind: 'negative-duration', key, segIdx: i, text: text.slice(0, 50), detail: `${dur.toFixed(2)}s` })
      }
      // confirmed: 극단 찌부
      else if (chars >= MIN_CHARS_FOR_COMPRESS_CHECK && dur < chars * SEC_PER_SYL * COMPRESSED_THRESHOLD) {
        issues.push({ group: 'alignment', severity: 'confirmed', kind: 'compressed', key, segIdx: i, text: text.slice(0, 50), detail: `${dur.toFixed(2)}s / ${chars}자` })
      }
      // suspect: 치환 키 포함 토막 (발음 시작이 실제와 어긋날 가능성)
      else {
        const containsReplacement = replaceKeys.some(k => text.includes(k))
        if (containsReplacement) {
          const matched = replaceKeys.find(k => text.includes(k))
          issues.push({ group: 'alignment', severity: 'suspect', kind: 'replacement-suspect', key, segIdx: i, text: text.slice(0, 50), detail: `치환: ${matched}` })
        }
      }

      // suspect: hold-overflow (다음 토막와 gap 0.3~0.5초 — Typewriter hold 위험)
      const next = segs[i + 1]
      if (next) {
        const gap = (next.start ?? 0) - (seg.end ?? 0)
        if (gap >= HOLD_GAP_MIN && gap < HOLD_GAP_MAX) {
          issues.push({ group: 'alignment', severity: 'suspect', kind: 'hold-overflow', key, segIdx: i, text: text.slice(0, 50), detail: `다음과 gap ${gap.toFixed(2)}s — 앞 sub가 늦게 꺼짐` })
        }
      }
    }
  }

  // ── Composition ──
  for (const [key, segs] of Object.entries(vt)) {
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i]
      const text: string = seg.text ?? ''
      if (seg.sub) {
        const joined = (seg.sub as string[]).join(' ')
        if (joined !== text) {
          issues.push({ group: 'composition', severity: 'confirmed', kind: 'sub-broken', key, segIdx: i, text: text.slice(0, 50), detail: 'sub.join !== text' })
        }
      } else if (text.length > MIN_SUB_LEN) {
        issues.push({ group: 'composition', severity: 'confirmed', kind: 'sub-missing', key, segIdx: i, text: text.slice(0, 60), detail: `${text.length}자` })
      }
    }
  }

  // 정렬: confirmed → suspect, group 순
  const groupOrder: Record<Issue['group'], number> = { synthesis: 0, alignment: 1, composition: 2 }
  issues.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'confirmed' ? -1 : 1
    return groupOrder[a.group] - groupOrder[b.group]
  })

  const tallyBy = (group: Issue['group'], severity: Severity) =>
    issues.filter(i => i.group === group && i.severity === severity).length
  const summary = {
    synthesis: { confirmed: tallyBy('synthesis', 'confirmed'), suspect: tallyBy('synthesis', 'suspect') },
    alignment: { confirmed: tallyBy('alignment', 'confirmed'), suspect: tallyBy('alignment', 'suspect') },
    composition: { confirmed: tallyBy('composition', 'confirmed'), suspect: tallyBy('composition', 'suspect') },
  }

  return NextResponse.json({ summary, issues })
}
