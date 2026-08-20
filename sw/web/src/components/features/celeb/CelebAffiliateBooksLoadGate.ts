import type { getAffiliateBooksForCeleb } from '@/actions/home/getAffiliateBooks'

export type AffiliateBooksResult = Awaited<ReturnType<typeof getAffiliateBooksForCeleb>>
type MaybeAffiliateBooksResult = AffiliateBooksResult | null | undefined

interface LoadObserver {
  enabled: boolean
  key: string
  userId: string
  onReady: (result: AffiliateBooksResult | null) => void
  onError: (error: unknown) => void
}

/** 같은 인물·시도는 effect가 다시 붙어도 요청 하나만 공유한다. */
export function createAffiliateBooksLoadGate(
  load: (userId: string) => Promise<MaybeAffiliateBooksResult>,
) {
  let currentKey: string | null = null
  let currentRequest: Promise<AffiliateBooksResult | null> | null = null

  return {
    observe({ enabled, key, userId, onReady, onError }: LoadObserver) {
      if (!enabled) return () => undefined

      if (key !== currentKey || !currentRequest) {
        currentKey = key
        currentRequest = load(userId).then((result) =>
          result && result.books.length > 0 ? result : null
        )
      }

      let active = true
      void currentRequest.then(
        (result) => {
          if (active) onReady(result)
        },
        (error: unknown) => {
          if (active) onError(error)
        },
      )

      return () => {
        active = false
      }
    },
  }
}
