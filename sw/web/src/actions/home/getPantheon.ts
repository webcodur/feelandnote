'use server'

import { createClient } from '@/lib/supabase/server'
import type { TierList, Flow, ContentRecord, Profile } from '@/types/database'

export type PantheonItemType = 'tier-list' | 'flow' | 'blind-test'

export interface PantheonItem {
  id: string
  type: PantheonItemType
  title: string
  subtitle: string
  userId?: string // Link generation aid
  metadata?: {
    image?: string | null
    author?: string | null
    count?: number
  }
}

export async function getPantheon(): Promise<PantheonItem[]> {
  const supabase = await createClient()
  const items: PantheonItem[] = []

  // 1. Fetch Top Tier Lists (Public)
  // has_tiers = true인 flows를 조회
  const { data: tierLists } = await supabase
    .from('flows')
    .select(`
      id, 
      name, 
      is_public,
      created_at,
      user_id
    `)
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
        metadata: {
          author: 'Community' 
        }
      })
    })
  }

  // 2. Fetch Top Flows (Public)
  const { data: flows } = await supabase
    .from('flows')
    .select(`
      id, 
      name, 
      is_public,
      created_at,
      user_id
    `)
    .eq('is_public', true)
    .eq('has_tiers', false) // 순수 플로우만
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
            metadata: {
                author: 'Curator'
            }
        })
    })
  }

  // 3. Fetch Blind Test Candidates (Quotes from Records)
  // type='QUOTE' & visibility='public'
  const { data: quotes } = await supabase
    .from('records')
    .select(`
        id,
        content,
        content_id,
        visibility
    `)
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
              metadata: {
                  author: 'Unknown'
              }
          })
      })
  }

  // Shuffle items to give a random feed feel
  return items.sort(() => Math.random() - 0.5).slice(0, 5)
}
