const pending = new Map<string, Promise<unknown>>()

/** Share only work in progress. Successes and failures are removed; Next owns persistence. */
export function coalesceCacheQuery<T>(key: string, read: () => Promise<T>): Promise<T> {
  const existing = pending.get(key)
  if (existing) return existing as Promise<T>
  const result = Promise.resolve().then(read).finally(() => {
    if (pending.get(key) === result) pending.delete(key)
  })
  pending.set(key, result)
  return result
}
