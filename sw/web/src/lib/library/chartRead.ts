import { coalesceCacheQuery } from '@/lib/cacheQuery'

const RETRY_BACKOFF_MS = 10 * 60_000
const failures = new Map<string, number>()

/** 동시 첫 조회를 공유하고, 외부 장애 중에는 매 요청마다 타임아웃을 반복하지 않는다. */
export async function readChart<T>(key: string, read: () => Promise<T>): Promise<T | null> {
  if (Date.now() < (failures.get(key) ?? 0)) return null
  try {
    const chart = await coalesceCacheQuery(`chart:${key}`, read)
    failures.delete(key)
    return chart
  } catch {
    failures.set(key, Date.now() + RETRY_BACKOFF_MS)
    console.error('[library] chart temporarily unavailable', key)
    return null
  }
}
