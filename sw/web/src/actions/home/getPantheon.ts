'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'

export type PantheonItemType = 'tier-list' | 'flow' | 'blind-test'

export interface PantheonItem {
  id: string
  type: PantheonItemType
  title: string
  subtitle: string
  userId?: string
  metadata?: {
    image?: string | null
    author?: string | null
    count?: number
  }
}

async function fetchPantheonPool(): Promise<PantheonItem[]> {
  const supabase = createStaticClient()
  const items: PantheonItem[] = []

  const { data: tierLists } = await supabase
    .from('flows')
    .select(`id, name, is_public, created_at, user_id`)
    .eq('is_public', true)
    .eq('has_tiers', true)
    .order('created_at', { ascending: false })
    .limit(3)

  if (tierLists) {
    tierLists.forEach(tier => {
      items.push({
        id: tier.id,
        type: 'tier-list',
        title: tier.name,
        subtitle: '',
        userId: tier.user_id,
        metadata: { author: 'Agora' }
      })
    })
  }

  const { data: flows } = await supabase
    .from('flows')
    .select(`id, name, is_public, created_at, user_id`)
    .eq('is_public', true)
    .eq('has_tiers', false)
    .order('created_at', { ascending: false })
    .limit(3)

  if (flows) {
    flows.forEach(fl => {
      items.push({
        id: fl.id,
        type: 'flow',
        title: fl.name,
        subtitle: '',
        userId: fl.user_id,
        metadata: { author: 'Curator' }
      })
    })
  }

  const { data: quotes } = await supabase
    .from('records')
    .select(`id, content, content_id, visibility`)
    .eq('type', 'QUOTE')
    .eq('visibility', 'public')
    .order('created_at', { ascending: false })
    .limit(3)

  if (quotes) {
    quotes.forEach(q => {
      items.push({
        id: q.id,
        type: 'blind-test',
        title: q.content.length > 30 ? q.content.slice(0, 30) + '...' : q.content,
        subtitle: '',
        metadata: { author: 'Unknown' }
      })
    })
  }

  return items
}

const getPantheonPoolCached = unstable_cache(
  fetchPantheonPool,
  ['pantheon-pool'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getPantheon(): Promise<PantheonItem[]> {
  const pool = await getPantheonPoolCached()
  // 풀은 캐시, 셔플은 외부에서 매 요청 새로 (random feed 인상 유지)
  return [...pool].sort(() => Math.random() - 0.5).slice(0, 5)
}
