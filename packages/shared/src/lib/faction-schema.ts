/**
 * faction-schema.ts — 팩션 데이터 ↔ DB 행 변환 단일원천(SSoT)
 *
 * faction-data.json 한 파일이 DB 4계층(에피소드·세력·묶음·인물)으로 흩어진다.
 * 이 모듈이 그 왕복(split/join)을 전담한다. 렌더·BO 어느 쪽도 이 규칙을 따로 구현하지 않는다.
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
 * ## 무손실 왕복 규칙
 *
 * - `undefined`(키 부재) ↔ 컬럼 `null`: join 은 null 컬럼의 키를 **생략**한다(빈 키를 만들지 않는다).
 * - NOT NULL boolean(`disabled`·`longform_only`·`mythical`)은 기본 false. 원본 JSON 에 explicit
 *   `false` 는 실측 0건이고 의미도 키 부재와 동일하므로 join 에서 false 는 생략한다.
 * - numeric 컬럼(`quote_duration`·`epithet_duration`)은 PostgREST 가 **문자열**로 돌려준다.
 *   join 에서 Number 로 되돌린다. 안 하면 "3.5" ≠ 3.5 로 왕복이 깨진다.
 * - 자식 배열(`groups`·`clusters`·`people`)은 별 테이블로 가므로 `data` 에서 제외하고,
 *   join 에서 호출 측이 재조립해 끼운다.
 * - `tagSlug`(세력)는 컬럼이 아니라 `data` 에 남긴다. `tag_id` 는 이 값을 celeb_tags 로 해소한
 *   **파생 컬럼**이라, 해소 실패(태그 미존재) 시에도 원본 문자열이 보존된다.
 * - `slug`(인물)는 컬럼이고 `celeb_id` 가 그 파생 컬럼이다(반대 방향).
 */

/** JSON 키 → DB 컬럼명 */
export type HotMap = Record<string, string>

/** 한 계층의 분해 결과 */
export interface SplitResult {
  /** 핫 컬럼 값 (컬럼명 기준). 키 부재는 null */
  cols: Record<string, unknown>
  /** 나머지 전부 — jsonb 로 보존 */
  data: Record<string, unknown>
}

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

/* ────────────────────────── 범용 분해·재조립 ────────────────────────── */

/**
 * 한 계층을 핫 컬럼 + 나머지(data)로 가른다.
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
  const cols: Record<string, unknown> = {}
  for (const [jsonKey, col] of Object.entries(hot)) {
    // 키 부재 → null. JSON.parse 결과에 undefined 값은 없으므로 `in` 판정이 정확하다.
    const v = jsonKey in obj ? obj[jsonKey] : null
    // NOT NULL boolean 컬럼은 null 을 못 받는다. 키 부재 = false(join 의 생략 규칙과 대칭).
    cols[col] = v === null && BOOL_COLS.has(col) ? false : v
  }
  const excluded = new Set<string>([...Object.keys(hot), ...drop])
  const data: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (!excluded.has(k)) data[k] = v
  }
  return { cols, data }
}

/**
 * 핫 컬럼 + data 를 원본 JSON 구조로 되돌린다.
 *
 * data 를 펼친 위에 핫 컬럼을 얹는다. null·undefined 컬럼은 **키를 만들지 않는다**.
 * NOT NULL boolean 의 false, numeric 의 문자열도 여기서 정리한다.
 *
 * @param row  DB 행 (컬럼명 기준)
 * @param hot  JSON 키 → 컬럼명
 */
