'use server'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { cachedList, cachedDetail } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import type { PersonaJsonb, PersonaProfile, PersonaStats } from '@/lib/persona/types'
import { parsePersonaJsonb } from '@/lib/persona/types'
import {
  calcPersonaMatchDistances,
  calcEmphasizedVirtueSimilarity,
  calcVirtuePopulationStats,
  getEmphasizedVirtueEvidence,
  getEmphasizedVirtueVector,
  getPersonaMatchComparison,
  getPersonaMatchEvidence,
  groupedDistanceToMatchPercent,
  type PersonaMatch,
  type PersonaMatchCategory,
  type PersonaMatchGroups,
  type SimilarCeleb,
} from '@/lib/persona/utils'
import {
  ABILITY_KEYS,
  INNER_VIRTUE_KEYS,
  OUTER_VIRTUE_KEYS,
  TENDENCY_KEYS,
} from '@/lib/persona/constants'

export interface SimilarByCelebResult {
  targetPersona: PersonaProfile | null
  targetPersonaJsonb: PersonaJsonb | null
  similarCelebs: SimilarCeleb[]
  matchesByCategory: PersonaMatchGroups
}

const EMPTY_MATCH_GROUPS: PersonaMatchGroups = {
  overall: [],
  disposition: [],
  virtue: [],
  ability: [],
  opposite: [],
}

const MATCH_CATEGORIES: PersonaMatchCategory[] = [
  'overall',
  'disposition',
  'virtue',
  'ability',
  'opposite',
]

const MATCH_DIMENSIONS: Record<PersonaMatchCategory, number> = {
  overall: 16,
  disposition: 4,
  virtue: 8,
  ability: 4,
  opposite: 4,
}

// celeb_persona + celebs 조인 행
interface PersonaJoinProfile {
  nickname: string | null
  nickname_en: string | null
  profession: string | null
  avatar_url: string | null
  publication_status: string | null
  birth_date?: string | null
  death_date?: string | null
  title?: string | null
}

interface PersonaJoinRow {
  celeb_id: string
  persona: PersonaJsonb
  celeb: PersonaJoinProfile | PersonaJoinProfile[] | null
}

// 유사도 계산·유사 카드에 필요한 최소 필드만 담은 경량 벡터.
// persona jsonb 원본(rationale/reason 등 긴 텍스트)을 캐시에 싣지 않아
// 전체 전송량이 셀럽 수에 비례해 폭증하지 않는다.
interface PersonaVectorRow {
  celeb_id: string
  stats: PersonaStats
  nickname: string | null
  nickname_en: string | null
  profession: string | null
  avatar_url: string | null
}

interface RankedPersonaMatch extends Omit<PersonaMatch, 'evidence' | 'comparison'> {
  candidate: PersonaProfile
}

type RankedPersonaMatchGroups = Record<PersonaMatchCategory, RankedPersonaMatch[]>

function pickProfile(
  celeb: PersonaJoinProfile | PersonaJoinProfile[] | null
): PersonaJoinProfile | null {
  return Array.isArray(celeb) ? (celeb[0] ?? null) : celeb
}

// celeb_persona는 persona jsonb의 16개 score를 동명의 smallint 컬럼으로도 보관한다
// (트리거 trg_sync_persona_columns가 INSERT/UPDATE마다 동기화).
// 유사도 계산에는 score만 쓰므로 jsonb 대신 이 컬럼들만 받는다.
const PERSONA_STAT_KEYS = [
  ...ABILITY_KEYS,
  ...INNER_VIRTUE_KEYS,
  ...OUTER_VIRTUE_KEYS,
  ...TENDENCY_KEYS,
] as const satisfies readonly (keyof PersonaStats)[]

// PersonaStats의 축이 하나라도 위 목록에서 빠지면 컴파일 에러를 낸다.
// (satisfies가 "잉여 없음"을, 아래 타입이 "누락 없음"을 보장 → 16축 전수 매핑 고정)
type _AllStatKeysMapped = Exclude<keyof PersonaStats, (typeof PERSONA_STAT_KEYS)[number]> extends never
  ? true
  : ['PersonaStats 축 누락', Exclude<keyof PersonaStats, (typeof PERSONA_STAT_KEYS)[number]>]
const _statKeyGuard: _AllStatKeysMapped = true
void _statKeyGuard

type PersonaColumnRow = {
  celeb_id: string
  celeb: PersonaJoinProfile | PersonaJoinProfile[] | null
} & Partial<Record<(typeof PERSONA_STAT_KEYS)[number], number | null>>

function columnsToStats(row: PersonaColumnRow): PersonaStats {
  return Object.fromEntries(
    PERSONA_STAT_KEYS.map((k) => [k, row[k] ?? 0])
  ) as unknown as PersonaStats
}

