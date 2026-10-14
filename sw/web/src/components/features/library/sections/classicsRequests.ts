import type { LibraryResult } from '@/actions/library/types'
import { classicsQueryKey as queryKey, updateClassicsQuery, type ClassicsQuery } from '@/lib/library/classicsQuery'
export type { ClassicsQuery } from '@/lib/library/classicsQuery'

const MAX_CACHED_RESULTS = 24
export const CLASSICS_SLOW_NOTICE_MS = 4000

/** One server action at a time; replace queued choices with the latest selection. */
export function createClassicsRequests(initialQuery: ClassicsQuery, initialData: LibraryResult,
  fetch: (query: ClassicsQuery) => Promise<LibraryResult>) {
  let snapshot = { query: initialQuery, data: initialData, pending: false, failed: false, revision: 0 }
  const cache = new Map([[queryKey(initialQuery), initialData]])
  const listeners = new Set<() => void>()
  let running = false
  let active = true
  const notify = () => listeners.forEach(listener => listener())

  async function drain() {
    if (running) return
    running = true
    try {
      while (active && snapshot.pending) {
        const query = snapshot.query
        const key = queryKey(query)
        try {
          const result = cache.get(key) ?? await fetch(query)
          cache.delete(key)
          cache.set(key, result)
          if (cache.size > MAX_CACHED_RESULTS) cache.delete(cache.keys().next().value!)
          // A late response may be reused, but must not replace a newer selection.
          if (key === queryKey(snapshot.query)) {
            snapshot = { ...snapshot, data: result, pending: false, failed: false }
            notify()
          }
        } catch {
          if (key === queryKey(snapshot.query)) {
            snapshot = { ...snapshot, pending: false, failed: true }
            notify()
          }
        }
      }
    } finally {
      running = false
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    activate() { active = true; void drain() },
    deactivate() { active = false },
    load(next: Partial<ClassicsQuery>, retry = false) {
      const query = updateClassicsQuery(snapshot.query, next)
      const key = queryKey(query)
      if (!retry && key === queryKey(snapshot.query) && !snapshot.failed) return
      if (retry) cache.delete(key)
      const cached = cache.get(key)
      // Keep recently revisited filters when the bounded cache fills up.
      if (cached) { cache.delete(key); cache.set(key, cached) }
      snapshot = { query, data: cached ?? snapshot.data, pending: !cached, failed: false, revision: snapshot.revision + 1 }
      notify()
      void drain()
    },
  }
}
