'use server'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { STATIC_REVALIDATE, cachedList, cachedDetail, throwOnQueryError } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { getReviewCelebIdsCached } from './reviewCelebIds'
import type { SpectrumJsonb, SpectrumProfile, SpectrumStats } from '@/lib/spectrum/types'
import { parseSpectrumJsonb } from '@/lib/spectrum/types'
import {
  calcSpectrumMatchDistances,
  calcEmphasizedAbilitySimilarity,
  calcEmphasizedVirtueSimilarity,
  calcPopulationStats,
  getEmphasizedAbilityEvidence,
  getEmphasizedAbilityVector,
  getEmphasizedVirtueEvidence,
  getEmphasizedVirtueVector,
  getSpectrumHighlights,
  getSpectrumMatchComparison,
  getSpectrumMatchEvidence,
  groupedDistanceToMatchPercent,
  toPopulationAdjustedStats,
  type SpectrumHighlight,
  type SpectrumMatch,
  type SpectrumMatchCategory,
  type SpectrumMatchGroups,
  type SimilarCeleb,
} from '@/lib/spectrum/utils'
import {
  ABILITY_KEYS,
  INNER_VIRTUE_KEYS,
  OUTER_VIRTUE_KEYS,
  STAT_KEYS,
  TENDENCY_KEYS,
  VIRTUE_KEYS,
} from '@/lib/spectrum/constants'

export interface SimilarByCelebResult {
  targetSpectrum: SpectrumProfile | null
  targetSpectrumJsonb: SpectrumJsonb | null
  similarCelebs: SimilarCeleb[]
  matchesByCategory: SpectrumMatchGroups
  /** 인물 지문 — 집단에서 크게 벗어난 축 (이탈 큰 순) */
  highlights: SpectrumHighlight[]
  /** 비교 모집단(활성 인물) 수. 지문 문구의 "N명 중"에 쓴다 */
  population: number
}

const EMPTY_MATCH_GROUPS: SpectrumMatchGroups = {
  overall: [],
  disposition: [],
  virtue: [],
  ability: [],
  opposite: [],
}

const MATCH_CATEGORIES: SpectrumMatchCategory[] = [
  'overall',
  'disposition',
  'virtue',
  'ability',
  'opposite',
]

const MATCH_DIMENSIONS: Record<SpectrumMatchCategory, number> = {
  overall: 16,
  disposition: 4,
  virtue: 8,
  ability: 4,
  opposite: 4,
}

// celeb_persona + celebs 조인 행
interface SpectrumJoinProfile {
  nickname: string | null
  nickname_en: string | null
  profession: string | null
  avatar_url: string | null
  publication_status: string | null
  birth_date?: string | null
  death_date?: string | null
  title?: string | null
}

interface SpectrumJoinRow {
  celeb_id: string
  spectrum: SpectrumJsonb
  celeb: SpectrumJoinProfile | SpectrumJoinProfile[] | null
}

// 유사도 계산·유사 카드에 필요한 최소 필드만 담은 경량 벡터.
// spectrum jsonb 원본(rationale/reason 등 긴 텍스트)을 캐시에 싣지 않아
// 전체 전송량이 셀럽 수에 비례해 폭증하지 않는다.
interface SpectrumVectorRow {
  celeb_id: string
  stats: SpectrumStats
  nickname: string | null
  nickname_en: string | null
  profession: string | null
  avatar_url: string | null
}

interface RankedSpectrumMatch extends Omit<SpectrumMatch, 'evidence' | 'comparison'> {
  candidate: SpectrumProfile
}

type RankedSpectrumMatchGroups = Record<SpectrumMatchCategory, RankedSpectrumMatch[]>

function pickProfile(
  celeb: SpectrumJoinProfile | SpectrumJoinProfile[] | null
): SpectrumJoinProfile | null {
  return Array.isArray(celeb) ? (celeb[0] ?? null) : celeb
}

// celeb_persona는 persona jsonb의 16개 score를 동명의 smallint 컬럼으로도 보관한다.
// storage boundary에서 spectrum으로 alias해 이후 계층에는 물리 컬럼명을 노출하지 않는다.
// (트리거 trg_sync_persona_columns가 INSERT/UPDATE마다 동기화).
// 유사도 계산에는 score만 쓰므로 jsonb 대신 이 컬럼들만 받는다.
const SPECTRUM_STAT_KEYS = [
  ...ABILITY_KEYS,
  ...INNER_VIRTUE_KEYS,
  ...OUTER_VIRTUE_KEYS,
  ...TENDENCY_KEYS,
] as const satisfies readonly (keyof SpectrumStats)[]

