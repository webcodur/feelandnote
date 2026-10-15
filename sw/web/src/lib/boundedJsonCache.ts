interface CacheLimits { entries: number; bytes: number; ttlMs: number }

/** JSON 전송량 기준 상한. Node·브라우저에서 같은 만료·LRU 규칙을 쓴다. */
export function createBoundedJsonCache<T>(limits: CacheLimits) {
  const cache = new Map<string, { value: T; expires: number; bytes: number }>()
  const encoder = new TextEncoder()
  let bytes = 0
  function remove(key: string) {
    const entry = cache.get(key)
    if (entry) { bytes -= entry.bytes; cache.delete(key) }
  }
  function prune() {
    const now = Date.now()
    for (const [key, entry] of cache) if (entry.expires <= now) remove(key)
  }
  return {
    get(key: string): T | undefined {
      prune()
      const hit = cache.get(key)
      if (!hit) return undefined
      cache.delete(key)
      cache.set(key, hit)
      return hit.value
    },
    set(key: string, value: T) {
      prune()
      remove(key)
      const json = JSON.stringify(value)
      if (json === undefined) return
      const weight = encoder.encode(key).byteLength + encoder.encode(json).byteLength
      if (weight > limits.bytes || limits.entries < 1) return
      while (cache.size && (cache.size >= limits.entries || bytes + weight > limits.bytes)) remove(cache.keys().next().value!)
      cache.set(key, { value, expires: Date.now() + limits.ttlMs, bytes: weight })
      bytes += weight
    },
    clear() { cache.clear(); bytes = 0 },
  }
}
