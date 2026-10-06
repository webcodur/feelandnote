'use server'

import { createAdminClient } from '@/lib/db/admin'
import { isEngagementTarget } from '@/lib/page-engagement'

export async function incrementFactionView(factionId: string, count: boolean): Promise<number | null> {
  if (!isEngagementTarget('faction', factionId)) return null
  try {
    const { data, error } = await createAdminClient().rpc('increment_faction_view', {
      p_faction_id: factionId, p_increment: count,
    })
    if (error) throw new Error(error.message)
    return typeof data === 'number' ? data : null
  } catch (error) {
    console.error('[팩션 조회수] 실패:', error instanceof Error ? error.message : 'unknown')
    return null
  }
}
