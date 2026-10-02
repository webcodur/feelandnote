'use server'

import { getFigureBookPresentationsForCeleb } from '@/actions/figure-books/getFigureBookPresentations'
import { getProfessionPeerBooks, type AffiliateBook } from '@/actions/home/getAffiliateBooks'
import { getDisplayFigureBookGroups } from '@/lib/celeb/authoredBooks'
import { createStaticClient } from '@/lib/db/static'
import { getCelebFactionBooks } from './getCelebFactionBooks'

const PROFESSION_SHELF_LIMIT = 24

export async function getCelebReferenceBooks(celebId: string, locale: string) {
  const db = createStaticClient()
  const [profileResult, figureBooks] = await Promise.all([
    db.from('celebs').select('profession').eq('id', celebId).single(),
    getFigureBookPresentationsForCeleb(celebId, locale),
  ])
  if (profileResult.error) throw profileResult.error
  const groups = getDisplayFigureBookGroups(figureBooks)
  // 직군 — 같은 직군 동료들이 남긴 기록 중 팔리는 책. 등장·집필이 이미 보여 주는 책은 뺀다
  const profession = (profileResult.data.profession as string | null) ?? null
  const excludeIds = new Set<string>([
    ...groups.appeared.map((book) => book.id),
    ...groups.authored.map((book) => book.id),
  ])
  const [professionBooks, factionGroups] = await Promise.all([
    profession
      ? getProfessionPeerBooks(profession, locale === 'en' ? 'en' : 'ko', [celebId], excludeIds, PROFESSION_SHELF_LIMIT)
      : Promise.resolve([] as AffiliateBook[]),
    getCelebFactionBooks(celebId, locale),
  ])
  return { ...groups, profession, professionBooks, factionGroups }
}

export type CelebReferenceBooks = Awaited<ReturnType<typeof getCelebReferenceBooks>>