export function joinLevel(
  row: Record<string, unknown>,
  hot: HotMap,
): Record<string, unknown> {
  const data = (row.data ?? {}) as Record<string, unknown>
  const out: Record<string, unknown> = { ...data }
  for (const [jsonKey, col] of Object.entries(hot)) {
    let v = row[col]
    if (v === null || v === undefined) continue
    // NOT NULL boolean 의 false = 키 부재
    if (BOOL_COLS.has(col) && v === false) continue
    // numeric 은 문자열로 온다 → 숫자로 되돌린다
    if (NUMERIC_COLS.has(col) && typeof v === 'string') v = Number(v)
    out[jsonKey] = v
  }
  return out
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

/**
 * 왕복 비교용 정규화.
 *
 * - 객체 키 순서 무시(정렬해 재구성) — jsonb 가 키 순서를 보존하지 않는다.
 * - `undefined` ≡ 키 부재 — 키를 지운다.
 * - 빈 배열·빈 객체 ≡ 부재 — 키를 지운다.
 * - `disabled`·`longformOnly`·`mythical` 의 false ≡ 부재.
 * - 음성 길이는 소수 2자리로 맞춘다.
 * - 그 외 값은 **손대지 않는다**(문자열·숫자 정확 비교).
 */
export function normalizeForCompare(value: unknown, key?: string): unknown {
  if (value === undefined) return undefined
  if (value === null) return null
  if (Array.isArray(value)) {
    const arr = value.map(v => normalizeForCompare(v))
    return arr.length === 0 ? undefined : arr
  }
  if (typeof value === 'object') {
    const src = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(src).sort()) {
      const nv = normalizeForCompare(src[k], k)
      if (nv === undefined) continue
      out[k] = nv
    }
    return Object.keys(out).length === 0 ? undefined : out
  }
  if (typeof value === 'boolean') {
    if (value === false && key && BOOL_JSON_KEYS.has(key)) return undefined
    return value
  }
  if (typeof value === 'number' && key && DURATION_KEYS.has(key)) {
    return Math.round(value * 100) / 100
  }
  return value
}

/** 정규화 후 차이가 나는 지점을 JSON Pointer 로 전량 수집한다 */
export function diffPointers(a: unknown, b: unknown, base = ''): string[] {
  const na = normalizeForCompare(a)
  const nb = normalizeForCompare(b)
  return collect(na, nb, base)
}

const esc = (k: string) => k.replace(/~/g, '~0').replace(/\//g, '~1')

function collect(a: unknown, b: unknown, ptr: string): string[] {
  if (a === undefined && b === undefined) return []
  if (a === undefined) return [`${ptr || '/'} (원본 없음 → 왕복 ${brief(b)})`]
  if (b === undefined) return [`${ptr || '/'} (원본 ${brief(a)} → 왕복 없음)`]

  const aArr = Array.isArray(a)
  const bArr = Array.isArray(b)
  if (aArr !== bArr) return [`${ptr || '/'} (형 불일치: ${aArr ? '배열' : typeof a} vs ${bArr ? '배열' : typeof b})`]

  if (aArr && bArr) {
    const out: string[] = []
    const n = Math.max(a.length, b.length)
    if (a.length !== b.length) out.push(`${ptr || '/'} (길이 ${a.length} vs ${b.length})`)
    for (let i = 0; i < n; i++) out.push(...collect(a[i], b[i], `${ptr}/${i}`))
    return out
  }

  const aObj = typeof a === 'object' && a !== null
  const bObj = typeof b === 'object' && b !== null
  if (aObj !== bObj) return [`${ptr || '/'} (형 불일치: ${typeof a} vs ${typeof b})`]

  if (aObj && bObj) {
    const ao = a as Record<string, unknown>
    const bo = b as Record<string, unknown>
    const keys = [...new Set([...Object.keys(ao), ...Object.keys(bo)])].sort()
    const out: string[] = []
    for (const k of keys) out.push(...collect(ao[k], bo[k], `${ptr}/${esc(k)}`))
    return out
  }

  if (a !== b) return [`${ptr || '/'} (${brief(a)} ≠ ${brief(b)})`]
  return []
}

function brief(v: unknown): string {
  if (typeof v === 'string') return v.length > 60 ? `"${v.slice(0, 60)}…"` : `"${v}"`
  return JSON.stringify(v) ?? String(v)
}

/** 한글 깨짐(U+FFFD) 검사 — DB 왕복에서 인코딩이 상했는지 본다 */
export function findReplacementChars(value: unknown, ptr = ''): string[] {
  if (typeof value === 'string') return value.includes('�') ? [ptr || '/'] : []
  if (Array.isArray(value)) return value.flatMap((v, i) => findReplacementChars(v, `${ptr}/${i}`))
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .flatMap(([k, v]) => findReplacementChars(v, `${ptr}/${esc(k)}`))
  }
  return []
}
