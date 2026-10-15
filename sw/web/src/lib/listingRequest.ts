import type { getCelebs, GetCelebsParams } from '@/actions/home/getCelebs'
import { CELEB_LISTING_LIMITS, normalizeListingParams } from '@/constants/celebListingPolicy'
import { createBoundedJsonCache } from './boundedJsonCache'
import { createLatestRequestRunner } from './latestRequest'

type ListingResult = Awaited<ReturnType<typeof getCelebs>>

// 화면 인스턴스 안에서만 보관한다. 다른 탭이나 화면과 공유하지 않는다.
export function createListingRequest(read: (params: GetCelebsParams) => Promise<ListingResult>) {
  const cache = createBoundedJsonCache<ListingResult>(CELEB_LISTING_LIMITS.browserCache)
  let generation = 0
  const queued = createLatestRequestRunner(async ({ params, key }: { params: GetCelebsParams; key: string }) => {
    const hit = cache.get(key)
    if (hit) return hit
    const started = generation
    const result = await read(params)
    if (!result.error && started === generation) cache.set(key, result)
    return result
  })
  const run = async (input: GetCelebsParams) => {
    const params = normalizeListingParams(input)
    const key = JSON.stringify(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)))
    const hit = cache.get(key)
    if (hit) { queued.clearPending(); return hit }
    return queued({ params, key })
  }
  run.invalidate = () => { generation++; cache.clear() }
  run.clearPending = queued.clearPending
  return run
}
