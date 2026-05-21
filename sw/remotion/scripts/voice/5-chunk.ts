/**
 * 5-chunk.ts — 음성 파이프라인 5단계 (Composition): 의미 단위 분할 적용 + 검증
 *
 * 파이프라인 순서:
 *   1. **기계적 선분할** (자동) — 모든 세그먼트에 대해 콤마 기준 분할 적용.
 *      열거 리스트(콤마 3+)·극단 짧은 조각(5자 미만)은 예외로 묶는다.
 *   2. **LLM 분할** (subs.json 입력, 선택) — 기계적 분할 결과를 덮어쓰기. 연결어미·
 *      주어/목적어 경계 등 의미 단위 분할은 LLM 판단에 맡긴다.
 *   3. **LLM 결과 후처리** — LLM sub 청크 내부에 남은 콤마를 기계적으로 재분할.
 *   4. 불변식 검증: `sub.join(' ') === text` — 실패 시 abort, 디스크 미수정 (트랜잭션).
 *   5. 30자 초과 세그먼트 중 sub 누락 보고.
 *
 * subs.json 형태:
 *   { "D01b-summary": { "0": ["청크1", "청크2"] }, ... }
 *
 * Usage:
 *   pnpm voice:chunk -- --episode <name>                         # 기계적 분할만 자동 적용
 *   pnpm voice:chunk -- --episode <name> --input subs.json       # LLM 입력 병합 + 후처리
 *   pnpm voice:chunk -- --episode <name> --check                 # 분할 적용 안 하고 검증만
 *   pnpm voice:chunk -- --episode <name> --input subs.json --dry-run
 *   pnpm voice:chunk -- --episode <name> --check --strict        # 30자 이하도 누락 검사
 *
 * 후속:
 *   apply 후 자동으로 `voice:align --update-json` 안내 (subTimings 자동 계산은 4-align.ts 책임).
 */
import { readFileSync, writeFileSync } from 'fs'
import { resolveEpisodePath, resolveTimingPath } from '../lib/episode.js'

const args = process.argv.slice(2)
const epIdx = args.indexOf('--episode')
const epName = epIdx >= 0 ? args[epIdx + 1] : null
const inputIdx = args.indexOf('--input')
const inputPath = inputIdx >= 0 ? args[inputIdx + 1] : null
const checkOnly = args.includes('--check')
const dryRun = args.includes('--dry-run')
const strictMode = args.includes('--strict')

const MIN_SUB_LEN = 30  // 4-align.ts(analyze) 경고 기준과 동일
const MAX_SUB_CHUNK_LEN = 35  // 개별 sub 청크 최대 길이 — 초과 시 재분할 보고

if (!epName) {
  console.error('Usage: pnpm voice:chunk -- --episode <name> [--input subs.json] [--check] [--dry-run] [--strict]')
  process.exit(1)
}
// checkOnly / inputPath 없어도 기계적 분할은 자동 수행

// ─── 기계적 콤마 분할 규칙 ─────────────────────────
// 불변식: mechanicalCommaSplit(text).join(' ') === text
// 규칙:
//   - 콤마 0개 → 원본 유지 (분할 안 함)
//   - 그 외 → 콤마 뒤 공백에서 분할. 분할된 조각 중 5자 미만은 이웃과 병합.
//     (진짜 짧은 열거 리스트는 5자 미만 병합 룰로 자연스럽게 한 덩어리로 합쳐진다.)
function mechanicalCommaSplit(text: string): string[] {
  const commaCount = (text.match(/,/g) || []).length
  if (commaCount === 0) return [text]
  const parts = text.split(/(?<=,)\s+/).map(p => p.trim()).filter(Boolean)
  if (parts.length < 2) return [text]
  const merged: string[] = []
  for (const p of parts) {
    if (merged.length === 0) { merged.push(p); continue }
    const last = merged[merged.length - 1]
    // 숫자 열거(예: "1, 2위", "1, 2, 3"): 콤마 직전이 숫자이고 다음 조각이 숫자로 시작하면 한 덩어리 유지
    if (/\d,$/.test(last) && /^\d/.test(p)) {
      merged[merged.length - 1] = last + ' ' + p
      continue
    }
    if (p.length < 5 || last.length < 5) {
      merged[merged.length - 1] = last + ' ' + p
    } else {
      merged.push(p)
    }
  }
  return merged.length >= 2 && merged.join(' ') === text ? merged : [text]
}

