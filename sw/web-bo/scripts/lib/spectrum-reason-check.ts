/**
 * 스펙트럼 근거문 중복 검수 — 감사(`celeb:audit:spectrum`)와 반영 게이트(`celeb:fill`)가 함께 쓴다.
 *
 * 26.08.13 배치에서 직군 기본값 문구가 여러 인물에게 그대로 복제됐다. 같은 그룹의 두 멤버가
 * 16축 중 15축을 글자 그대로 공유했고, 같은 근거문에 다른 점수가 붙어 문장이 점수를 설명하지
 * 못했다. 이 모듈은 그 두 결함을 기계로 잡는다.
 *
 * 판정 규칙 — 인물 사이 비교(`findReasonIssues`)
 *  - ERROR `score-spread`  : 같은 축·같은 근거문에 점수가 둘 이상. 무력은 여성 보정이 점수만 바꾸므로 성별 안에서 비교한다.
 *  - ERROR `over-shared`   : 같은 축·같은 근거문을 MAX_REASON_SHARE명을 넘겨 공유.
 *  - ERROR `pair-overlap`  : 두 인물이 MAX_PAIR_OVERLAP축을 넘겨 같은 근거문을 공유(한 인물을 복사한 흔적).
 *  - WARN  `generic`       : 행적 없이 직군 평균·정보 부족만 적은 문구.
 *
 * 판정 규칙 — 근거문 한 줄 안에서(`findContentIssues`)
 *  26.08.29 재채점 릴레이에서 서브에이전트 산출물의 약 70%를 손으로 고쳐야 했다. 아래 다섯은 그중
 *  기계로 잡히는 유형이라 규칙으로 내렸다. 나머지(인물·작품 혼동, 정치 성향 과잉 추정)는 사람이 본다.
 *  - ERROR `private-info`  : 질병·치료·가족·열애·종교·MBTI 같은 사적 신상. 어떤 축의 근거로도 쓰지 않는다.
 *  - ERROR `proxy-credit`  : 팬덤·팬클럽 명의 기부를 본인 행위로 적은 것.
 *  - ERROR `length`        : 15자 미만·40자 초과. 화면 한 줄에 들어가야 한다.
 *  - ERROR `floor`         : 「확인 안 됨」류 문구인데 점수가 48~52 밖. 근거가 없으면 중립대에 둔다.
 *  - WARN  `no-year`       : 연도가 없는 근거문. 행적이 아니라 인상 서술일 때가 많다.
 */

import type { SupabaseClient as DatabaseClient } from '@supabase/supabase-js'

export const MAX_REASON_SHARE = 2
export const MAX_PAIR_OVERLAP = 3

/** 행적 대신 직군 평균·정보 부족만 적은 문구. 감사 보고에서 표시하고 반영 시 경고한다. */
export const GENERIC_REASON_PATTERN =
  /일반적인|일반값|일반 멤버|일반 배우|평균|공개 정보 부족|정보 부족|정보가 부족|기본값|중립 배정|기록 없음|확인 안 됨|확인 없음|찾지 못|기록은 제한적|자료 제한적|자료는 제한적|사례 제한적|특기 사항 없음|특기할 .{0,6}(행적|기록) 없음|확인되지 않는다|확인 불가|알려진 바 없|통상적|보통 수준|평범/

/** 근거문 길이. 화면 한 줄 기준이다. */
export const REASON_MIN = 15
export const REASON_MAX = 40

/**
 * 사적 신상. 인물 평가의 근거로 삼지 않는다.
 * 배역 준비로 몸을 만든 사실(「20kg 증량」)은 행적이므로 여기 넣지 않는다. 개인의 식이·체형 관리만 막는다.
 *
 * 이 규칙은 **생존한 연예 직군**에만 적용한다(PRIVATE_INFO_PROFESSIONS). 사도 바울의 교회, 다윈의 신앙,
 * 박근혜의 부친처럼 역사·정치 인물에게는 가족·신앙·혼인이 공적 기록 그 자체라 가릴 대상이 아니다.
 */
