'use server'

import { createClient } from '@/lib/supabase/server'
import type { PersonaJsonb, PersonaField } from '@/lib/persona/types'
import { parsePersonaJsonb, parsePersonaJsonbWithReasons, type PersonaStats } from '@/lib/persona/types'

// ── 축별 라벨 ──

const AXIS_LABELS: Record<string, { ko: string; en: string }> = {
  temperance: { ko: '절제의 화신', en: 'Paragon of Temperance' },
  diligence: { ko: '근면의 화신', en: 'Paragon of Diligence' },
  reflection: { ko: '성찰의 화신', en: 'Paragon of Reflection' },
  courage: { ko: '용기의 화신', en: 'Paragon of Courage' },
  loyalty: { ko: '충의의 화신', en: 'Paragon of Loyalty' },
  benevolence: { ko: '자비의 화신', en: 'Paragon of Benevolence' },
  fairness: { ko: '공정의 화신', en: 'Paragon of Fairness' },
  humility: { ko: '겸양의 화신', en: 'Paragon of Humility' },
  command: { ko: '최강의 통솔자', en: 'Supreme Commander' },
  martial: { ko: '최강의 무장', en: 'Supreme Warrior' },
  intellect: { ko: '최강의 지략가', en: 'Supreme Intellect' },
  charm: { ko: '최고의 매력가', en: 'Supreme Charmer' },
  // 성향은 양극단 대조용 라벨
  pessimism_optimism: { ko: '낙관 vs 비관', en: 'Optimism vs Pessimism' },
  conservative_progressive: { ko: '혁신 vs 보수', en: 'Progressive vs Conservative' },
  individual_social: { ko: '공동체 vs 개인', en: 'Social vs Individual' },
  cautious_bold: { ko: '모험 vs 신중', en: 'Bold vs Cautious' },
}

const AXES = Object.keys(AXIS_LABELS)

/** 축 이름 → persona jsonb 그룹 매핑 */
const AXIS_GROUP: Record<string, 'abilities' | 'inner_virtues' | 'outer_virtues' | 'dispositions'> = {
  temperance: 'inner_virtues',
  diligence: 'inner_virtues',
  reflection: 'inner_virtues',
  courage: 'inner_virtues',
  loyalty: 'outer_virtues',
  benevolence: 'outer_virtues',
  fairness: 'outer_virtues',
  humility: 'outer_virtues',
  command: 'abilities',
  martial: 'abilities',
  intellect: 'abilities',
  charm: 'abilities',
  pessimism_optimism: 'dispositions',
  conservative_progressive: 'dispositions',
  individual_social: 'dispositions',
  cautious_bold: 'dispositions',
}

/** persona jsonb에서 특정 축의 reason 추출 */
function getAxisReason(persona: PersonaJsonb, axis: string): { ko: string; en: string } {
  const group = AXIS_GROUP[axis]
  if (!group) return { ko: '', en: '' }
  const field = (persona[group] as Record<string, PersonaField>)[axis]
  return field ? { ko: field.reason_ko, en: field.reason_en } : { ko: '', en: '' }
}

// ── 반환 타입 ──

export interface PersonaExtremeEntry {
  axis: string
  label: { ko: string; en: string }
  score: number
  percentile: number
  reason: { ko: string; en: string }  // 최고점자 해당 축 채점 사유
  celeb: {
    id: string
    slug: string | null
    nickname: string
    nickname_en: string | null
    avatar_url: string | null
    profession: string | null
    title: string | null
    title_en: string | null
    has_voice: boolean
    stats: Record<string, any>
  }
  runnersUp: {
    id: string
    slug: string | null
    nickname: string
    nickname_en: string | null
    avatar_url: string | null
    score: number
    reason: { ko: string; en: string }
    stats: Record<string, any>
  }[]
  // Dispositions 탭용 최저점자 (Opposing Celeb) - optional
  opposing?: {
    score: number
    percentile: number
    reason: { ko: string; en: string }
    celeb: {
      id: string
      slug: string | null
      nickname: string
      nickname_en: string | null
      avatar_url: string | null
      profession: string | null
      title: string | null
      title_en: string | null
      has_voice: boolean
      stats: Record<string, any>
    }
  }
}

// ── 내부 타입 ──

interface ProfileData {
  id: string
  slug: string | null
  nickname: string | null
  nickname_en: string | null
  avatar_url: string | null
  profession: string | null
  title: string | null
  title_en: string | null
  has_voice: boolean
  status: string
  profile_type: string
  celeb_tier: string | null
}

interface PersonaRow {
  celeb_id: string
  persona: PersonaJsonb
  profiles: ProfileData | ProfileData[] | null
}

function normalizeProfile(profiles: PersonaRow['profiles']): ProfileData | null {
  if (!profiles) return null
  return Array.isArray(profiles) ? profiles[0] ?? null : profiles
}

interface Candidate {
  celebId: string
  score: number
  profile: ProfileData
  persona: PersonaJsonb
}

