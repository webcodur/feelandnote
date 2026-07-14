'use server'

import { unstable_cache } from 'next/cache'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import type { PersonaJsonb, PersonaProfile, PersonaStats } from '@/lib/persona/types'
import { parsePersonaJsonb } from '@/lib/persona/types'
import { calcDistance, type SimilarCeleb } from '@/lib/persona/utils'

export interface SimilarByCelebResult {
  targetPersona: PersonaProfile | null
  targetPersonaJsonb: PersonaJsonb | null
  similarCelebs: SimilarCeleb[]
}

// celeb_persona + profiles 조인 행
interface PersonaJoinProfile {
  nickname: string | null
  nickname_en: string | null
  profession: string | null
  avatar_url: string | null
  birth_date?: string | null
  death_date?: string | null
  title?: string | null
}

interface PersonaJoinRow {
  celeb_id: string
  persona: PersonaJsonb
  profiles: PersonaJoinProfile | PersonaJoinProfile[] | null
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

function pickProfile(
  profiles: PersonaJoinProfile | PersonaJoinProfile[] | null
): PersonaJoinProfile | null {
  return Array.isArray(profiles) ? (profiles[0] ?? null) : profiles
}

// 전체 celeb_persona를 셀럽·locale 무관 단일 캐시 키로 1회만 조회한다.
// 캐시에는 수치 벡터 + 카드 표시용 메타만 담아 2MB 캐시 한도를 넘기지 않는다.
// 셀럽별 유사도 계산은 이 공유 캐시 위에서 수행하므로, 크롤러가 모든
// 셀럽 페이지를 순회해도 전체 테이블 전송은 revalidate 주기당 1회로 묶인다.
async function fetchAllPersonaVectors(): Promise<PersonaVectorRow[]> {
  const supabase = createStaticClient()
  const { data } = await supabase
    .from('celeb_persona')
    .select(`
      celeb_id, persona,
      profiles!celeb_persona_celeb_id_fkey (nickname, nickname_en, profession, avatar_url)
    `)
  const rows = (data as PersonaJoinRow[] | null) ?? []
  return rows.map((row) => {
    const profile = pickProfile(row.profiles)
    return {
      celeb_id: row.celeb_id,
      stats: parsePersonaJsonb(row.persona),
      nickname: profile?.nickname ?? null,
      nickname_en: profile?.nickname_en ?? null,
      profession: profile?.profession ?? null,
      avatar_url: profile?.avatar_url ?? null,
    }
  })
}

const getAllPersonaVectorsCached = unstable_cache(
  fetchAllPersonaVectors,
  ['all-persona-vectors'],
  { revalidate: STATIC_REVALIDATE, tags: ['celebs'] }
)

// 대상 셀럽 1명분: 레이더 근거(rationale/reason) 표시를 위해 persona jsonb 원본과
// 생몰일·title까지 포함해 단건 조회한다. 1행이라 캐시 한도와 무관하다.
async function fetchPersonaByCelebId(celebId: string): Promise<PersonaJoinRow | null> {
  const supabase = createStaticClient()
  const { data } = await supabase
    .from('celeb_persona')
    .select(`
      celeb_id, persona,
      profiles!celeb_persona_celeb_id_fkey (nickname, nickname_en, profession, avatar_url, birth_date, death_date, title)
    `)
    .eq('celeb_id', celebId)
    .maybeSingle()
  return (data as PersonaJoinRow | null) ?? null
}

function getPersonaByCelebIdCached(celebId: string): Promise<PersonaJoinRow | null> {
  return unstable_cache(
    () => fetchPersonaByCelebId(celebId),
    ['persona-by-id', celebId],
    { revalidate: STATIC_REVALIDATE, tags: ['celebs'] }
  )()
}

function targetToProfile(row: PersonaJoinRow, isEn: boolean): PersonaProfile {
  const profile = pickProfile(row.profiles)
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
    return { targetPersona: null, targetPersonaJsonb: null, similarCelebs: [] }
  }

  const targetPersona = targetToProfile(targetRow, isEn)
  const targetPersonaJsonb = targetRow.persona

  const similarCelebs: SimilarCeleb[] = allVectors
    .filter((r) => r.celeb_id !== celebId)
    .map((row) => {
      const vec = vectorToProfile(row, isEn)
      return { ...vec, distance: calcDistance(targetPersona, vec) }
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)

  return { targetPersona, targetPersonaJsonb, similarCelebs }
}
