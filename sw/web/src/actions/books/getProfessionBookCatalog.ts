'use server'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { getCelebProfessions } from '@/lib/celeb-professions'
import { cachedList } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'

// 책이 등록된 직군만 안내한다. 직군 이름과 순서는 인물 책장과 같은 DB 정의를 쓴다.
export async function getProfessionBookCatalog() {
  const [professions, picks] = await Promise.all([
    getCelebProfessions(),
    cachedList(CACHE_TAGS.CONTENTS, ['profession-book-catalog'], () => selectAllPages<{ profession: string }>(
      (from, to) => createStaticClient().from('profession_book_picks').select('profession')
        .order('profession').order('category').order('content_id').range(from, to),
    ), { extraTags: [CACHE_TAGS.FIGURE_BOOKS] }),
  ])
  const available = new Set(picks.map((pick) => pick.profession))
  return professions.filter((profession) => available.has(profession.value))
}