// SpectrumStats의 축이 하나라도 위 목록에서 빠지면 컴파일 에러를 낸다.
// (satisfies가 "잉여 없음"을, 아래 타입이 "누락 없음"을 보장 → 16축 전수 매핑 고정)
type _AllStatKeysMapped = Exclude<keyof SpectrumStats, (typeof SPECTRUM_STAT_KEYS)[number]> extends never
  ? true
  : ['SpectrumStats 축 누락', Exclude<keyof SpectrumStats, (typeof SPECTRUM_STAT_KEYS)[number]>]
const _statKeyGuard: _AllStatKeysMapped = true
void _statKeyGuard

type SpectrumColumnRow = {
  celeb_id: string
  celeb: SpectrumJoinProfile | SpectrumJoinProfile[] | null
} & Partial<Record<(typeof SPECTRUM_STAT_KEYS)[number], number | null>>

function columnsToStats(row: SpectrumColumnRow): SpectrumStats {
  return Object.fromEntries(
    SPECTRUM_STAT_KEYS.map((k) => [k, row[k] ?? 0])
  ) as unknown as SpectrumStats
}

// 전체 celeb_persona를 셀럽·locale 무관 단일 캐시 키로 1회만 조회한다.
// 캐시에는 수치 벡터 + 카드 표시용 메타만 담아 2MB 캐시 한도를 넘기지 않는다.
// 셀럽별 유사도 계산은 이 공유 캐시 위에서 수행하므로, 크롤러가 모든
// 셀럽 페이지를 순회해도 전체 테이블 전송은 revalidate 주기당 1회로 묶인다.
//
// score 16개는 flat 컬럼으로 받는다. spectrum 통째 select는 행마다
// reason_ko/reason_en/rationale 본문을 실어 갱신 1회에 4.2MB가 나갔다(실측).
// 컬럼만 받으면 같은 행 수에 0.5MB다.
//
// 페이징은 필수다 — PostgREST가 1,000행에서 자르는 탓에 1,577명 중 577명이
// 후보에조차 오르지 못했다(실측). 어느 1,000명이 남는지는 정렬 없는 select의
// 반환 순서에 달려 특정 인물이 상시 배제됐다. celeb_id 정렬로 페이지 경계의
// 중복·누락을 막고, 덤으로 동점 인물의 노출 순서까지 요청마다 흔들리지 않게 고정된다.
//
// 공개 인물 거르기는 DB에서 한다. 전량(2,711행)을 받아 JS로 걸러 1,778행만 쓰던 때는
// 페이지가 셋이라 2,579ms가 걸렸다. 조인 조건으로 미리 좁히면 페이지가 둘로 줄어
// 712ms다(실측 26.08.14, 결과 행 수는 동일).
async function fetchAllSpectrumVectors(): Promise<SpectrumVectorRow[]> {
  const db = createStaticClient()
  const rows = await selectAllPages<SpectrumColumnRow>((from, to) =>
    db
      .from('celeb_persona')
      .select(`
        celeb_id, ${SPECTRUM_STAT_KEYS.join(', ')},
        celeb:celebs!inner (nickname, nickname_en, profession, avatar_url, publication_status)
      `)
      .eq('celeb.publication_status', 'active')
      .order('celeb_id')
      .range(from, to) as unknown as PromiseLike<{
      data: SpectrumColumnRow[] | null
      error: { message: string } | null
    }>
  )
  return rows.flatMap((row) => {
    const profile = pickProfile(row.celeb)
    if (profile?.publication_status !== 'active') return []
    return [{
      celeb_id: row.celeb_id,
      stats: columnsToStats(row),
      nickname: profile?.nickname ?? null,
      nickname_en: profile?.nickname_en ?? null,
      profession: profile?.profession ?? null,
      avatar_url: profile?.avatar_url ?? null,
    }]
  })
}

/* 성향 벡터 전량 — 한 명이 바뀌어도 비교 대상 전체가 달라지므로 목록으로 다룬다 */
const getAllSpectrumVectorsCached = () =>
  cachedList(CACHE_TAGS.SPECTRUM, ['all-spectrum-vectors'], fetchAllSpectrumVectors, {
    revalidate: STATIC_REVALIDATE,
    extraTags: [CACHE_TAGS.CELEBS],
  })

// 대상 셀럽 1명분: 레이더 근거(rationale/reason) 표시를 위해 spectrum jsonb 원본과
// 생몰일·title까지 포함해 단건 조회한다. 1행이라 캐시 한도와 무관하다.
async function fetchSpectrumByCelebId(celebId: string): Promise<SpectrumJoinRow | null> {
  const db = createStaticClient()
  const { data, error } = await db
    .from('celeb_persona')
    .select(`
      celeb_id, spectrum:persona,
      celeb:celebs!celeb_persona_celebs_fkey (nickname, nickname_en, profession, avatar_url, birth_date, death_date, title, publication_status)
    `)
    .eq('celeb_id', celebId)
    .maybeSingle()
  throwOnQueryError('getSimilarByCelebId/target', error)
  return (data as SpectrumJoinRow | null) ?? null
}

