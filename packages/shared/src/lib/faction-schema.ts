/**
 * faction-schema.ts — 팩션 데이터 ↔ DB 행 변환 단일원천(SSoT)
 *
 * faction-data.json 한 파일이 DB 4계층(에피소드·세력·묶음·인물)으로 흩어진다.
 * 이 모듈이 그 왕복(split/join)을 전담한다. 렌더·BO 어느 쪽도 이 규칙을 따로 구현하지 않는다.
 *
 * ## 절차는 series-schema 가 쥔다
 *
 * 분해·재조립·비교·체크섬의 **절차**는 시리즈 고유 지식이 없어 `series-schema.ts` 로 올렸다
 * (담화가 같은 규칙을 복제하지 않게 하기 위한 승격, 26.07.26).
 * 이 파일이 쥐는 것은 **팩션 고유 지식**뿐이다 — 어떤 필드가 컬럼인가(HOT 맵),
 * 어떤 컬럼이 NOT NULL boolean·numeric 인가, 어떤 필드가 음성 길이인가, 계층이 어떻게 겹치는가.
 * 바깥에서 보는 이름·시그니처는 승격 전과 완전히 같다(팩션 왕복 검증 95편이 그대로 통과한다).
 *
 * ## 블랙리스트 방식 — 미지 필드 자동 생존
 *
 * 화이트리스트(아는 필드만 옮김)로 짜면 **데이터에만 있고 타입에 없는 필드가 조용히 소실**된다.
 * 실측으로 그런 필드가 이미 여럿 있다 — 에피소드 `outroTitle`·`outroNote`·`_inactiveGroups`,
 * 세력 `musicLongform`, 인물 `quoteShow`·`stepCredit`·`quoteSource`·`_altQuote`.
 * 그래서 반대로 짠다: **핫 필드(DDL 컬럼)와 mined 만 빼내고 나머지 전부 `data` jsonb 에 보존**한다.
 * 새 필드가 생겨도 이 파일을 고치지 않아도 살아남는다.
 *
 * ## 핫 필드 = DDL 컬럼과 1:1
 *
 * 아래 HOT 맵은 실제 테이블 컬럼과 1:1로 맞춰야 한다(조회·정렬·조인에 쓰는 값만 승격).
 * 컬럼을 추가·제거하면 이 맵도 같이 고친다.
 *
 * ## 무손실 왕복 규칙(팩션 고유분)
 *
 * - `tagSlug`(세력)는 컬럼이 아니라 `data` 에 남긴다. `tag_id` 는 이 값을 celeb_tags 로 해소한
 *   **파생 컬럼**이라, 해소 실패(태그 미존재) 시에도 원본 문자열이 보존된다.
 * - `slug`(인물)는 컬럼이고 `celeb_id` 가 그 파생 컬럼이다(반대 방향).
 * - 나머지 공통 규칙(키 부재 ↔ null, boolean false 생략, numeric 문자열 복원)은 series-schema 참조.
 */

import {
  splitLevel as splitLevelGeneric,
  joinLevel as joinLevelGeneric,
  normalizeForCompare as normalizeGeneric,
  diffPointers as diffPointersGeneric,
  type ColumnRules,
  type CompareRules,
} from './series-schema'

export type { HotMap, SplitResult, GeneratedMarker } from './series-schema'
export {
  GENERATED_KEY, canonicalJson, stripGenerated, checksumPayload, withGenerated,
  findReplacementChars,
} from './series-schema'

import type { HotMap, SplitResult } from './series-schema'

/* ────────────────────────── 계층별 핫 필드 정의 ────────────────────────── */

/** faction_episodes — title·title_en·logline·logline_en */
export const EPISODE_HOT: HotMap = {
  title: 'title',
  titleEn: 'title_en',
  logline: 'logline',
  loglineEn: 'logline_en',
}

/**
 * longform_layout 은 핫 컬럼이지만 값 변환이 필요하다({group:index} ↔ {groupId:uuid}).
 * 그래서 일반 핫 맵에 넣지 않고 호출 측(import/export)이 변환해 넘긴다.
 * 여기서는 `data` 에서 제외되도록만 등록한다.
 */
export const EPISODE_DERIVED = ['longformLayout'] as const

/** 별 테이블로 가는 자식 배열 */
export const EPISODE_CHILDREN = ['groups'] as const

/** faction_groups */
export const GROUP_HOT: HotMap = {
  name: 'name',
  nameEn: 'name_en',
  color: 'color',
  part: 'part',
  disabled: 'disabled',
  longformOnly: 'longform_only',
}
export const GROUP_CHILDREN = ['clusters'] as const

/** faction_clusters */
export const CLUSTER_HOT: HotMap = {
  label: 'label',
  labelEn: 'label_en',
  image: 'image',
  disabled: 'disabled',
  longformOnly: 'longform_only',
}
export const CLUSTER_CHILDREN = ['people'] as const

/** faction_people */
export const PERSON_HOT: HotMap = {
  name: 'name',
  nameEn: 'name_en',
  slug: 'slug',
  org: 'org',
  mythical: 'mythical',
  epithet: 'epithet',
  epithetEn: 'epithet_en',
  lines: 'lines',
  linesEn: 'lines_en',
  image: 'image',
  quote: 'quote',
  quoteEn: 'quote_en',
  quoteChunks: 'quote_chunks',
  quoteEnChunks: 'quote_en_chunks',
  quoteOrigin: 'quote_origin',
  quoteDuration: 'quote_duration',
  epithetDuration: 'epithet_duration',
  disabled: 'disabled',
  longformOnly: 'longform_only',
}

/** 어록 채굴 뱅크 — mined jsonb 한 칸으로 묶는다 */
export const PERSON_MINED = ['minedQuotes', 'minedNote'] as const

