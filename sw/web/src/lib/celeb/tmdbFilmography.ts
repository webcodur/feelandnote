// 서버 라우트 전용. API 키와 원본 크레딧은 브라우저에 전달하지 않는다.
import { createMetadataCache, fetchMetadataJson, MetadataError, METADATA_LIMITS } from '@/lib/publicMetadata'
import { FILMOGRAPHY_CACHE_TTL_MS, normalizeFilmography, type Filmography, type TmdbPersonCredits } from './filmography'

const readCached = createMetadataCache<Filmography>(FILMOGRAPHY_CACHE_TTL_MS)
const EMPTY: Filmography = { personId: null, imdbId: null, works: [] }

export function getTmdbFilmography(qid: string, locale: 'ko' | 'en'): Promise<Filmography> {
  return readCached(`${qid}:${locale}`, async () => {
    const key = process.env.TMDB_API_KEY
    if (!key) throw new MetadataError('Filmography is not configured', 503)
    const signal = AbortSignal.timeout(METADATA_LIMITS.timeoutMs)
    const tmdb = <T>(path: string, params: Record<string, string> = {}) => {
      const url = new URL(`https://api.themoviedb.org/3/${path}`)
      url.search = new URLSearchParams({ api_key: key, language: locale === 'ko' ? 'ko-KR' : 'en-US', ...params }).toString()
      return fetchMetadataJson<T>(url.toString(), signal)
    }
    type Found = { person_results?: { id: number }[] }
    const find = (id: string, source: string) => tmdb<Found>(`find/${id}`, { external_source: source })
    let found = await find(qid, 'wikidata_id')
    let imdb: string | undefined
    if (!found.person_results?.length) {
      // QID가 TMDB에 없을 때만 검증된 위키 항목의 IMDb ID로 연결한다. 이름 추정은 하지 않는다.
      const entity = await fetchMetadataJson<{ entities?: Record<string, { claims?: {
        P345?: { rank?: string; mainsnak?: { datavalue?: { value?: string } } }[]
      } }> }>(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`, signal)
      const ids = [...new Set((entity.entities?.[qid]?.claims?.P345 ?? [])
        .filter(claim => claim.rank !== 'deprecated')
        .map(claim => claim.mainsnak?.datavalue?.value).filter((id): id is string => /^nm\d+$/.test(id ?? '')))]
      if (ids.length !== 1) return EMPTY
      imdb = ids[0]
      found = await find(imdb, 'imdb_id')
    }
    if (found.person_results?.length !== 1) return EMPTY
    const id = found.person_results[0].id
    if (!Number.isSafeInteger(id) || id <= 0) return EMPTY
    const person = await tmdb<TmdbPersonCredits>(`person/${id}`, { append_to_response: 'combined_credits,external_ids' })
    if (person.id !== id) return EMPTY
    const external = person.external_ids
    if (external?.wikidata_id && external.wikidata_id !== qid) return EMPTY
    if (imdb && external?.imdb_id !== imdb) return EMPTY
    return normalizeFilmography(person)
  })
}