function getSpectrumByCelebIdCached(celebId: string): Promise<SpectrumJoinRow | null> {
  // 인물 한 명의 성향 — 항목 태그를 단다. 인물 자료가 바뀔 때도 함께 비워지도록 인물 도메인을 곁들인다
  return cachedDetail(CACHE_TAGS.SPECTRUM, celebId, ['spectrum-by-id-v2-query-guards', celebId], () => fetchSpectrumByCelebId(celebId), {
    extraTags: [CACHE_TAGS.CELEBS],
  })
}

function targetToProfile(row: SpectrumJoinRow, isEn: boolean): SpectrumProfile {
  const profile = pickProfile(row.celeb)
  const stats = parseSpectrumJsonb(row.spectrum)
  const nickEn = profile?.nickname_en ?? null
  return {
    celeb_id: row.celeb_id,
    nickname: isEn && nickEn ? nickEn : (profile?.nickname ?? ''),
    nickname_en: nickEn,
    profession: profile?.profession ?? null,
    avatar_url: profile?.avatar_url ?? null,
    birth_date: profile?.birth_date ?? null,
    death_date: profile?.death_date ?? null,
    title: profile?.title ?? null,
    ...stats,
  }
}

function vectorToProfile(row: SpectrumVectorRow, isEn: boolean): SpectrumProfile {
  const nickEn = row.nickname_en
  return {
    celeb_id: row.celeb_id,
    nickname: isEn && nickEn ? nickEn : (row.nickname ?? ''),
    nickname_en: nickEn,
    profession: row.profession,
    avatar_url: row.avatar_url,
    // 유사 카드에는 생몰일·title을 노출하지 않던 기존 동작 유지
    birth_date: null,
    death_date: null,
    title: null,
    ...row.stats,
  }
}

function insertTopMatch<T extends { celeb_id: string; distance: number }>(
  ranking: T[],
  candidate: T,
  limit: number,
): void {
  if (limit <= 0) return

  const insertAt = ranking.findIndex(
    (current) =>
      candidate.distance < current.distance ||
      (candidate.distance === current.distance &&
        candidate.celeb_id.localeCompare(current.celeb_id) < 0),
  )

  if (insertAt === -1) {
    if (ranking.length < limit) ranking.push(candidate)
    return
  }

  ranking.splice(insertAt, 0, candidate)
  if (ranking.length > limit) ranking.pop()
}

function toSpectrumMatch(
  candidate: SpectrumProfile,
  distance: number,
  dimensions: number,
  matchPercent?: number,
): RankedSpectrumMatch {
  return {
    celeb_id: candidate.celeb_id,
    nickname: candidate.nickname,
    avatar_url: candidate.avatar_url,
    distance,
    matchPercent:
      matchPercent ?? groupedDistanceToMatchPercent(distance, dimensions),
    candidate,
  }
}