// LLM sub 배열을 받아 각 청크 내부에 남은 콤마를 기계적으로 재분할
function refineLlmSubsByComma(subs: string[]): string[] {
  const out: string[] = []
  for (const chunk of subs) {
    const pieces = mechanicalCommaSplit(chunk)
    out.push(...pieces)
  }
  return out
}

// ─── 에피소드 + voiceTimings 로드 ───
// 신구조면 meta.{locale}.json, 레거시면 {locale}.json 자동 분기
const epPath = resolveEpisodePath(epName)
const episode = JSON.parse(readFileSync(epPath, 'utf-8'))

const timingPath = resolveTimingPath(epName)
let timing: any = {}
try { timing = JSON.parse(readFileSync(timingPath, 'utf-8')) } catch { /* */ }
if (timing.voiceTimings) episode.voiceTimings = timing.voiceTimings

if (!episode.voiceTimings) {
  console.error('voiceTimings 없음 — 4-align(analyze)을 먼저 실행하세요')
  process.exit(1)
}
const vt = episode.voiceTimings as Record<string, any[]>

// ─── (A) 기계적 콤마 선분할 — 모든 세그먼트에 자동 적용 ───
let autoApplied = 0  // 기계식 신규 적용
let autoRefined = 0  // LLM sub 후처리로 세분화
let applied = 0, skipped = 0
const errors: string[] = []

if (!checkOnly) {
  for (const [key, segs] of Object.entries(vt)) {
    segs.forEach((seg: any, i: number) => {
      if (!seg?.text) return
      if (seg.sub && Array.isArray(seg.sub) && seg.sub.length > 0) {
        // 기존 sub 존재 → 콤마 재분할로 세분화만
        const refined = refineLlmSubsByComma(seg.sub)
        if (refined.length !== seg.sub.length && refined.join(' ') === seg.text) {
          seg.sub = refined
          autoRefined++
        }
        return
      }
      const pieces = mechanicalCommaSplit(seg.text)
      if (pieces.length >= 2 && pieces.join(' ') === seg.text) {
        seg.sub = pieces
        autoApplied++
      }
    })
  }
}

// ─── (B) LLM subs.json 입력 병합 + 후처리 (트랜잭션) ───
const stagedChanges: Array<{ key: string; idx: number; sub: string[] }> = []

if (inputPath) {
  const subsMap: Record<string, Record<string, string[]>> = JSON.parse(readFileSync(inputPath, 'utf-8'))

  for (const [key, indices] of Object.entries(subsMap)) {
    const segs = vt[key]
    if (!segs) {
      errors.push(`키 없음: ${key}`)
      continue
    }
    for (const [idx, sub] of Object.entries(indices)) {
      const i = parseInt(idx)
      const seg = segs[i]
      if (!seg) {
        errors.push(`${key}[${idx}] 인덱스 없음`)
        continue
      }
      const joined = sub.join(' ')
      if (joined !== seg.text) {
        errors.push(`${key}[${idx}] 불변식 위반 (sub.join !== text)\n   원문: ${seg.text}\n   조인: ${joined}`)
        continue
      }
      // LLM sub 후처리: 콤마 재분할로 세분화
      const refined = refineLlmSubsByComma(sub)
      if (refined.join(' ') !== seg.text) {
        errors.push(`${key}[${idx}] 후처리 불변식 위반\n   원문: ${seg.text}\n   후처리: ${refined.join(' ')}`)
        continue
      }
      stagedChanges.push({ key, idx: i, sub: refined })
    }
  }

  if (errors.length > 0) {
    console.error(`\n❌ 검증 실패 ${errors.length}건 — 디스크 쓰기 안 함 (트랜잭션 abort):`)
    errors.forEach(e => console.error(`  ${e}`))
    process.exit(1)
  }

  // 모든 검증 통과 — 일괄 커밋
  for (const ch of stagedChanges) {
    vt[ch.key][ch.idx].sub = ch.sub
    applied++
  }
}

