/**
 * discourse-schema.ts — 담화 데이터 ↔ DB 행 변환 단일원천(SSoT)
 *
 * 담화 한 편은 디스크에 **세 파일**로 나뉘어 있다(discourse-data.json 메타 / cast.json 인물 /
 * turns.json 발언). 그 셋을 합친 한 벌(DiscourseScript)이 DB 3테이블로 흩어지고, 이 모듈이
 * 그 왕복(split/join)을 전담한다. 렌더·BO 어느 쪽도 이 규칙을 따로 구현하지 않는다.
 *
 * ## 절차는 series-schema, 지식은 여기
 *
 * 분해·재조립·비교·체크섬 **절차**는 `series-schema.ts` 가 쥔다(팩션과 공유. 복제 금지).
 * 이 파일은 담화 고유 지식만 쥔다 — HOT 맵, 컬럼 성질, 음성 길이 필드, 세 파일 분해 규칙.
 *
 * ## 블랙리스트 방식 — 미지 필드 자동 생존
 *
 * 핫 필드(DDL 컬럼)와 파생 필드만 빼내고 **나머지 전부 `data` jsonb 에 보존**한다.
 * 담화는 실측상 선언 외 필드가 0건이지만(팩션은 12종+였다), 새 필드가 생겨도 이 파일을
 * 고치지 않고 살아남게 하려는 규칙은 같다.
 *
 * ## 담화 고유 규칙
 *
 * - `Turn.cast`(정수) → `speaker_id`(FK) 로 승격한다. 정수는 컬럼도 data 도 아닌 **파생 제외** 대상이라
 *   재조립에서 인물 배열 위치로 되돌린다. `to` 도 같다(`to_speaker_id`).
 * - `longformLayout` 의 `{ turn: n }` 은 **정수 그대로** 둔다. 행 참조가 아니라 경계 위치이고
 *   n = turns.length(맨 끝)가 실사용이라 UUID 로 표현할 수 없다. 따라서 값 변환이 없어
 *   일반 핫 컬럼으로 다룬다(팩션 longform_layout 과 다른 점).
 * - `slug`(인물)는 컬럼이고 `celeb_id` 가 그 파생 컬럼이다. DB CELEB 해소 실패는 저장 전 오류다.
 */

import {
  splitLevel as splitLevelGeneric,
  joinLevel as joinLevelGeneric,
  normalizeForCompare as normalizeGeneric,
  diffPointers as diffPointersGeneric,
  type ColumnRules,
  type CompareRules,
  type HotMap,
  type SplitResult,
} from './series-schema'

export type { HotMap, SplitResult, GeneratedMarker } from './series-schema'
export {
  GENERATED_KEY, canonicalJson, stripGenerated, checksumPayload, withGenerated,
  findReplacementChars,
} from './series-schema'

/* ────────────────────────── 계층별 핫 필드 정의 ────────────────────────── */

/** discourse_episodes — 제목·논제·시작문구·고지 + 롱폼 배치 */
export const EPISODE_HOT: HotMap = {
  title: 'title',
  titleEn: 'title_en',
  topic: 'topic',
  topicEn: 'topic_en',
  logline: 'logline',
  loglineEn: 'logline_en',
  notice: 'notice',
  noticeEn: 'notice_en',
  longformLayout: 'longform_layout',
}

/** 별 테이블로 가는 자식 배열 */
export const EPISODE_CHILDREN = ['cast', 'turns'] as const

/** discourse_speakers */
export const SPEAKER_HOT: HotMap = {
  name: 'name',
  nameEn: 'name_en',
  slug: 'slug',
  lines: 'lines',
  linesEn: 'lines_en',
  epithet: 'epithet',
  epithetEn: 'epithet_en',
  epithetDuration: 'epithet_duration',
  era: 'era',
  color: 'color',
  image: 'image',
  living: 'living',
  mythical: 'mythical',
  disabled: 'disabled',
}

/** discourse_turns */
export const TURN_HOT: HotMap = {
  kind: 'kind',
  text: 'text',
  textEn: 'text_en',
  chunks: 'chunks',
  chunksEn: 'chunks_en',
  origin: 'origin',
  originRef: 'origin_ref',
  image: 'image',
  part: 'part',
  duration: 'duration',
  gainDb: 'gain_db',
  playbackRate: 'playback_rate',
  disabled: 'disabled',
}

/**
 * 발언자 지시 필드 — 컬럼(speaker_id·to_speaker_id)의 원본이라 `data` 에 남기지 않는다.
 * 재조립에서 인물 배열 위치로 되돌린다.
 */
export const TURN_DERIVED = ['cast', 'to'] as const

/** NOT NULL boolean 컬럼 — false 는 키 부재와 동의어(join 에서 생략) */
export const BOOL_COLS = new Set(['disabled', 'living', 'mythical'])

/** numeric 컬럼 — PostgREST 가 문자열로 돌려주므로 join 에서 Number 로 되돌린다 */
export const NUMERIC_COLS = new Set(['epithet_duration', 'duration', 'gain_db', 'playback_rate'])