/** NOT NULL boolean 컬럼 — false 는 키 부재와 동의어(join 에서 생략) */
export const BOOL_COLS = new Set(['disabled', 'longform_only', 'mythical'])

/** numeric 컬럼 — PostgREST 가 문자열로 돌려주므로 join 에서 Number 로 되돌린다 */
export const NUMERIC_COLS = new Set(['quote_duration', 'epithet_duration'])

/** 팩션 컬럼 성질 — series-schema 절차에 주입한다 */
const COLUMN_RULES: ColumnRules = { boolCols: BOOL_COLS, numericCols: NUMERIC_COLS }

/* ────────────────────────── 범용 분해·재조립(팩션 규칙 고정) ────────────────────────── */

/**
 * 한 계층을 핫 컬럼 + 나머지(data)로 가른다. 절차는 series-schema, 규칙은 팩션 것.
 *
 * @param obj    원본 JSON 객체 (가공 없이 그대로 받는다)
 * @param hot    JSON 키 → 컬럼명
 * @param drop   data 에서 제외할 키(자식 배열·별도 취급 필드)
 */
export function splitLevel(
  obj: Record<string, unknown>,
  hot: HotMap,
  drop: readonly string[] = [],
): SplitResult {
  return splitLevelGeneric(obj, hot, drop, COLUMN_RULES)
}

/**
 * 핫 컬럼 + data 를 원본 JSON 구조로 되돌린다.
 *
 * @param row  DB 행 (컬럼명 기준)
 * @param hot  JSON 키 → 컬럼명
 */
export function joinLevel(
  row: Record<string, unknown>,
  hot: HotMap,
): Record<string, unknown> {
  return joinLevelGeneric(row, hot, COLUMN_RULES)
}

/* ────────────────────────── 계층별 래퍼 ────────────────────────── */

/** 에피소드 — groups·longformLayout 을 뺀 나머지가 data */
export function splitEpisode(script: Record<string, unknown>): SplitResult {
  return splitLevel(script, EPISODE_HOT, [...EPISODE_CHILDREN, ...EPISODE_DERIVED])
}

/**
 * 에피소드 재조립.
 * @param row              faction_episodes 행
 * @param groups           재조립한 세력 배열
 * @param longformLayout   uuid → index 로 되돌린 배치(없으면 생략)
 */
export function joinEpisode(
  row: Record<string, unknown>,
  groups: Record<string, unknown>[],
  longformLayout?: unknown[],
): Record<string, unknown> {
  const out = joinLevel(row, EPISODE_HOT)
  if (longformLayout) out.longformLayout = longformLayout
  out.groups = groups
  return out
}

/** 세력 — clusters 를 뺀 나머지가 data(tagSlug 포함) */
export function splitGroup(group: Record<string, unknown>): SplitResult {
  return splitLevel(group, GROUP_HOT, GROUP_CHILDREN)
}

export function joinGroup(
  row: Record<string, unknown>,
  clusters: Record<string, unknown>[],
): Record<string, unknown> {
  const out = joinLevel(row, GROUP_HOT)
  out.clusters = clusters
  return out
}

/** 묶음 — people 을 뺀 나머지가 data */
export function splitCluster(cluster: Record<string, unknown>): SplitResult {
  return splitLevel(cluster, CLUSTER_HOT, CLUSTER_CHILDREN)
}

export function joinCluster(
  row: Record<string, unknown>,
  people: Record<string, unknown>[],
): Record<string, unknown> {
  const out = joinLevel(row, CLUSTER_HOT)
  out.people = people
  return out
}

/**
 * 인물 — 핫 필드와 mined(어록 채굴) 를 빼내고 나머지가 data.
 * mined 는 두 필드가 다 없으면 null(빈 객체를 만들지 않는다).
 */
export function splitPerson(person: Record<string, unknown>): SplitResult & { mined: unknown } {
  const { cols, data } = splitLevel(person, PERSON_HOT, PERSON_MINED)
  const mined: Record<string, unknown> = {}
  for (const k of PERSON_MINED) {
    if (k in person) mined[k] = person[k]
  }
  return { cols, data, mined: Object.keys(mined).length ? mined : null }
}

export function joinPerson(row: Record<string, unknown>): Record<string, unknown> {
  const out = joinLevel(row, PERSON_HOT)
  const mined = row.mined as Record<string, unknown> | null | undefined
  if (mined) {
    for (const k of PERSON_MINED) {
      if (k in mined) out[k] = mined[k]
    }
  }
  return out
}

/* ────────────────────────── 왕복 비교용 정규화 ────────────────────────── */

/** 소수 2자리로 맞출 필드 — 음성 길이는 파이프라인이 2자리로 기록한다 */
const DURATION_KEYS = new Set(['quoteDuration', 'epithetDuration'])

/** false 를 키 부재와 동일하게 볼 필드(NOT NULL boolean 컬럼의 JSON 이름) */
const BOOL_JSON_KEYS = new Set(['disabled', 'longformOnly', 'mythical'])

/** 팩션 비교 규칙 — series-schema 절차에 주입한다 */
const COMPARE_RULES: CompareRules = { durationKeys: DURATION_KEYS, boolJsonKeys: BOOL_JSON_KEYS }

/**
 * 왕복 비교용 정규화(팩션 규칙 고정). 상세 규칙은 series-schema.normalizeForCompare 참조.
 */
export function normalizeForCompare(value: unknown, key?: string): unknown {
  return normalizeGeneric(value, COMPARE_RULES, key)
}

/** 정규화 후 차이가 나는 지점을 JSON Pointer 로 전량 수집한다 */
export function diffPointers(a: unknown, b: unknown, base = ''): string[] {
  return diffPointersGeneric(a, b, COMPARE_RULES, base)
}
