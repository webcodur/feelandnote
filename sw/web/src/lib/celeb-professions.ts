import { cache } from 'react'
import type { ProfessionOption } from '@feelandnote/shared/constants/celeb-professions'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { createStaticClient } from '@/lib/db/static'
import { cachedList } from '@/lib/cache'

/** DB가 직군 정의의 원천이다. DB 변경 트리거가 celebs 태그를 비운다. */
export const getCelebProfessions = cache(async (): Promise<ProfessionOption[]> => cachedList(
  CACHE_TAGS.CELEBS, ['celeb-professions-db'], () => selectAllPages<ProfessionOption>((from, to) => createStaticClient()
    .from('celeb_professions').select('value,label,label_en,description,description_en')
    .order('sort_order').order('value').range(from, to)),
))
