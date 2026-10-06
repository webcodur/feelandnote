'use server'

import { getFigureBookPresentationsForCeleb } from '@/actions/figure-books/getFigureBookPresentations'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'
import { getProfessionBooks } from '@/actions/books/getProfessionBooks'
import { getDisplayFigureBookGroups } from '@/lib/celeb/authoredBooks'
import { createStaticClient } from '@/lib/db/static'
import { getCelebFactionBooks } from './getCelebFactionBooks'

export async function getCelebReferenceBooks(celebId: string, locale: string, initial = false) {
  const db = createStaticClient()
  const [profileResult, figureBooks] = await Promise.all([
    db.from('celebs').select('profession').eq('id', celebId).single(),
    getFigureBookPresentationsForCeleb(celebId, locale, initial),
  ])
  if (profileResult.error) throw profileResult.error
  const groups = getDisplayFigureBookGroups(figureBooks)
  // 직군별 선정은 개인의 등장·집필·감상 관계와 별개로 유지한다.
  const profession = (profileResult.data.profession as string | null) ?? null
  const [professionBooks, factionGroups] = await Promise.all([
    profession
      ? getProfessionBooks(profession, locale)
      : Promise.resolve([] as AffiliateBook[]),
    getCelebFactionBooks(celebId, locale),
  ])
  return { ...groups, profession, professionBooks, factionGroups }
}

export type CelebReferenceBooks = Awaited<ReturnType<typeof getCelebReferenceBooks>>
