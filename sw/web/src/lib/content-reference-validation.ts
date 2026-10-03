import type { DatabaseClient, PostgrestError } from '@feelandnote/db'

type ReferenceValidation =
  | { valid: true }
  | { valid: false; reason: 'invalid-input' }
  | { valid: false; reason: 'missing'; missingIds: string[] }
  | { valid: false; reason: 'lookup-error'; error: PostgrestError }

// Return the referenced IDs without changing the user's tiers, duplicates or order.
export function tierContentIds(tiers: unknown): string[] | null {
  if (tiers === null) return []
  if (!tiers || typeof tiers !== 'object' || Array.isArray(tiers)) return null
  const groups = Object.values(tiers)
  if (groups.some(group => !Array.isArray(group))) return null
  const ids = groups.flat() as unknown[]
  if (ids.some(id => typeof id !== 'string' || !id.trim())) return null
  return ids as string[]
}

export async function validateContentReferences(
  db: DatabaseClient,
  ids: readonly string[],
): Promise<ReferenceValidation> {
  if (ids.some(id => typeof id !== 'string' || !id.trim())) return { valid: false, reason: 'invalid-input' }
  const uniqueIds = [...new Set(ids)]
  const missingIds: string[] = []
  try {
    // Keep each request below the API's row limit and avoid oversized filter URLs.
    for (let offset = 0; offset < uniqueIds.length; offset += 100) {
      const batch = uniqueIds.slice(offset, offset + 100)
      const { data, error } = await db.from('contents').select('id').in('id', batch)
      if (error) return { valid: false, reason: 'lookup-error', error }
      if (!Array.isArray(data)) {
        return { valid: false, reason: 'lookup-error', error: { code: '', message: 'Content lookup returned no row array', details: '', hint: '' } }
      }
      const found = new Set(data.map(row => row.id))
      missingIds.push(...batch.filter(id => !found.has(id)))
    }
  } catch (cause) {
    return { valid: false, reason: 'lookup-error', error: { code: '', message: cause instanceof Error ? cause.message : String(cause), details: '', hint: '' } }
  }
  return missingIds.length ? { valid: false, reason: 'missing', missingIds } : { valid: true }
}