const COLUMN_RULES: ColumnRules = { boolCols: BOOL_COLS, numericCols: NUMERIC_COLS }

/* ────────────────────────── 범용 분해·재조립(담화 규칙 고정) ────────────────────────── */

export function splitLevel(
  obj: Record<string, unknown>,
  hot: HotMap,
  drop: readonly string[] = [],
): SplitResult {
  return splitLevelGeneric(obj, hot, drop, COLUMN_RULES)
}

export function joinLevel(
  row: Record<string, unknown>,
  hot: HotMap,
): Record<string, unknown> {
  return joinLevelGeneric(row, hot, COLUMN_RULES)
}

/* ────────────────────────── 계층별 래퍼 ────────────────────────── */

/** 에피소드 — cast·turns 를 뺀 나머지가 data */
export function splitEpisode(script: Record<string, unknown>): SplitResult {
  return splitLevel(script, EPISODE_HOT, EPISODE_CHILDREN)
}

/**
 * 에피소드 재조립.
 * @param row   discourse_episodes 행
 * @param cast  재조립한 인물 배열
 * @param turns 재조립한 발언 배열
 */
export function joinEpisode(
  row: Record<string, unknown>,
  cast: Record<string, unknown>[],
  turns: Record<string, unknown>[],
): Record<string, unknown> {
  const out = joinLevel(row, EPISODE_HOT)
  out.cast = cast
  out.turns = turns
  return out
}

/** 인물 — 핫 필드를 뺀 나머지가 data(voice·imageCrop·holdMotion·transition) */
export function splitSpeaker(speaker: Record<string, unknown>): SplitResult {
  return splitLevel(speaker, SPEAKER_HOT)
}

export function joinSpeaker(row: Record<string, unknown>): Record<string, unknown> {
  return joinLevel(row, SPEAKER_HOT)
}

/** 발언 — 핫 필드와 발언자 지시(cast·to)를 뺀 나머지가 data(imageChanges·imageCrop·voice 등) */
export function splitTurn(turn: Record<string, unknown>): SplitResult {
  return splitLevel(turn, TURN_HOT, TURN_DERIVED)
}

/**
 * 발언 재조립.
 * @param row       discourse_turns 행
 * @param castIndex speaker_id 를 인물 배열 위치로 되돌린 값
 * @param toIndex   to_speaker_id 를 되돌린 값(없으면 키를 만들지 않는다)
 */
export function joinTurn(
  row: Record<string, unknown>,
  castIndex: number,
  toIndex?: number,
): Record<string, unknown> {
  const out = joinLevel(row, TURN_HOT)
  out.cast = castIndex
  if (toIndex !== undefined) out.to = toIndex
  return out
}

/* ────────────────────────── 세 파일 분해·병합 ────────────────────────── */

/** 디스크에 나뉘어 있는 세 조각 */
export interface DiscourseFileSet {
  /** discourse-data.json — 메타·편성. cast·turns 가 여기 남으면 값이 두 곳에 생겨 갈린다 */
  meta: Record<string, unknown>
  /** cast.json — Speaker[] */
  cast: unknown[]
  /** turns.json — Turn[] */
  turns: unknown[]
}

/**
 * 한 벌 → 세 파일. `discourse-utils.ts:95 saveDiscourseEpisode` 와 **같은 규칙**이어야 한다.
 * (왕복 검증 ② 가 이 불변식을 지킨다)
 */
export function splitDiscourseFiles(script: Record<string, unknown>): DiscourseFileSet {
  const { cast, turns, ...meta } = script
  return {
    meta,
    cast: (cast ?? []) as unknown[],
    turns: (turns ?? []) as unknown[],
  }
}

/** 세 파일 → 한 벌. 로더(`Discourse/script.ts:120 loadEpisode`)와 같은 규칙 */
export function mergeDiscourseFiles(
  meta: Record<string, unknown>, cast: unknown[], turns: unknown[],
): Record<string, unknown> {
  return { ...meta, cast, turns }
}

/* ────────────────────────── 왕복 비교용 정규화 ────────────────────────── */

/** 소수 2자리로 맞출 필드 — 음성 길이는 파이프라인이 2자리로 기록한다 */
const DURATION_KEYS = new Set(['duration', 'epithetDuration'])

/** false 를 키 부재와 동일하게 볼 필드(NOT NULL boolean 컬럼의 JSON 이름) */
const BOOL_JSON_KEYS = new Set(['disabled', 'living', 'mythical'])

const COMPARE_RULES: CompareRules = { durationKeys: DURATION_KEYS, boolJsonKeys: BOOL_JSON_KEYS }

/** 왕복 비교용 정규화(담화 규칙 고정). 상세는 series-schema.normalizeForCompare 참조 */
export function normalizeForCompare(value: unknown, key?: string): unknown {
  return normalizeGeneric(value, COMPARE_RULES, key)
}

/** 정규화 후 차이가 나는 지점을 JSON Pointer 로 전량 수집한다 */
export function diffPointers(a: unknown, b: unknown, base = ''): string[] {
  return diffPointersGeneric(a, b, COMPARE_RULES, base)
}
