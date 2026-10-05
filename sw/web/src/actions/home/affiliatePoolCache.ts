import { createHash } from 'node:crypto'
import type { unstable_cache } from 'next/cache'
import { encodeCacheJson, decodeCacheJson } from '../../lib/cacheJsonCodec'
import { coalesceCacheQuery } from '../../lib/cacheQuery'

export const AFFILIATE_POOL_SHARDS = 32
// base64는 ASCII라 문자 수가 바이트 수다. Next의 JSON 포장에도 충분한 여유를 둔다.
export const AFFILIATE_POOL_CHUNK_BYTES = 1024 * 1024

interface PoolEntry {
  book: { contentId: string }
  modernCount: number
  userCount: number
}

type IndexedEntry<T> = { entry: T; position: number }
type StoredShard = string | { revision: string; chunks: number }
class MissingSnapshot extends Error {}

export function affiliatePoolShard(contentId: string): number {
  let hash = 5381
  for (let i = 0; i < contentId.length; i += 1) hash = ((hash << 5) + hash + contentId.charCodeAt(i)) >>> 0
  return hash % AFFILIATE_POOL_SHARDS
}

export function createAffiliatePoolCache<Locale extends string, Entry extends PoolEntry>(
  read: (locale: Locale) => Promise<Entry[]>,
  cache: typeof unstable_cache,
  keyParts: string[],
  options: Parameters<typeof unstable_cache>[2],
): (locale: Locale) => Promise<Entry[]> {
  return async (locale) => {
    // 늦게 도착한 미스와 조각 복구도 이 호출에서 만든 동일한 풀을 쓴다.
    let snapshot: Promise<string[]> | undefined
    const getSnapshot = () => snapshot ??= coalesceCacheQuery(JSON.stringify([...keyParts, 'source', locale]), async () => {
      const shards: IndexedEntry<Entry>[][] = Array.from({ length: AFFILIATE_POOL_SHARDS }, () => [])
      const pool = await read(locale)
      pool.forEach((entry, position) => shards[affiliatePoolShard(entry.book.contentId)].push({ entry, position }))
      return Promise.all(shards.map(encodeCacheJson))
    })

    const revisionOf = (stored: string) => createHash('sha256').update(stored).digest('hex')
    const chunkOf = (stored: string, index: number) => stored.slice(index * AFFILIATE_POOL_CHUNK_BYTES, (index + 1) * AFFILIATE_POOL_CHUNK_BYTES)
    const readChunk = (shard: number, revision: string, index: number, prepared?: string) => cache(
      async () => {
        const stored = prepared ?? (await getSnapshot())[shard]
        // 이전 세대의 조각이 사라졌을 때 새 데이터와 섞어 압축 스트림을 깨뜨리지 않는다.
        if (revisionOf(stored) !== revision) {
          await repairRoots()
          throw new MissingSnapshot()
        }
        return chunkOf(stored, index)
      },
      [...keyParts, 'chunk', locale, String(shard), revision, String(index)],
      // 내용 해시가 키이므로 불변 조각은 만료·태그 갱신이 필요 없다. 루트가 새 세대를 고른다.
      { revalidate: false },
    )()

    const readShard = cache(async (shard: number): Promise<StoredShard> => {
      const stored = (await getSnapshot())[shard]
      if (stored.length <= AFFILIATE_POOL_CHUNK_BYTES) return stored
      const revision = revisionOf(stored)
      const chunks = Math.ceil(stored.length / AFFILIATE_POOL_CHUNK_BYTES)
      // 조각 개수만 저장해 메타데이터도 데이터 증가에 따라 커지지 않게 한다.
      await Promise.all(Array.from({ length: chunks }, (_, index) => readChunk(shard, revision, index, stored)))
      return { revision, chunks }
    }, [...keyParts, 'shard', locale], options)

    let repair: Promise<StoredShard[]> | undefined
    // 조각 미스 콜백 안의 중첩 캐시는 재계산된다. 낡은 루트도 바꿔 다음 요청은 다시 캐시를 탄다.
    const repairRoots = () => repair ??= Promise.all(Array.from({ length: AFFILIATE_POOL_SHARDS }, (_, shard) => readShard(shard)))

    try {
      const shards = await Promise.all(Array.from({ length: AFFILIATE_POOL_SHARDS }, async (_, shard) => {
        const stored = await readShard(shard)
        const encoded = typeof stored === 'string' ? stored : (await Promise.all(
          Array.from({ length: stored.chunks }, (_, index) => readChunk(shard, stored.revision, index)),
        )).join('')
        return decodeCacheJson<IndexedEntry<Entry>[]>(encoded)
      }))
      // 완전 동점도 원래 위치로 복원해야 날짜별 회전 추천이 달라지지 않는다.
      return shards.flat().sort((a, b) => b.entry.modernCount - a.entry.modernCount
        || b.entry.userCount - a.entry.userCount || a.position - b.position).map(({ entry }) => entry)
    } catch (error) {
      if (!(error instanceof MissingSnapshot)) throw error
      const shards = await Promise.all((await getSnapshot()).map(stored => decodeCacheJson<IndexedEntry<Entry>[]>(stored)))
      return shards.flat().sort((a, b) => a.position - b.position).map(({ entry }) => entry)
    }
  }
}
