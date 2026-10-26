'use server'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { cachedList, throwOnQueryError } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'

export async function getHomeStats() {
  return cachedList(CACHE_TAGS.CELEBS, ['home-public-counts-v1'], async () => {
    const db = createStaticClient()
    const [people, records] = await Promise.all([
      db.from('celebs').select('id', { count: 'exact', head: true }).eq('publication_status', 'active'),
      db.from('celeb_contents').select('id,celebs!inner(id)', { count: 'exact', head: true })
        .eq('celebs.publication_status', 'active').eq('visibility', 'public'),
    ])
    throwOnQueryError('홈 공개 인물 수', people.error)
    throwOnQueryError('홈 공개 감상 기록 수', records.error)
    return { people: people.count ?? 0, records: records.count ?? 0 }
  }, { extraTags: [CACHE_TAGS.CONTENTS] })
}
