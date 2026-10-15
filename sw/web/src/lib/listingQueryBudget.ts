import { AsyncLocalStorage } from 'node:async_hooks'
import { CELEB_LISTING_LIMITS } from '@/constants/celebListingPolicy'

const context = new AsyncLocalStorage<AbortSignal>()

export function listingQuerySignal(): AbortSignal | undefined { return context.getStore() }

export function createListingQueryBudget(maxConcurrent: number, timeoutMs: number) {
  let active = 0
  return async <T>(read: () => Promise<T>): Promise<T> => {
    if (active >= maxConcurrent) throw new Error('Listing service busy')
    active++
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(new DOMException('Listing query timed out', 'TimeoutError')), timeoutMs)
    const work = context.run(controller.signal, () => Promise.resolve().then(read))
      .finally(() => { active--; clearTimeout(timer) })
    let onAbort!: () => void
    const deadline = new Promise<never>((_, reject) => {
      onAbort = () => reject(controller.signal.reason)
      controller.signal.addEventListener('abort', onAbort, { once: true })
    })
    // 화면의 대기가 끝나도 실제 처리가 끝날 때까지 동시 처리 자리를 반환하지 않는다.
    try { return await Promise.race([work, deadline]) }
    finally { controller.signal.removeEventListener('abort', onAbort) }
  }
}

export const runListingQuery = createListingQueryBudget(CELEB_LISTING_LIMITS.concurrentQueries, CELEB_LISTING_LIMITS.timeoutMs)