// 전체 celeb_persona를 셀럽·locale 무관 단일 캐시 키로 1회만 조회한다.
// 캐시에는 수치 벡터 + 카드 표시용 메타만 담아 2MB 캐시 한도를 넘기지 않는다.
// 셀럽별 유사도 계산은 이 공유 캐시 위에서 수행하므로, 크롤러가 모든
// 셀럽 페이지를 순회해도 전체 테이블 전송은 revalidate 주기당 1회로 묶인다.
//
// score 16개는 flat 컬럼으로 받는다. persona 통째 select는 행마다
// reason_ko/reason_en/rationale 본문을 실어 갱신 1회에 4.2MB가 나갔다(실측).
// 컬럼만 받으면 같은 행 수에 0.5MB다.
//
// 페이징은 필수다 — PostgREST가 1,000행에서 자르는 탓에 1,577명 중 577명이
// 후보에조차 오르지 못했다(실측). 어느 1,000명이 남는지는 정렬 없는 select의
// 반환 순서에 달려 특정 인물이 상시 배제됐다. celeb_id 정렬로 페이지 경계의
// 중복·누락을 막고, 덤으로 동점 인물의 노출 순서까지 요청마다 흔들리지 않게 고정된다.
async function fetchAllPersonaVectors(): Promise<PersonaVectorRow[]> {
  const supabase = createStaticClient()
  const rows = await selectAllPages<PersonaColumnRow>((from, to) =>
    supabase
      .from('celeb_persona')
      .select(`
        celeb_id, ${PERSONA_STAT_KEYS.join(', ')},
        celeb:celebs!celeb_persona_celebs_fkey (nickname, nickname_en, profession, avatar_url, publication_status)
      `)
      .order('celeb_id')
      .range(from, to) as unknown as PromiseLike<{
      data: PersonaColumnRow[] | null
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
const getAllPersonaVectorsCached = () =>
  cachedList(CACHE_TAGS.PERSONA, ['all-persona-vectors'], fetchAllPersonaVectors)

// 대상 셀럽 1명분: 레이더 근거(rationale/reason) 표시를 위해 persona jsonb 원본과
// 생몰일·title까지 포함해 단건 조회한다. 1행이라 캐시 한도와 무관하다.
async function fetchPersonaByCelebId(celebId: string): Promise<PersonaJoinRow | null> {
  const supabase = createStaticClient()
  const { data } = await supabase
    .from('celeb_persona')
    .select(`
      celeb_id, persona,
      celeb:celebs!celeb_persona_celebs_fkey (nickname, nickname_en, profession, avatar_url, birth_date, death_date, title, publication_status)
    `)
    .eq('celeb_id', celebId)
    .maybeSingle()
  return (data as PersonaJoinRow | null) ?? null
}

function getPersonaByCelebIdCached(celebId: string): Promise<PersonaJoinRow | null> {
  // 인물 한 명의 성향 — 항목 태그를 단다. 인물 자료가 바뀔 때도 함께 비워지도록 인물 도메인을 곁들인다
  return cachedDetail(CACHE_TAGS.PERSONA, celebId, ['persona-by-id', celebId], () => fetchPersonaByCelebId(celebId), {
    extraTags: [CACHE_TAGS.CELEBS],
  })
}

function targetToProfile(row: PersonaJoinRow, isEn: boolean): PersonaProfile {
  const profile = pickProfile(row.celeb)
  const stats = parsePersonaJsonb(row.persona)
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

function vectorToProfile(row: PersonaVectorRow, isEn: boolean): PersonaProfile {
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

function toPersonaMatch(
  candidate: PersonaProfile,
  distance: number,
  dimensions: number,
  matchPercent?: number,
): RankedPersonaMatch {
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
  const [targetRow, allVectors] = await Promise.all([
    getPersonaByCelebIdCached(celebId),
    getAllPersonaVectorsCached(),
  ])

  if (!targetRow) {
    return {
      targetPersona: null,
      targetPersonaJsonb: null,
      similarCelebs: [],
      matchesByCategory: EMPTY_MATCH_GROUPS,
    }
  }

  const targetPersona = targetToProfile(targetRow, isEn)
  const targetPersonaJsonb = targetRow.persona
  const virtuePopulationStats = calcVirtuePopulationStats(
    allVectors.map((row) => row.stats),
  )
  const targetEmphasizedVirtues = getEmphasizedVirtueVector(
    targetPersona,
    virtuePopulationStats,
  )

  const categoryLimit = Math.min(limit, 3)
  const rankedMatchesByCategory: RankedPersonaMatchGroups = {
    overall: [],
    disposition: [],
    virtue: [],
    ability: [],
    opposite: [],
  }
  const similarCelebs: SimilarCeleb[] = []

  for (const row of allVectors) {
    if (row.celeb_id === celebId) continue

    const candidate = vectorToProfile(row, isEn)
    const distances = calcPersonaMatchDistances(targetPersona, candidate)
    const candidateEmphasizedVirtues = getEmphasizedVirtueVector(
      candidate,
      virtuePopulationStats,
    )
    const emphasizedVirtueSimilarity = calcEmphasizedVirtueSimilarity(
      targetEmphasizedVirtues,
      candidateEmphasizedVirtues,
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
          toPersonaMatch(
            candidate,
            1 - emphasizedVirtueSimilarity,
            1,
            Math.round(emphasizedVirtueSimilarity * 100),
          ),
          categoryLimit,
        )
        continue
      }

      insertTopMatch(
        rankedMatchesByCategory[category],
        toPersonaMatch(
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
                targetPersona,
                candidate,
                targetEmphasizedVirtues,
                getEmphasizedVirtueVector(candidate, virtuePopulationStats),
                2,
              )
            : getPersonaMatchEvidence(
                targetPersona,
                candidate,
                category,
                category === 'overall' ? 3 : 2,
              ),
        comparison: getPersonaMatchComparison(
          targetPersona,
          candidate,
          category,
        ),
      })),
    ]),
  ) as PersonaMatchGroups

  return { targetPersona, targetPersonaJsonb, similarCelebs, matchesByCategory }
}
