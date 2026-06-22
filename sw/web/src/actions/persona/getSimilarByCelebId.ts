'use server'

import { unstable_cache } from 'next/cache'
import { STATIC_REVALIDATE } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import type { PersonaJsonb, PersonaProfile } from '@/lib/persona/types'
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

// 전체 celeb_persona를 셀럽·locale 무관 단일 캐시 키로 1회만 조회한다.
// 셀럽별 유사도 계산은 이 공유 캐시 위에서 수행하므로, 크롤러가 모든
// 셀럽 페이지를 순회해도 전체 테이블 전송은 1시간당 1회로 묶인다.
async function fetchAllPersonas(): Promise<PersonaJoinRow[]> {
  const supabase = createStaticClient()
  const { data } = await supabase
    .from('celeb_persona')
    .select(`
      celeb_id, persona,
      profiles!celeb_persona_celeb_id_fkey (nickname, nickname_en, profession, avatar_url, birth_date, death_date, title)
    `)
  return (data as PersonaJoinRow[] | null) ?? []
}

const getAllPersonasCached = unstable_cache(
  fetchAllPersonas,
  ['all-personas'],
  { revalidate: STATIC_REVALIDATE, tags: ['celebs'] }
)

function toProfile(row: PersonaJoinRow, isEn: boolean): PersonaProfile {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
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

export async function getSimilarByCelebId(
  celebId: string,
  limit: number = 5,
  locale: string = 'ko'
): Promise<SimilarByCelebResult> {
  const isEn = locale === 'en'
  const allRows = await getAllPersonasCached()

  const targetRow = allRows.find((r) => r.celeb_id === celebId)
  if (!targetRow) {
    return { targetPersona: null, targetPersonaJsonb: null, similarCelebs: [] }
  }

  const targetPersona = toProfile(targetRow, isEn)
  const targetPersonaJsonb = targetRow.persona

  const similarCelebs: SimilarCeleb[] = allRows
    .filter((r) => r.celeb_id !== celebId)
    .map((row) => {
      const vec = toProfile(row, isEn)
      // 유사 카드에는 생몰일·title을 노출하지 않던 기존 동작 유지
      vec.birth_date = null
      vec.death_date = null
      vec.title = null
      return { ...vec, distance: calcDistance(targetPersona, vec) }
    })
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)

  return { targetPersona, targetPersonaJsonb, similarCelebs }
}
