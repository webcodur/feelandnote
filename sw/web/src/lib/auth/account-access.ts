import type { DatabaseClient } from '@feelandnote/db'

export type AccountAccessState = 'active' | 'blocked' | 'incomplete' | 'error'

export async function getAccountAccessState(
  db: DatabaseClient
): Promise<AccountAccessState> {
  const { data, error } = await db.rpc('get_current_account_access_state')
  if (error) return 'error'
  if (data === 'active' || data === 'blocked') return data
  return 'incomplete'
}
