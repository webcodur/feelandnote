/**
 * faction/cli.ts — 세력도(Faction) TTS CLI 인자 파싱·환경 상수
 *
 * BookRecommend 의 2-synthesize/cli.ts 와 동일한 "모듈 로드 시 argv 1회 파싱" 패턴.
 * 다만 Faction 은 입력이 public/factions/<에피소드>/data.json 한 파일이라
 * locale 접미사·--long/--shorts 스코프가 없다. 별도 CLI 로 격리해 BookRecommend 경로를 건드리지 않는다.
 *
 * 사용:
 *   pnpm voice:faction -- --episode llm [--normalize] [--force] [--dry-run] [--list] [--only F01P01]
 */

import path from 'path'
import { ROOT } from '../../lib/episode.js'
import { MODEL_GEMINI_25, MODEL_GEMINI_31 } from '../2-synthesize/config.js'

export const args = process.argv.slice(2)

// --- 허용 플래그 검증 — 오타·미지원 플래그 유입 방지 ---
const KNOWN_FLAGS = new Set([
  '--episode', '--engine', '--only', '--force', '--normalize',
  '--list', '--dry-run', '--init-manifest', '--update-json',
  '--start-key', '--lang',
])
for (const arg of args) {
  if (arg === '--') continue
  if (arg.startsWith('--') && !KNOWN_FLAGS.has(arg)) {
    throw new Error(`알 수 없는 플래그: ${arg} (허용: ${[...KNOWN_FLAGS].join(', ')})`)
  }
}

// --- 에피소드(= public/factions/ 하위 폴더명) ---
const epIdx = args.indexOf('--episode')
const RAW_EPISODE = epIdx >= 0 ? args[epIdx + 1] : ''
if (!RAW_EPISODE || RAW_EPISODE.startsWith('--')) {
  console.error('✗ --episode <폴더명> 가 필수다. 예: --episode llm')
  console.error('  사용: pnpm voice:faction -- --episode <폴더명> [--normalize] [--dry-run]')
  process.exit(1)
}
export const EPISODE_NAME = RAW_EPISODE

// --- 언어: --lang ko|en (기본 ko) ---
// 현재 음성 경로(factions/<에피소드>/voice/)·quoteDuration 은 언어 분리가 없다.
// 기본은 한국어 대사(quote)를 합성한다. en 은 forward-compat 훅이다.
const langIdx = args.indexOf('--lang')
const RAW_LANG = langIdx >= 0 ? args[langIdx + 1] : 'ko'
export const LANG: 'ko' | 'en' = RAW_LANG === 'en' ? 'en' : 'ko'

// --- 엔진: Faction 은 Gemini 전용 (ElevenLabs 는 사용자 전담) ---
// --engine 을 받긴 하되 gemini / gemini-v3 만 인정한다. elevenlabs 지정 시 거부.
const engineIdx = args.indexOf('--engine')
const RAW_ENGINE = engineIdx >= 0 ? args[engineIdx + 1] : 'gemini'
if (RAW_ENGINE === 'elevenlabs') {
  console.error('✗ Faction 은 Gemini 전용이다. ElevenLabs 셀럽 보이스는 사용자 전담(자동 생성 차단).')
  process.exit(1)
}
export const GEMINI_MODEL = RAW_ENGINE === 'gemini-v3' ? MODEL_GEMINI_31 : MODEL_GEMINI_25

// --- API 키 시작 인덱스 (--start-key N, 1-based) ---
const startKeyIdx = args.indexOf('--start-key')
export const START_KEY_INDEX = startKeyIdx >= 0 ? Number(args[startKeyIdx + 1]) : 1

// --- 경로 ---
export const FACTION_DIR = path.join(ROOT, 'public', 'factions', EPISODE_NAME)
export const DATA_PATH = path.join(FACTION_DIR, 'data.json')
export const VOICE_DIR = path.join(FACTION_DIR, 'voice')

// --- 플래그 ---
export const DRY_RUN = args.includes('--dry-run')
export const LIST_ONLY = args.includes('--list')
export const FORCE_ALL = args.includes('--force')
export const NORMALIZE = args.includes('--normalize')
export const INIT_MANIFEST = args.includes('--init-manifest')
export const UPDATE_JSON = args.includes('--update-json')

const onlyIdx = args.indexOf('--only')
const onlyArgValue = onlyIdx >= 0 ? args[onlyIdx + 1] : undefined
export const ONLY_TARGETS = onlyArgValue && !onlyArgValue.startsWith('--')
  ? onlyArgValue.split(',').map(s => s.trim()).filter(Boolean)
  : []