/**
 * persona 16축 각각의 최고값 셀럽 + 통계·사유 반환
 */
export async function getPersonaExtremes(options?: { runnersUpLimit?: number }): Promise<PersonaExtremeEntry[]> {
  const runnersUpLimit = options?.runnersUpLimit ?? 2
  const supabase = await createClient()

  const { data: personaRows, error } = await supabase
    .from('celeb_persona')
    .select(`
      celeb_id, persona,
      profiles!celeb_persona_celeb_id_fkey (
        id, slug, nickname, nickname_en, avatar_url, profession,
        title, title_en, has_voice, status, profile_type, celeb_tier
      )
    `)

  if (error || !personaRows) {
    console.error('[getPersonaExtremes] persona 조회 실패:', error?.message)
    return []
  }

  const rows = (personaRows as unknown as PersonaRow[]).filter(row => {
    const p = normalizeProfile(row.profiles)
    return p && p.status === 'active' && p.profile_type === 'CELEB' && p.celeb_tier === 'full'
  })

  // 축별 전체 점수 수집
  const axisScores = new Map<string, Candidate[]>()
  for (const axis of AXES) axisScores.set(axis, [])

  for (const row of rows) {
    if (!row.persona) continue
    const stats = parsePersonaJsonb(row.persona)
    const profile = normalizeProfile(row.profiles)
    if (!profile) continue

    for (const axis of AXES) {
      const score = stats[axis as keyof PersonaStats]
      axisScores.get(axis)!.push({ celebId: row.celeb_id, score, profile, persona: row.persona })
    }
  }

  const entries: PersonaExtremeEntry[] = []

  for (const axis of AXES) {
    const candidates = axisScores.get(axis)!
    if (candidates.length === 0) continue

    candidates.sort((a, b) => b.score - a.score)

    const winner = candidates[0]
    const total = candidates.length

    const belowCount = candidates.filter(c => c.score < winner.score).length
    const percentile = Math.round((1 - belowCount / total) * 100 * 10) / 10

    const reason = getAxisReason(winner.persona, axis)

    const runnersUp = candidates.slice(1, 1 + runnersUpLimit).map(c => ({
      id: c.profile.id,
      slug: c.profile.slug,
      nickname: c.profile.nickname || '',
      nickname_en: c.profile.nickname_en ?? null,
      avatar_url: c.profile.avatar_url ?? null,
      score: c.score,
      reason: getAxisReason(c.persona, axis),
      stats: parsePersonaJsonbWithReasons(c.persona) as unknown as Record<string, any>,
    }))

    // Dispositions 그룹인 경우 최저점자(Opposing) 추출
    let opposing: PersonaExtremeEntry['opposing'] = undefined;
    if (AXIS_GROUP[axis] === 'dispositions') {
      // candidates는 이미 내림차순 정렬됨
      const loser = candidates[candidates.length - 1]
      const loserBelowCount = candidates.filter(c => c.score < loser.score).length
      // 로저는 하위 퍼센타일이므로, 100 - (위쪽 계산식)을 하거나
      // 하위 퍼센타일 자체를 표시 (ex. 하위 1%) -> 직관성을 위해 percentile은 그대로 상위 기준이거나 별도 표기
      // 여기서는 winner와 대칭 구조를 위해 하위 백분위를 계산 (0에 가까움)
      const loserAboveCount = candidates.filter(c => c.score > loser.score).length
      const loserPercentile = Math.round((loserAboveCount / total) * 100 * 10) / 10 // top N% from bottom

      const loserReason = getAxisReason(loser.persona, axis)

      opposing = {
        score: loser.score,
        percentile: loserPercentile,
        reason: loserReason,
        celeb: {
          id: loser.profile.id,
          slug: loser.profile.slug,
          nickname: loser.profile.nickname || '',
          nickname_en: loser.profile.nickname_en ?? null,
          avatar_url: loser.profile.avatar_url ?? null,
          profession: loser.profile.profession ?? null,
          title: loser.profile.title ?? null,
          title_en: loser.profile.title_en ?? null,
          has_voice: loser.profile.has_voice ?? false,
          stats: parsePersonaJsonbWithReasons(loser.persona) as unknown as Record<string, any>,
        }
      }
    }

    entries.push({
      axis,
      label: AXIS_LABELS[axis],
      score: winner.score,
      percentile,
      reason,
      celeb: {
        id: winner.profile.id,
        slug: winner.profile.slug,
        nickname: winner.profile.nickname || '',
        nickname_en: winner.profile.nickname_en ?? null,
        avatar_url: winner.profile.avatar_url ?? null,
        profession: winner.profile.profession ?? null,
        title: winner.profile.title ?? null,
        title_en: winner.profile.title_en ?? null,
        has_voice: winner.profile.has_voice ?? false,
        stats: parsePersonaJsonbWithReasons(winner.persona) as unknown as Record<string, any>,
      },
      runnersUp,
      opposing,
    })
  }

  return entries
}
