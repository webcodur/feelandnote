'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { STATIC_REVALIDATE, throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import type { SpectrumStatsWithReasons } from '@/lib/spectrum/types'

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

export interface SpectrumExtremeEntry {
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
    stats: SpectrumStatsWithReasons
  }
  runnersUp: {
    id: string
    slug: string | null
    nickname: string
    nickname_en: string | null
    avatar_url: string | null
    score: number
    reason: { ko: string; en: string }
    stats: SpectrumStatsWithReasons
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
      stats: SpectrumStatsWithReasons
    }
  }
}

interface RpcEntry extends Omit<SpectrumExtremeEntry, 'label'> {
  group: string
}

async function fetchSpectrumExtremes(runnersUpLimit: number): Promise<SpectrumExtremeEntry[]> {
  const supabase = createStaticClient()

  const { data, error } = await supabase.rpc('get_persona_extremes', {
    p_runners_up_limit: runnersUpLimit,
  })

  throwOnQueryError('[getSpectrumExtremes] RPC 호출', error)

  if (!data) {
    return []
  }

  const rows = data as RpcEntry[]
  return rows.map(({ group: _group, ...rest }) => ({
    ...rest,
    label: AXIS_LABELS[rest.axis] ?? { ko: rest.axis, en: rest.axis },
  }))
}

const getCachedSpectrumExtremes = unstable_cache(
  fetchSpectrumExtremes,
  ['spectrum-extremes'],
  // get_persona_extremes: celeb_persona 극단값 + 인물 표시 정보(celebs)
  { revalidate: STATIC_REVALIDATE, tags: [CACHE_TAGS.SPECTRUM, CACHE_TAGS.CELEBS] }
)

export async function getSpectrumExtremes(options?: { runnersUpLimit?: number }): Promise<SpectrumExtremeEntry[]> {
  return withQueryFallback(
    'getSpectrumExtremes',
    () => getCachedSpectrumExtremes(options?.runnersUpLimit ?? 2),
    [],
  )
}