export const PRIVATE_INFO_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['질병·치료', /투병|병으로|병 악화|병세|지병|면역력|질환|증후군|우울증|공황|정신과|수술|입원|확진|진단받|치료를 받|치료 중|후유증|망막|디스크|건강 악화|건강 이상/],
  ['식이·체형', /다이어트|식단|굶|폭식|거식|체중 관리|감량 식/],
  ['가족', /부친|모친|아버지|어머니|친누나|친형|친동생|남동생|여동생|조부|외조부|부모의|가족의 반대|부모 반대/],
  ['열애·혼인', /열애|연인|교제|결혼|이혼|약혼|재혼/],
  ['종교', /종교|신앙|교회|성당|사찰|목사|신부님|기독교|천주교|불교 신자|성경/],
  ['성격유형', /MBTI|[EI][NS][TF][JP]\b/],
]

/** 사적 신상 규칙을 적용할 직군. 본인의 사생활이 공적 기록이 아닌 사람들이다. */
export const PRIVATE_INFO_PROFESSIONS = new Set(['musician', 'actor', 'influencer', 'athlete', 'model', 'comedian', 'director'])

/**
 * 팬덤·팬클럽이 모아 낸 것을 본인 행위로 적은 것. 명의가 본인이 아니면 근거가 아니다.
 * 「팬덤을 끌어모았다」처럼 팬을 대상으로 한 서술은 걸리지 않게 기부·모금 문맥을 함께 요구한다.
 */
export const PROXY_CREDIT_PATTERN =
  /(팬덤|팬클럽|팬들|서포터즈|팬)[^,.]{0,12}(이름|명의|모아|모금)[^,.]{0,18}(기부|성금|후원|기탁|전달)/

/** 「확인 안 됨」류 — 근거를 못 찾았다고 정직하게 적은 문구. */
export const NO_RECORD_PATTERN = /확인 안 됨|확인되지 않|확인 없음|기록 없음|기록이 없|찾지 못|남아 있지 않/

/** 근거가 없을 때 중립대(48~52)에 두어야 하는 축. 깎지도 올리지도 않는다. */
export const FLOOR_AXES = new Set(['fairness', 'benevolence', 'temperance', 'reflection', 'humility'])
export const FLOOR_MIN = 48
export const FLOOR_MAX = 52

export interface ReasonRow {
  slug: string
  axis: string
  score: number
  reason_ko: string
  /** celebs.gender — true 남성, false 여성, null 미상 */
  gender: boolean | null
  /** celebs.profession — 사적 신상 규칙의 적용 여부를 가른다. 모르면 규칙을 적용한다. */
  profession?: string | null
  /** 사망 기록이 있으면 역사 인물로 보고 사적 신상 규칙을 적용하지 않는다. */
  deceased?: boolean
}

export interface ReasonIssue {
  level: 'ERROR' | 'WARN'
  code: 'score-spread' | 'over-shared' | 'pair-overlap' | 'generic'
    | 'private-info' | 'proxy-credit' | 'length' | 'floor' | 'no-year'
  axis?: string
  reason_ko?: string
  slugs: string[]
  detail: string
}

const norm = (s: string) => s.replace(/\s+/g, ' ').trim()

function groupByAxisReason(rows: ReasonRow[]): Map<string, ReasonRow[]> {
  const m = new Map<string, ReasonRow[]>()
  for (const r of rows) {
    const key = `${r.axis}|${norm(r.reason_ko)}`
    const list = m.get(key)
    if (list) list.push(r)
    else m.set(key, [r])
  }
  return m
}

/** 같은 근거문 묶음 안에서 점수가 갈리는지. 무력은 성별 보정 때문에 성별 안에서만 비교한다. */
function scoreSpread(rows: ReasonRow[]): boolean {
  const axis = rows[0]?.axis
  const buckets = new Map<string, Set<number>>()
  for (const r of rows) {
    const b = axis === 'martial' ? String(r.gender) : 'all'
    const set = buckets.get(b) ?? new Set<number>()
    set.add(r.score)
    buckets.set(b, set)
  }
  return [...buckets.values()].some(s => s.size > 1)
}

/**
 * 전체 행(현재 DB + 패치 후보)을 받아 중복 결함을 찾는다.
 * `focus`를 주면 그 인물이 포함된 결함만 돌려준다(반영 게이트용).
 */
