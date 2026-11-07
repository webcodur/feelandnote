import { coalesceCacheQuery } from '@/lib/cacheQuery'

const RETRY_BACKOFF_MS = 60_000
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

/**
 * 표시할 수 있는 차트를 돌려준다. Next 캐시는 만료된 값을 먼저 주고 뒤에서 갱신하므로, 방문이 뜸하면
 * 표시 유효기간을 넘긴 값이 나온다. 이때 실패 화면을 내지 않고 같은 요청에서 원본을 직접 읽는다.
 * 캐시 조회가 값을 못 냈다면(null) 원본 조회가 방금 실패했거나 대기 중이므로 다시 부르지 않는다.
 */
export async function readDisplayableChart<T, S extends { status: 'ready' | 'unavailable' }>(
  key: string,
  readCached: () => Promise<T>,
  readSource: () => Promise<T>,
  select: (chart: T | null) => S,
): Promise<S> {
  const cached = await readChart(key, readCached)
  const selection = select(cached)
  if (selection.status === 'ready' || cached === null) return selection
  return select(await readChart(`${key}:source`, readSource))
}
