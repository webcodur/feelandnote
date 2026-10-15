import { rawFetch } from './rawFetch'
import { createBoundedJsonCache } from './boundedJsonCache'

export const METADATA_LIMITS = {
  timeoutMs: 20_000,
  responseBytes: 2 * 1024 * 1024,
  cacheBytes: 4 * 1024 * 1024,
  cacheEntries: 128,
  concurrentReads: 8,
  titleLength: 512,
} as const

export class MetadataError extends Error {
  constructor(message: string, readonly status: number = 502) { super(message) }
}

// 성공한 공개 자료만 보관한다. 실패·만료·동시 조회도 각각 상한을 지킨다.
export function createMetadataCache<T>(ttlMs: number, limits: {
  entries: number; bytes: number; concurrent: number
} = { entries: METADATA_LIMITS.cacheEntries, bytes: METADATA_LIMITS.cacheBytes, concurrent: METADATA_LIMITS.concurrentReads }) {
  const cache = createBoundedJsonCache<T>({ ...limits, ttlMs })
  const pending = new Map<string, Promise<T>>()
  return async (key: string, load: () => Promise<T>): Promise<T> => {
    const hit = cache.get(key)
    if (hit !== undefined) return hit
    const existing = pending.get(key)
    if (existing) return existing
    if (pending.size >= limits.concurrent) throw new MetadataError('Metadata service busy', 503)
    const promise = Promise.resolve().then(load).then(value => {
      cache.set(key, value)
      return value
    }).finally(() => { pending.delete(key) })
    pending.set(key, promise)
    return promise
  }
}

// HTTP 헤더뿐 아니라 스트림을 읽는 동안에도 크기·시간 제한을 적용한다.
export async function fetchMetadataJson<T>(url: string, signal: AbortSignal): Promise<T> {
  const response = await rawFetch(url, { signal, cache: 'no-store', headers: { 'User-Agent': 'FeelandnoteBot/1.0' } })
  if (!response.ok) {
    await response.body?.cancel()
    throw new MetadataError(`Metadata upstream returned ${response.status}`, response.status === 404 ? 404 : 502)
  }
  if (Number(response.headers.get('content-length')) > METADATA_LIMITS.responseBytes) {
    await response.body?.cancel()
    throw new MetadataError('Metadata response too large')
  }
  const reader = response.body?.getReader()
  if (!reader) throw new MetadataError('Metadata response is empty')
  const chunks: Uint8Array[] = []
  let size = 0
  const onAbort = () => { void reader.cancel(signal.reason).catch(() => {}) }
  signal.addEventListener('abort', onAbort, { once: true })
  try {
    while (true) {
      signal.throwIfAborted()
      const { done, value } = await reader.read()
      signal.throwIfAborted()
      if (done) break
      size += value.byteLength
      if (size > METADATA_LIMITS.responseBytes) throw new MetadataError('Metadata response too large')
      chunks.push(value)
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T
  } finally {
    signal.removeEventListener('abort', onAbort)
    await reader.cancel().catch(() => {})
    reader.releaseLock()
  }
}

export function metadataErrorStatus(error: unknown): number {
  if (error instanceof MetadataError) return error.status === 404 ? 502 : error.status
  if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)) return 504
  return 502
}
