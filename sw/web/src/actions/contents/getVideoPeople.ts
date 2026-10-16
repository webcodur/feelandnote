'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/db/static'
import { createMetadataCache, fetchMetadataJson, METADATA_LIMITS } from '@/lib/publicMetadata'
import { connectVideoProfiles, normalizeVideoCredits, VIDEO_CREDIT_LIMITS, type RawVideoCredits, type VideoCredit, type VideoProfileRow } from '@/lib/celeb/videoCredits'

const readCredits = createMetadataCache<VideoCredit[]>(24 * 60 * 60 * 1000)
const readIdentity = createMetadataCache<string | null>(24 * 60 * 60 * 1000)

async function tmdb<T>(path: string, locale: string, signal: AbortSignal): Promise<T> {
  const key = process.env.TMDB_API_KEY
  if (!key) throw new Error('TMDB is not configured')
  const url = new URL(`https://api.themoviedb.org/3/${path}`)
  url.search = new URLSearchParams({ api_key: key, language: locale === 'en' ? 'en-US' : 'ko-KR' }).toString()
  return fetchMetadataJson<T>(url.toString(), signal)
}

const readProfiles = unstable_cache(async (qids: string[]): Promise<VideoProfileRow[]> => {
  if (!qids.length) return []
  const db = createStaticClient()
  const { data, error } = await db.from('celebs')
    .select('id,wikidata_qid,slug,nickname,nickname_en,avatar_url')
    .eq('publication_status', 'active').in('wikidata_qid', qids)
  if (error) throw new Error('Video profile lookup failed')
  return data as VideoProfileRow[]
}, ['video-credit-profiles-v2-person-id'], { revalidate: 3600, tags: [CACHE_TAGS.CELEBS] })

export async function getVideoPeople(externalId: string, locale: string): Promise<VideoCredit[] | null> {
  const match = /^tmdb-(movie|tv)-([1-9]\d{0,9})$/.exec(externalId)
  if (!match || !['ko', 'en'].includes(locale)) return null
  try {
    const signal = AbortSignal.timeout(METADATA_LIMITS.timeoutMs)
    const path = `${match[1]}/${match[2]}`
    const people = await readCredits(`${path}:${locale}`, async () => {
      const [credits, detail] = await Promise.all([
        tmdb<RawVideoCredits>(`${path}/credits`, locale, signal),
        match[1] === 'tv' ? tmdb<RawVideoCredits>(path, locale, signal) : Promise.resolve<RawVideoCredits>({}),
      ])
      return normalizeVideoCredits({ ...credits, created_by: detail.created_by })
    })
    const identities: Record<number, string> = {}
    for (let start = 0; start < people.length; start += VIDEO_CREDIT_LIMITS.concurrency) {
      if (signal.aborted) break
      await Promise.all(people.slice(start, start + VIDEO_CREDIT_LIMITS.concurrency).map(async person => {
        // 실패한 조회는 캐시하지 않고, 해당 인물은 링크 없는 크레딧으로 남긴다.
        const qid = await readIdentity(String(person.id), async () => {
          const external = await tmdb<{ id: number; wikidata_id?: string }>(`person/${person.id}/external_ids`, locale, signal)
          return external.id === person.id && /^Q[1-9]\d*$/.test(external.wikidata_id ?? '') ? external.wikidata_id! : null
        }).catch(() => null)
        if (qid) identities[person.id] = qid
      }))
    }
    const rows = await readProfiles([...new Set(Object.values(identities))].sort())
    return connectVideoProfiles(people, identities, rows, locale)
  } catch {
    return null
  }
}
