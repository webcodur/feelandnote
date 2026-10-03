import { unstable_cache } from 'next/cache'
import { decodeCacheJson, encodeCacheJson } from './cacheJsonCodec'
import { coalesceCacheQuery } from './cacheQuery'

/** 조회 결과를 자르지 않고 압축 저장한다. 태그·수명·재검증은 Next가 그대로 맡는다. */
export function compressedJsonCache<Args extends unknown[], Result>(
  read: (...args: Args) => Promise<Result>,
  keyParts: string[],
  options: Parameters<typeof unstable_cache>[2],
): (...args: Args) => Promise<Result> {
  const readStored = unstable_cache(
    async (...args: Args) => coalesceCacheQuery(JSON.stringify(['compressed', ...keyParts, args]),
      async () => encodeCacheJson(await read(...args))),
    ['gzip-json-v1', read.toString(), ...keyParts],
    options,
  )
  return async (...args) => decodeCacheJson<Result>(await readStored(...args))
}