export function findReasonIssues(rows: ReasonRow[], focus?: Set<string>): ReasonIssue[] {
  const issues: ReasonIssue[] = []
  const involves = (slugs: string[]) => !focus || slugs.some(s => focus.has(s))

  const pairAxes = new Map<string, string[]>()
  for (const group of groupByAxisReason(rows).values()) {
    // 「<연도> 이후 ~ 확인 안 됨」은 근거를 못 찾았다는 정직한 서술이라 여러 인물이 같아질 수밖에 없다.
    // 없는 사실을 사람마다 다르게 쓰라는 요구는 문구를 부풀리게 만든다. 복제 판정에서 뺀다.
    // (대신 GENERIC_REASON_PATTERN이 WARN으로 잡아 감사 보고에 그대로 남는다.)
    if (NO_RECORD_PATTERN.test(group[0].reason_ko)) continue
    const { axis, reason_ko } = group[0]
    const slugs = [...new Set(group.map(r => r.slug))].sort()
    if (slugs.length > 1) {
      // 수십 명이 공유하는 문구는 이미 over-shared로 잡힌다. 쌍 계산에서 제외해 조합 폭발을 막는다.
      if (slugs.length <= 40) {
        for (let i = 0; i < slugs.length; i++) {
          for (let j = i + 1; j < slugs.length; j++) {
            if (focus && !focus.has(slugs[i]) && !focus.has(slugs[j])) continue
            const key = `${slugs[i]}|${slugs[j]}`
            const axes = pairAxes.get(key) ?? []
            axes.push(axis)
            pairAxes.set(key, axes)
          }
        }
      }
      if (involves(slugs)) {
        if (slugs.length > MAX_REASON_SHARE) {
          issues.push({ level: 'ERROR', code: 'over-shared', axis, reason_ko, slugs,
            detail: `${axis} 근거문을 ${slugs.length}명이 공유(허용 ${MAX_REASON_SHARE}명)` })
        }
        if (scoreSpread(group)) {
          const scores = [...new Set(group.map(r => `${r.slug}:${r.score}`))].join(' ')
          issues.push({ level: 'ERROR', code: 'score-spread', axis, reason_ko, slugs,
            detail: `${axis} 같은 근거문에 다른 점수 — ${scores}` })
        }
      }
    }
  }
  for (const [key, axes] of pairAxes) {
    if (axes.length <= MAX_PAIR_OVERLAP) continue
    const slugs = key.split('|')
    if (!involves(slugs)) continue
    issues.push({ level: 'ERROR', code: 'pair-overlap', slugs,
      detail: `${slugs.join('·')} 두 인물이 ${axes.length}축 근거문을 공유: ${axes.join(',')}` })
  }
  for (const r of rows) {
    if (focus && !focus.has(r.slug)) continue
    if (GENERIC_REASON_PATTERN.test(r.reason_ko)) {
      issues.push({ level: 'WARN', code: 'generic', axis: r.axis, reason_ko: r.reason_ko, slugs: [r.slug],
        detail: `${r.axis} 행적 없는 직군 기본값 문구` })
    }
  }
  return issues
}

/**
 * 근거문 한 줄 안에서 판정한다. 인물 사이 비교가 필요 없으므로 반영 전 패치만으로도 돌릴 수 있다.
 * 조사자가 제출 전에 `pnpm celeb:spectrum:check --file <patch>` 로 직접 돌린다.
 */
