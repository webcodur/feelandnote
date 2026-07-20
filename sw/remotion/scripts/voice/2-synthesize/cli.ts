/**
 * 2-synthesize/cli.ts — CLI 인자 파싱·환경 상수
 *
 * 모듈 로드 시점에 process.argv를 한 번 파싱하여 전역 상수를 export 한다.
 * 다른 모듈은 import 만으로 같은 환경을 공유한다.
 */

import path from 'path'
import { ROOT, findEpisodeDir, parseEpName } from '../../lib/episode.js'
import { MODEL_GEMINI_25, MODEL_GEMINI_31 } from './config.js'

// --- 원본 args ---
export const args = process.argv.slice(2)

// --- 허용 플래그 검증 — 오타·미지원 플래그 유입 방지 ---
const KNOWN_FLAGS = new Set([
  '--episode', '--engine', '--only', '--force', '--shorts', '--solo', '--long',
  '--update-json', '--include-common', '--normalize', '--normalize-only', '--list',
  '--init-manifest', '--start-key', '--role',
  '--default-tags', '--default-trail', '--include-locked',
])
for (const arg of args) {
  if (arg === '--') continue
  if (arg.startsWith('--') && !KNOWN_FLAGS.has(arg)) {
    throw new Error(`알 수 없는 플래그: ${arg} (허용: ${[...KNOWN_FLAGS].join(', ')})`)
  }
}

// --- 단일 타겟 스코프: --long / --shorts <N> / --solo <N> 중 정확히 하나 필수 ---
// --list, --init-manifest 등 메타 플래그만 사용할 때도 동일하게 강제한다
const SHORTS_FLAG_IDX = args.indexOf('--shorts')
const SOLO_FLAG_IDX = args.indexOf('--solo')
const HAS_LONG_FLAG = args.includes('--long')
let parsedShortsIndex: number | null = null
let parsedSoloBookIndex: number | null = null
if (SHORTS_FLAG_IDX >= 0) {
  const raw = args[SHORTS_FLAG_IDX + 1]
  const parsed = raw !== undefined ? Number(raw) : NaN
  if (!Number.isInteger(parsed) || parsed < 1) {
    console.error(`✗ --shorts 인자는 1 이상 정수여야 한다. 받은 값: ${raw ?? '(없음)'}`)
    console.error('  사용: pnpm voice:tts -- --episode <name> (--long | --shorts <N> | --solo <N>) [...옵션]')
    process.exit(1)
  }
  parsedShortsIndex = parsed
}
if (SOLO_FLAG_IDX >= 0) {
  const raw = args[SOLO_FLAG_IDX + 1]
  const parsed = raw !== undefined ? Number(raw) : NaN
  if (!Number.isInteger(parsed) || parsed < 1) {
    console.error(`✗ --solo 인자는 1 이상 정수여야 한다. 받은 값: ${raw ?? '(없음)'}`)
    console.error('  사용: pnpm voice:tts -- --episode <name> (--long | --shorts <N> | --solo <N>) [...옵션]')
    process.exit(1)
  }
  parsedSoloBookIndex = parsed
}
const scopeCount = Number(HAS_LONG_FLAG) + Number(parsedShortsIndex !== null) + Number(parsedSoloBookIndex !== null)
if (scopeCount !== 1) {
  console.error('✗ --long / --shorts <N> / --solo <N> 중 정확히 하나만 지정해야 한다.')
  console.error('  사용: pnpm voice:tts -- --episode <name> (--long | --shorts <N> | --solo <N>) [...옵션]')
  process.exit(1)
}
export const SHORTS_INDEX: number | null = parsedShortsIndex
/** SOLO 책 번호 (1-based). */
export const SOLO_BOOK_INDEX: number | null = parsedSoloBookIndex

// --- 에피소드 ---
const epIdx = args.indexOf('--episode')
export const EPISODE_NAME = epIdx >= 0 ? args[epIdx + 1] : 'elon-musk'

// --- 엔진 선택: --engine gemini | gemini-v3 | elevenlabs (기본: gemini) ---
// 출력 슬롯·합성 분기는 gemini/elevenlabs로 정규화한다(OUT_DIR=BASE_DIR/ENGINE). gemini-v3는
// gemini 슬롯에 저장하되 모델만 3.1로 분기 → 최종 렌더는 모델 구분 없이 gemini 슬롯을 쓴다.
const engineIdx = args.indexOf('--engine')
const RAW_ENGINE = engineIdx >= 0 ? args[engineIdx + 1] : 'gemini'
export const ENGINE = RAW_ENGINE === 'elevenlabs' ? 'elevenlabs' : 'gemini'
/** Gemini 합성 모델 — gemini-v3면 3.1, 그 외 2.5. (engines.ts synthesizeRaw가 사용) */
export const GEMINI_MODEL = RAW_ENGINE === 'gemini-v3' ? MODEL_GEMINI_31 : MODEL_GEMINI_25

// --- 에피소드 경로 해석 ---
const parsed = parseEpName(EPISODE_NAME)
export const EP_PERSON = parsed.person
export const EP_LOCALE = parsed.locale
export const BASE_DIR = path.join(findEpisodeDir(EP_PERSON), 'voice', EP_LOCALE)
export const OUT_DIR = path.join(BASE_DIR, ENGINE)
export const IS_EN = EPISODE_NAME.endsWith('-en')
export const COMMON_DIR = path.join(ROOT, 'public', 'common', 'voice', IS_EN ? 'en' : 'ko')

// --- --only / --include-common ---
// 공통 음성 — common/voice/{locale}/ 재사용. --only 로도 공통 파일은 보호됨.
// 재생성하려면 --include-common 필수.
const onlyArgValue = args[args.indexOf('--only') + 1]
export const onlyTargets = args.includes('--only') && onlyArgValue ? onlyArgValue.split(',') : []
export const includeCommon = args.includes('--include-common')

// --- --role narrator,summary,celeb ---
const roleIdx = args.indexOf('--role')
export const ROLE_FILTER = roleIdx >= 0 ? (args[roleIdx + 1]?.split(',') ?? null) : null

// --- API 키 시작 인덱스 (--start-key N, 1-based) ---
const startKeyIdx = args.indexOf('--start-key')
export const START_KEY_INDEX = startKeyIdx >= 0 ? Number(args[startKeyIdx + 1]) : 1
