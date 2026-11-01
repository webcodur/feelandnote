'use server'

import { cachedDetail, throwOnQueryError } from '@/lib/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { createStaticClient } from '@/lib/db/static'
import { selectCelebAffiliationBooks } from '@/lib/figure-books/themeBooks'
import { getFactionAffiliationBooks, getFactionThemeBooks, type FactionFigureBook } from '../home/getFactionFigureBooks'

export interface CelebFactionBookGroup {
  factionId: string
  factionSlug: string
  /** 화면 언어의 세력·신화 이름 */
  factionName: string
  factionDescription?: string | null
  memberGroup?: string | null
  isMyth: boolean
  books: FactionFigureBook[]
}

interface MemberRow {
  lv2_id: string
  sort_order: number | null
  group_name: string | null
  group_name_en: string | null
}

interface FactionRow {
  id: string
  slug: string | null
  name: string
  name_en: string | null
  is_myth: boolean | null
  published: boolean | null
  is_featured: boolean | null
  headline: string | null
  headline_en: string | null
  description: string | null
  description_en: string | null
}

/**
 * 개인 참고도서의 소속 선택기는 해당 신화·세력 책장의 주제책을 공유한다.
 * 구성원의 등장·감상·집필 작품은 소속 전체 책장의 각 탭에서 본다.
 * 다른 탭·다른 소속에 같은 주제책이 있어도 이 소속에서 제외하지 않는다.
 */
export async function getCelebFactionBooks(
  celebId: string,
  locale: string,
): Promise<CelebFactionBookGroup[]> {
  const factions = await cachedDetail(CACHE_TAGS.CELEBS, celebId, ['celeb-book-memberships-v2-context', celebId], async () => {
    const db = createStaticClient()
    const memberResult = await db
      .from('faction_member_rows')
      .select('lv2_id, sort_order, group_name, group_name_en')
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
      .select('id, slug, name, name_en, is_myth, published, is_featured, headline, headline_en, description, description_en')
      .in('id', lv2Ids)
      .overrideTypes<FactionRow[], { merge: false }>()
    throwOnQueryError('getCelebFactionBooks/세력', factionError)

    const order = new Map(lv2Ids.map((id, index) => [id, index]))
    return (factionRows ?? [])
      .filter((row) => row.slug && (row.is_myth ? row.published : row.is_featured))
      .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
      .map(row => ({ ...row, membership: memberRows.find(member => member.lv2_id === row.id) }))
  }, { extraTags: [CACHE_TAGS.FACTIONS] })
  // Shared faction caches are read outside the membership cache callback.
  const loaded = await Promise.all(factions.map(async (faction) => {
    const slug = faction.slug as string
    const factionName = locale === 'en' ? (faction.name_en ?? faction.name) : faction.name
    const description = locale === 'en' ? faction.description_en : faction.description
    const summary = description?.trim().split(/\n\s*\n/)[0].split(/(?<=[.!?])\s+/)[0]
    const headline = locale === 'en' ? faction.headline_en : faction.headline
    const assigned = await (faction.is_myth ? getFactionAffiliationBooks(faction.id, locale, factionName) : getFactionThemeBooks(faction.id, locale))
    const books = selectCelebAffiliationBooks(assigned, { name: factionName, isMyth: faction.is_myth === true })
    return {
      factionId: faction.id,
      factionSlug: slug,
      factionName,
      factionDescription: summary || headline || null,
      memberGroup: (locale === 'en' ? faction.membership?.group_name_en : faction.membership?.group_name) ?? null,
      isMyth: faction.is_myth === true,
      books,
    }
  }))
  return loaded.filter(group => group.books.length > 0)
}
