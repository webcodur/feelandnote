'use server'

import { getFigureBookPresentationsForCeleb } from '@/actions/figure-books/getFigureBookPresentations'
import type { AffiliateBook } from '@/actions/home/getAffiliateBooks'
import { getProfessionBooks } from '@/actions/books/getProfessionBooks'
import { getDisplayFigureBookGroups } from '@/lib/celeb/authoredBooks'
import { createStaticClient } from '@/lib/db/static'
import { getCelebFactionBooks } from './getCelebFactionBooks'

export async function getCelebReferenceBooks(celebId: string, locale: string, initial = false, knownProfession?: string | null) {
  const professionPromise = knownProfession !== undefined
    ? Promise.resolve(knownProfession)
    : createStaticClient().from('celebs').select('profession').eq('id', celebId).single().then((result) => {
        if (result.error) throw result.error
        return (result.data.profession as string | null) ?? null
      })
  // 네 갈래는 독립이다. 등장·집필 판본을 기다린 뒤 직군·소속 조회를 시작하지 않는다.
  const [figureBooks, profession, professionBooks, factionGroups] = await Promise.all([
    getFigureBookPresentationsForCeleb(celebId, locale, initial),
    professionPromise,
    professionPromise.then((profession) => profession
      ? getProfessionBooks(profession, locale)
      : Promise.resolve([] as AffiliateBook[])),
    getCelebFactionBooks(celebId, locale),
  ])
  return { ...getDisplayFigureBookGroups(figureBooks), profession, professionBooks, factionGroups }
}

export type CelebReferenceBooks = Awaited<ReturnType<typeof getCelebReferenceBooks>>
