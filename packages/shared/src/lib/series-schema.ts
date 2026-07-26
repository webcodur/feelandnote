/**
 * series-schema.ts — 영상 시리즈 데이터 ↔ DB 행 변환의 **시리즈 무관 공통부**(SSoT)
 *
 * 팩션(faction-schema)이 먼저 세운 규칙 가운데 시리즈 고유 지식이 없는 부분만 떼어 올렸다.
 * 담화(discourse-schema)가 같은 규칙을 복제하지 않고 이 모듈을 물게 하기 위한 승격이다.
 * 시리즈별 모듈은 **HOT 맵(어떤 필드가 컬럼인가)과 규칙 집합(어떤 컬럼이 boolean·numeric인가)만**
 * 쥐고, 분해·재조립·비교·체크섬 절차는 전부 여기에 있다.
 *
 * ## 여기 있는 것
 * - `splitLevel` / `joinLevel` — 한 계층을 핫 컬럼 + 나머지(data jsonb)로 가르고 되돌린다
 * - `normalizeForCompare` / `diffPointers` — 왕복 비교용 정규화와 JSON Pointer 차이 수집
 * - `canonicalJson` / `withGenerated` / `stripGenerated` / `checksumPayload` — 내보내기 마커·체크섬
 * - `findReplacementChars` — U+FFFD(한글 깨짐) 검사
 *
 * ## 여기 없는 것 (시리즈 모듈 소유)
 * - 어떤 JSON 키가 어떤 컬럼인가(HOT 맵)
 * - 어떤 컬럼이 NOT NULL boolean 인가 · 어떤 컬럼이 numeric 인가
 * - 어떤 필드가 음성 길이라 소수 2자리로 맞춰야 하는가
 * - 계층 구조(에피소드 → 세력 → 묶음 → 인물 / 에피소드 → 인물 · 발언)
 *
 * ## 무손실 왕복 규칙 (시리즈 공통)
 * - `undefined`(키 부재) ↔ 컬럼 `null`: join 은 null 컬럼의 키를 **생략**한다(빈 키를 만들지 않는다).
 * - NOT NULL boolean 컬럼은 기본 false. join 에서 false 는 생략한다(키 부재와 동의어).
 * - numeric 컬럼은 PostgREST 가 **문자열**로 돌려준다. join 에서 Number 로 되돌린다.
 *   안 하면 "3.5" ≠ 3.5 로 왕복이 깨진다.
 * - 자식 배열은 별 테이블로 가므로 `data` 에서 제외하고, join 에서 호출 측이 재조립해 끼운다.
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

/** 컬럼 성질 — 시리즈별 DDL 에서 온다 */
export interface ColumnRules {
  /** NOT NULL boolean 컬럼명 집합. null 을 못 받으므로 키 부재를 false 로 채운다 */
  boolCols: ReadonlySet<string>
  /** numeric 컬럼명 집합. PostgREST 가 문자열로 돌려주므로 join 에서 되돌린다 */
  numericCols: ReadonlySet<string>
}

/** 왕복 비교 시 값의 뜻을 정하는 규칙 — 시리즈별 필드 이름에서 온다 */
export interface CompareRules {
  /** 소수 2자리로 맞출 JSON 키(음성 길이) — 파이프라인이 2자리로 기록한다 */
  durationKeys: ReadonlySet<string>
  /** false 를 키 부재와 동일하게 볼 JSON 키(NOT NULL boolean 컬럼의 JSON 이름) */
  boolJsonKeys: ReadonlySet<string>
}

/* ────────────────────────── 범용 분해·재조립 ────────────────────────── */

/**
 * 한 계층을 핫 컬럼 + 나머지(data)로 가른다.
 *
 * @param obj    원본 JSON 객체 (가공 없이 그대로 받는다)
 * @param hot    JSON 키 → 컬럼명
 * @param drop   data 에서 제외할 키(자식 배열·별도 취급 필드)
 * @param rules  컬럼 성질
 */