export async function getSimilarByCelebId(
  celebId: string,
  limit: number = 5,
  locale: string = 'ko'
): Promise<SimilarByCelebResult> {
  const isEn = locale === 'en'
  const [targetRow, allVectors, reviewCelebIds] = await Promise.all([
    getSpectrumByCelebIdCached(celebId),
    getAllSpectrumVectorsCached(),
    getReviewCelebIdsCached(),
  ])

  if (!targetRow) {
    return {
      targetSpectrum: null,
      targetSpectrumJsonb: null,
      similarCelebs: [],
      matchesByCategory: EMPTY_MATCH_GROUPS,
      highlights: [],
      population: 0,
    }
  }

  const targetSpectrum = targetToProfile(targetRow, isEn)
  const targetSpectrumJsonb = targetRow.spectrum
  const populationStats = allVectors.map((row) => row.stats)
  // 능력·덕목 12축 집단 통계 — 유사도 보정·근거 선정·지문이 모두 이 위에서 돈다.
  // 덕목 8축 통계(VirtuePopulationStats)는 이 상위 집합에서 구조적으로 호환된다.
  const statStats = calcPopulationStats(populationStats, STAT_KEYS)
  const virtuePopulationStats = Object.fromEntries(
    VIRTUE_KEYS.map((axis) => [axis, statStats[axis]]),
  ) as Pick<typeof statStats, (typeof VIRTUE_KEYS)[number]>
  const abilityPopulationStats = Object.fromEntries(
    ABILITY_KEYS.map((axis) => [axis, statStats[axis]]),
  ) as Pick<typeof statStats, (typeof ABILITY_KEYS)[number]>
  const targetEmphasizedVirtues = getEmphasizedVirtueVector(
    targetSpectrum,
    virtuePopulationStats,
  )
  const targetEmphasizedAbilities = getEmphasizedAbilityVector(
    targetSpectrum,
    abilityPopulationStats,
  )
  // 유사 인물 산정은 집단 위치 보정 공간에서 — 퍼짐 넓은 축의 순위 지배를 막는다
  const adjustedTarget = toPopulationAdjustedStats(targetSpectrum, statStats)
  const highlights = getSpectrumHighlights(targetSpectrum, populationStats, statStats)

  const categoryLimit = Math.min(limit, 3)
  const rankedMatchesByCategory: RankedSpectrumMatchGroups = {
    overall: [],
    disposition: [],
    virtue: [],
    ability: [],
    opposite: [],
  }
  const similarCelebs: SimilarCeleb[] = []

  // 감상 기록이 있는 인물만 후보로 둔다 — 기록 없는 인물이 뽑히면 카드를 눌러도
  // 보여줄 것이 없다. 명단을 못 받았을 때만 전체를 후보로 되돌린다.
  const reviewers = new Set(reviewCelebIds)
  const candidateRows = reviewers.size > 0
    ? allVectors.filter((row) => reviewers.has(row.celeb_id))
    : allVectors

  for (const row of candidateRows) {
    if (row.celeb_id === celebId) continue

    const candidate = vectorToProfile(row, isEn)
    const distances = calcSpectrumMatchDistances(
      adjustedTarget,
      toPopulationAdjustedStats(row.stats, statStats),
    )
    const candidateEmphasizedVirtues = getEmphasizedVirtueVector(
      candidate,
      virtuePopulationStats,
    )
    const emphasizedVirtueSimilarity = calcEmphasizedVirtueSimilarity(
      targetEmphasizedVirtues,
      candidateEmphasizedVirtues,
    )
    const emphasizedAbilitySimilarity = calcEmphasizedAbilitySimilarity(
      targetEmphasizedAbilities,
      candidate,
      abilityPopulationStats,
    )

    insertTopMatch(
      similarCelebs,
      { ...candidate, distance: distances.overall },
      limit,
    )

    for (const category of MATCH_CATEGORIES) {
      if (category === 'virtue') {
        if (emphasizedVirtueSimilarity <= 0) continue

        insertTopMatch(
          rankedMatchesByCategory.virtue,
          toSpectrumMatch(
            candidate,
            1 - emphasizedVirtueSimilarity,
            1,
            Math.round(emphasizedVirtueSimilarity * 100),
          ),
          categoryLimit,
        )
        continue
      }

      if (category === 'ability') {
        if (emphasizedAbilitySimilarity <= 0) continue

        insertTopMatch(
          rankedMatchesByCategory.ability,
          toSpectrumMatch(
            candidate,
            1 - emphasizedAbilitySimilarity,
            1,
            Math.round(emphasizedAbilitySimilarity * 100),
          ),
          categoryLimit,
        )
        continue
      }

      insertTopMatch(
        rankedMatchesByCategory[category],
        toSpectrumMatch(
          candidate,
          distances[category],
          MATCH_DIMENSIONS[category],
        ),
        categoryLimit,
      )
    }
  }

  const matchesByCategory = Object.fromEntries(
    MATCH_CATEGORIES.map((category) => [
      category,
      rankedMatchesByCategory[category].map(({ candidate, ...match }) => ({
        ...match,
        evidence:
          category === 'virtue'
            ? getEmphasizedVirtueEvidence(
                targetSpectrum,
                candidate,
                targetEmphasizedVirtues,
                getEmphasizedVirtueVector(candidate, virtuePopulationStats),
                2,
              )
            : category === 'ability'
              ? getEmphasizedAbilityEvidence(
                  targetSpectrum,
                  candidate,
                  targetEmphasizedAbilities,
                  abilityPopulationStats,
                )
            : getSpectrumMatchEvidence(
                targetSpectrum,
                candidate,
                category,
                category === 'overall' ? 3 : 2,
                statStats,
              ),
        comparison: getSpectrumMatchComparison(
          targetSpectrum,
          candidate,
          category,
        ),
      })),
    ]),
  ) as SpectrumMatchGroups

  return {
    targetSpectrum,
    targetSpectrumJsonb,
    similarCelebs,
    matchesByCategory,
    highlights,
    population: allVectors.length,
  }
}