export function findContentIssues(
  rows: ReasonRow[],
  opts: { yearWarning?: boolean; strictFloor?: boolean } = {},
): ReasonIssue[] {
  const issues: ReasonIssue[] = []
  const at = (r: ReasonRow, level: ReasonIssue['level'], code: ReasonIssue['code'], detail: string) =>
    issues.push({ level, code, axis: r.axis, reason_ko: r.reason_ko, slugs: [r.slug], detail })

  for (const r of rows) {
    const ko = norm(r.reason_ko)
    if (!ko) continue

    const privacyApplies = !r.deceased && (r.profession === undefined || r.profession === null
      ? true
      : PRIVATE_INFO_PROFESSIONS.has(r.profession))
    if (privacyApplies) {
      for (const [label, re] of PRIVATE_INFO_PATTERNS) {
        const m = re.exec(ko)
        if (m) at(r, 'ERROR', 'private-info', `${r.axis} 사적 신상(${label}) — 「${m[0]}」`)
      }
    }
    const proxy = PROXY_CREDIT_PATTERN.exec(ko)
    if (proxy) at(r, 'ERROR', 'proxy-credit', `${r.axis} 본인 아닌 명의의 행위 — 「${proxy[0]}」`)

    if (ko.length < REASON_MIN || ko.length > REASON_MAX) {
      at(r, 'ERROR', 'length', `${r.axis} 근거문 ${ko.length}자(허용 ${REASON_MIN}~${REASON_MAX}자)`)
    }
    // 새로 쓰는 근거문(strictFloor)은 막고, DB에 남은 옛 문구는 경고로만 센다. 「유죄판결 뒤에도 반성 기록
    // 없음」처럼 기록된 부재 자체가 근거인 경우가 옛 문구에 섞여 있어 일괄로 막으면 오탐이 된다.
    if (NO_RECORD_PATTERN.test(ko) && FLOOR_AXES.has(r.axis) && (r.score < FLOOR_MIN || r.score > FLOOR_MAX)) {
      at(r, opts.strictFloor ? 'ERROR' : 'WARN', 'floor',
        `${r.axis} 근거 없음 문구에 점수 ${r.score}(중립대 ${FLOOR_MIN}~${FLOOR_MAX})`)
    }
    // 연도 경고는 패치 한 장을 볼 때만 쓸모가 있다. DB 전체에 걸면 대부분의 옛 문구가 걸려 신호가 묻힌다.
    if (opts.yearWarning && !/\d{4}/.test(ko)) at(r, 'WARN', 'no-year', `${r.axis} 근거문에 연도 없음`)
  }
  return issues
}

const GROUPS = ['abilities', 'inner_virtues', 'outer_virtues', 'dispositions'] as const

/** `celeb_persona.persona` jsonb 하나를 축별 행으로 편다. */
export function personaToRows(
  slug: string,
  gender: boolean | null,
  persona: Record<string, unknown> | null | undefined,
  meta: { profession?: string | null; deceased?: boolean } = {},
): ReasonRow[] {
  const rows: ReasonRow[] = []
  for (const g of GROUPS) {
    for (const [axis, v] of Object.entries((persona?.[g] ?? {}) as Record<string, unknown>)) {
      if (v == null || typeof v !== 'object') continue
      const entry = v as { score?: unknown; reason_ko?: unknown }
      const reason_ko = String(entry.reason_ko ?? '').trim()
      if (!reason_ko) continue
      rows.push({ slug, axis, score: Number(entry.score), reason_ko, gender, profession: meta.profession, deceased: meta.deceased })
    }
  }
  return rows
}

export interface ReasonCeleb {
  slug: string
  nickname: string
  profession: string | null
  gender: boolean | null
  celeb_tier: string
  death_date: string | null
  publication_status: string
  updated_at: string
}

/** 모든 인물의 근거문 행을 DB에서 읽는다. 게이트와 감사가 같은 질의를 쓴다. */
export async function loadAllReasonRows(db: DatabaseClient): Promise<{ rows: ReasonRow[]; celebs: Map<string, ReasonCeleb> }> {
  const rows: ReasonRow[] = []
  const celebs = new Map<string, ReasonCeleb>()
  // persona jsonb가 커서 한 장을 크게 잡으면 statement timeout이 난다. 작게 끊고, 나면 절반으로 줄여 재시도한다.
  const page = 400
  for (let from = 0; ; ) {
    let data: unknown[] | null = null
    let taken = page
    for (const size of [page, Math.floor(page / 2), Math.floor(page / 4)]) {
      const res = await db
        .from('celeb_persona')
        .select('celeb_id,persona,updated_at,celebs!inner(slug,nickname,profession,gender,celeb_tier,death_date,publication_status)')
        .order('celeb_id')
        .range(from, from + size - 1)
      if (!res.error) { data = res.data as unknown[]; taken = size; break }
      if (size <= Math.floor(page / 4) || !/timeout/i.test(res.error.message)) {
        throw new Error(`celeb_persona 조회 실패: ${res.error.message}`)
      }
    }
    for (const r of (data ?? []) as Array<{ persona: Record<string, unknown> | null; updated_at: string; celebs: unknown }>) {
      const c = r.celebs as Omit<ReasonCeleb, 'updated_at'>
      celebs.set(c.slug, { ...c, updated_at: r.updated_at })
      rows.push(...personaToRows(c.slug, c.gender ?? null, r.persona, { profession: c.profession, deceased: Boolean(c.death_date) }))
    }
    if (!data || data.length < taken) break
    from += taken
  }
  return { rows, celebs }
}