export function splitLevel(
  obj: Record<string, unknown>,
  hot: HotMap,
  drop: readonly string[],
  rules: ColumnRules,
): SplitResult {
  const cols: Record<string, unknown> = {}
  for (const [jsonKey, col] of Object.entries(hot)) {
    // 키 부재 → null. JSON.parse 결과에 undefined 값은 없으므로 `in` 판정이 정확하다.
    const v = jsonKey in obj ? obj[jsonKey] : null
    // NOT NULL boolean 컬럼은 null 을 못 받는다. 키 부재 = false(join 의 생략 규칙과 대칭).
    cols[col] = v === null && rules.boolCols.has(col) ? false : v
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
 * @param row   DB 행 (컬럼명 기준)
 * @param hot   JSON 키 → 컬럼명
 * @param rules 컬럼 성질
 */
export function joinLevel(
  row: Record<string, unknown>,
  hot: HotMap,
  rules: ColumnRules,
): Record<string, unknown> {
  const data = (row.data ?? {}) as Record<string, unknown>
  const out: Record<string, unknown> = { ...data }
  for (const [jsonKey, col] of Object.entries(hot)) {
    let v = row[col]
    if (v === null || v === undefined) continue
    // NOT NULL boolean 의 false = 키 부재
    if (rules.boolCols.has(col) && v === false) continue
    // numeric 은 문자열로 온다 → 숫자로 되돌린다
    if (rules.numericCols.has(col) && typeof v === 'string') v = Number(v)
    out[jsonKey] = v
  }
  return out
}

/* ────────────────────────── 왕복 비교용 정규화 ────────────────────────── */

/**
 * 왕복 비교용 정규화.
 *
 * - 객체 키 순서 무시(정렬해 재구성) — jsonb 가 키 순서를 보존하지 않는다.
 * - `undefined` ≡ 키 부재 — 키를 지운다.
 * - 빈 배열·빈 객체 ≡ 부재 — 키를 지운다.
 * - `rules.boolJsonKeys` 의 false ≡ 부재.
 * - `rules.durationKeys` 의 숫자는 소수 2자리로 맞춘다.
 * - 그 외 값은 **손대지 않는다**(문자열·숫자 정확 비교).
 */
export function normalizeForCompare(value: unknown, rules: CompareRules, key?: string): unknown {
  if (value === undefined) return undefined
  if (value === null) return null
  if (Array.isArray(value)) {
    const arr = value.map(v => normalizeForCompare(v, rules))
    return arr.length === 0 ? undefined : arr
  }
  if (typeof value === 'object') {
    const src = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(src).sort()) {
      const nv = normalizeForCompare(src[k], rules, k)
      if (nv === undefined) continue
      out[k] = nv
    }
    return Object.keys(out).length === 0 ? undefined : out
  }
  if (typeof value === 'boolean') {
    if (value === false && key && rules.boolJsonKeys.has(key)) return undefined
    return value
  }
  if (typeof value === 'number' && key && rules.durationKeys.has(key)) {
    return Math.round(value * 100) / 100
  }
  return value
}

/** 정규화 후 차이가 나는 지점을 JSON Pointer 로 전량 수집한다 */
export function diffPointers(a: unknown, b: unknown, rules: CompareRules, base = ''): string[] {
  const na = normalizeForCompare(a, rules)
  const nb = normalizeForCompare(b, rules)
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

/* ────────────────────────── 내보내기 마커·체크섬 ────────────────────────── */

/**
 * 내보내기 마커 키 — 파일 첫 키로 박는다.
 * 렌더 로더는 미지의 최상위 키를 그대로 흘려보내므로 무해하다.
 */
export const GENERATED_KEY = '_generated'

export interface GeneratedMarker {
  /** 산출 원천 — 항상 'db' */
  from: string
  /** 산출 시각(ISO) */
  at: string
  /** <시리즈>_episodes.id */
  episodeId: string
  /** 마커 자신을 뺀 문서의 정규 직렬화 sha1 */
  checksum: string
}

/**
 * 체크섬용 정규 직렬화 — 키를 정렬해 순서에 흔들리지 않게 만든다.
 *
 * ⚠ 여기서는 **값을 손대지 않는다**(normalizeForCompare 와 다르다). 빈 배열·false 를 지우면
 * 사람이 그런 값을 넣은 손 편집을 놓치기 때문이다. 체크섬은 "글자 한 자라도 바뀌었나"를 봐야 한다.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const src = value as Record<string, unknown>
  const parts = Object.keys(src).sort()
    .filter(k => src[k] !== undefined)
    .map(k => `${JSON.stringify(k)}:${canonicalJson(src[k])}`)
  return `{${parts.join(',')}}`
}

/** 마커를 제외한 문서 사본 */
export function stripGenerated(doc: Record<string, unknown>): Record<string, unknown> {
  const { [GENERATED_KEY]: _omit, ...rest } = doc
  return rest
}

/**
 * 마커를 뺀 문서의 체크섬. sha1 계산은 호출 측에서 주입한다
 * (packages/shared 는 node:crypto 에 의존하지 않는다 — 브라우저 번들에도 실린다).
 */
export function checksumPayload(doc: Record<string, unknown>): string {
  return canonicalJson(stripGenerated(doc))
}

/** 문서 맨 앞에 마커를 박는다(키 순서 = 첫 키) */
export function withGenerated(
  doc: Record<string, unknown>, marker: GeneratedMarker,
): Record<string, unknown> {
  return { [GENERATED_KEY]: marker, ...stripGenerated(doc) }
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