if (!checkOnly && !dryRun) {
  timing.voiceTimings = vt
  writeFileSync(timingPath, JSON.stringify(timing, null, 2) + '\n', 'utf-8')
  console.log(`\n✅ 기계적 선분할 ${autoApplied}건 / 기존 sub 세분화 ${autoRefined}건 / LLM 입력 적용 ${applied}건 / 스킵 ${skipped}건`)
  console.log(`→ subTimings 자동 계산: pnpm voice:align -- --episode ${epName} --update-json`)
} else if (dryRun) {
  console.log(`\n[dry-run] 기계적 ${autoApplied}건 / 세분화 ${autoRefined}건 / LLM ${applied}건 — 디스크 변경 없음`)
}

// ─── (C) 검증 모드 또는 적용 후 누락 보고 ───
let total = 0, withSub = 0
const broken: string[] = []
const missing: string[] = []
const shortSkipped: string[] = []
const oversized: string[] = []  // sub 청크가 MAX_SUB_CHUNK_LEN 초과

for (const [key, segs] of Object.entries(vt)) {
  for (let i = 0; i < segs.length; i++) {
    total++
    const seg = segs[i]
    if (seg.sub) {
      withSub++
      const joined = (seg.sub as string[]).join(' ')
      if (joined !== seg.text) {
        broken.push(`${key}[${i}]: sub.join !== text`)
      }
      // 개별 청크 길이 검증
      (seg.sub as string[]).forEach((chunk, j) => {
        if (chunk.length > MAX_SUB_CHUNK_LEN) {
          oversized.push(`${key}[${i}].sub[${j}] (${chunk.length}자): ${chunk.slice(0, 50)}`)
        }
      })
    } else if (seg.text?.length > 0) {
      const entry = `${key}[${i}]: (${seg.text.length}자) ${seg.text.slice(0, 50)}`
      if (strictMode || seg.text.length > MIN_SUB_LEN) missing.push(entry)
      else shortSkipped.push(entry)
    }
  }
}

console.log(`\n━━━ 검증 보고 ━━━`)
console.log(`전체: ${total} / sub 있음: ${withSub} (${Math.round(withSub / total * 100)}%)`)
if (!strictMode) console.log(`기준: ${MIN_SUB_LEN}자 초과만 누락으로 간주 (--strict로 전체)`)

if (broken.length > 0) {
  console.error(`\n❌ 깨진 sub ${broken.length}건:`)
  broken.forEach(b => console.error(`  ${b}`))
} else {
  console.log(`깨진 sub: 0`)
}

if (missing.length > 0) {
  console.warn(`\n⚠ sub 누락 ${missing.length}건${strictMode ? '' : ' (' + MIN_SUB_LEN + '자 초과)'}:`)
  missing.slice(0, 20).forEach(m => console.warn(`  ${m}`))
  if (missing.length > 20) console.warn(`  ... 외 ${missing.length - 20}건`)
} else {
  console.log(`sub 누락: 0 ✅`)
}

if (oversized.length > 0) {
  console.warn(`\n⚠ sub 청크 과대 ${oversized.length}건 (${MAX_SUB_CHUNK_LEN}자 초과 — 추가 분할 필요):`)
  oversized.slice(0, 20).forEach(o => console.warn(`  ${o}`))
  if (oversized.length > 20) console.warn(`  ... 외 ${oversized.length - 20}건`)
} else {
  console.log(`sub 청크 과대: 0 ✅`)
}

if (!strictMode && shortSkipped.length > 0) {
  console.log(`\nℹ 짧은 세그먼트 ${shortSkipped.length}건 — sub 불필요 (${MIN_SUB_LEN}자 이하)`)
}
