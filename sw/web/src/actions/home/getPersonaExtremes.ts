'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'

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
  pessimism_optimism: { ko: '낙관 vs 비관', en: 'Optimism vs Pessimism' },
  conservative_progressive: { ko: '혁신 vs 보수', en: 'Progressive vs Conservative' },
  individual_social: { ko: '공동체 vs 개인', en: 'Social vs Individual' },
  cautious_bold: { ko: '모험 vs 신중', en: 'Bold vs Cautious' },
}

export interface PersonaExtremeEntry {
  axis: string
  label: { ko: string; en: string }
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

interface RpcEntry extends Omit<PersonaExtremeEntry, 'label'> {
  group: string
}

async function fetchPersonaExtremes(runnersUpLimit: number): Promise<PersonaExtremeEntry[]> {
  const supabase = createStaticClient()

  const { data, error } = await supabase.rpc('get_persona_extremes', {
    p_runners_up_limit: runnersUpLimit,
  })

  if (error || !data) {
    console.error('[getPersonaExtremes] RPC 호출 실패:', error?.message)
    return []
  }

  const rows = data as RpcEntry[]
  return rows.map(({ group: _group, ...rest }) => ({
    ...rest,
    label: AXIS_LABELS[rest.axis] ?? { ko: rest.axis, en: rest.axis },
  }))
}

const getCachedPersonaExtremes = unstable_cache(
  fetchPersonaExtremes,
  ['persona-extremes'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getPersonaExtremes(options?: { runnersUpLimit?: number }): Promise<PersonaExtremeEntry[]> {
  return getCachedPersonaExtremes(options?.runnersUpLimit ?? 2)
}
