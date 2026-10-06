import { cache } from 'react'
import type { ProfessionOption } from '@feelandnote/shared/constants/celeb-professions'
import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { createClient } from '@/lib/db/server'

export const getCelebProfessions = cache(async (): Promise<ProfessionOption[]> => {
  const db = await createClient()
  return selectAllPages<ProfessionOption>((from, to) => db.from('celeb_professions')
    .select('value,label,label_en,description,description_en').order('sort_order').order('value').range(from, to))
})
