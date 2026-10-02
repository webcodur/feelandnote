'use server'

import { throwOnQueryError, withQueryFallback } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { selectCelebAffiliationBooks } from '@/lib/figure-books/themeBooks'
import { getFactionFigureBooks, getFactionThemeBooks, type FactionFigureBook } from '../home/getFactionFigureBooks'

export interface CelebFactionBookGroup {
  factionId: string
  factionSlug: string
  /** 화면 언어의 세력·신화 이름 */
  factionName: string
  isMyth: boolean
  books: FactionFigureBook[]
}

interface MemberRow {
  lv2_id: string
  sort_order: number | null
}

interface FactionRow {
  id: string
  slug: string | null
  name: string
  name_en: string | null
  is_myth: boolean | null
  published: boolean | null
  is_featured: boolean | null
}

/**
 * 개인 참고도서의 소속 탭은 해당 신화·세력 책장의 주제책을 공유한다.
 * 구성원의 등장·감상·집필 작품은 소속 전체 책장의 각 탭에서 본다.
 * 다른 탭·다른 소속에 같은 주제책이 있어도 이 소속에서 제외하지 않는다.
 */
export async function getCelebFactionBooks(
  celebId: string,
  locale: string,
): Promise<CelebFactionBookGroup[]> {
  return withQueryFallback('getCelebFactionBooks', async () => {
    const db = createStaticClient()
    const memberResult = await db
      .from('faction_member_rows')
      .select('lv2_id, sort_order')
      .eq('celeb_id', celebId)
      .eq('hidden', false)
      .order('sort_order', { ascending: true })
      .overrideTypes<MemberRow[], { merge: false }>()
    throwOnQueryError('getCelebFactionBooks/편성', memberResult.error)
    const memberRows = memberResult.data
    if (!memberRows?.length) return []

    const lv2Ids = [...new Set(memberRows.map((row) => row.lv2_id))]
    const { data: factionRows, error: factionError } = await db
      .from('faction_lv2')
      .select('id, slug, name, name_en, is_myth, published, is_featured')
      .in('id', lv2Ids)
      .overrideTypes<FactionRow[], { merge: false }>()
    throwOnQueryError('getCelebFactionBooks/세력', factionError)

    const order = new Map(lv2Ids.map((id, index) => [id, index]))
    const factions = (factionRows ?? [])
      .filter((row) => row.slug && (row.is_myth ? row.published : row.is_featured))
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))

    const groups: CelebFactionBookGroup[] = []
    const loaded = await Promise.all(factions.map(async (faction) => {
      const slug = faction.slug as string
      const assigned = await (faction.is_myth ? getFactionFigureBooks : getFactionThemeBooks)(faction.id, locale)
      const factionName = locale === 'en' ? (faction.name_en ?? faction.name) : faction.name
      const books = selectCelebAffiliationBooks(assigned, { name: factionName, isMyth: faction.is_myth === true })
      return {
        factionId: faction.id,
        factionSlug: slug,
        factionName,
        isMyth: faction.is_myth === true,
        books,
      }
    }))
    groups.push(...loaded.filter((group) => group.books.length > 0))
    return groups
  }, [])
}
