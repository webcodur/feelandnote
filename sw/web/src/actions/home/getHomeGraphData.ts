'use server'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { LISTING_DEFAULT_REALITIES } from '@feelandnote/shared/constants/celeb-tiers'
import { excludedBookEditionReason } from '@feelandnote/content-search/book-edition-policy'
import { getPublicUserContents, type UserContentPublic } from '@/actions/contents/getUserContents'
import { getFigureBookPresentationsForCeleb } from '@/actions/figure-books/getFigureBookPresentations'
import { getCelebFactionBooks } from '@/actions/celebs/getCelebFactionBooks'
import { getDisplayFigureBookGroups } from '@/lib/celeb/authoredBooks'
import { isBookShelfAvailable } from '@/lib/books/bookShelf'
import { cachedList, STATIC_REVALIDATE, throwOnQueryError } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { HOME_PEOPLE_COUNT, HOME_PEOPLE_GRAPH_ATTEMPTS } from '@/lib/homePeople'
import { HOME_GRAPH_FETCH_LIMIT, HOME_GRAPH_MEDIA, HOME_GRAPH_PICKS } from '@/components/features/home/introduction/config'
import { getProfessionBooks } from '@/actions/books/getProfessionBooks'
import type { HomeGraphData, HomeGraphPerson } from '@/components/features/home/introduction/types'
import { homeAffiliationBookItem, homeAppreciationItem, homeFigureBookItem, homeProfessionBookItem, uniqueHomeGraphItems } from './homeGraphItems'
import { getHomeShowcasePeople } from './getHomePeople'

async function personForHome(slug: string, locale: string): Promise<(HomeGraphPerson & { profession: string | null }) | null> {
  const { data, error } = await createStaticClient().from('celebs')
    .select('id,slug,nickname,nickname_en,avatar_url,portrait_url,title,title_en,nationality,profession')
    .eq('slug', slug).eq('publication_status', 'active').in('celeb_reality', [...LISTING_DEFAULT_REALITIES]).maybeSingle()
  throwOnQueryError('홈 그래프 인물', error)
  if (!data?.slug) return null
  return { id: data.id, slug: data.slug, name: (locale === 'en' ? data.nickname_en : data.nickname) || data.nickname,
    avatarUrl: data.avatar_url, photoUrl: data.portrait_url, title: locale === 'en' ? data.title_en : data.title,
    nationality: data.nationality, profession: data.profession }
}

function displayableRecord(row: UserContentPublic) {
  if (row.content.type !== 'BOOK') return true
  if (!row.content.thumbnail_url) return false
  const edition = row.content.bookLocale
  return !!edition?.title && !!edition.thumbnail_url
    && isBookShelfAvailable({ titleBadge: row.content.title_badge })
    && !excludedBookEditionReason({ ...edition, contentId: row.content_id })
}

async function fetchHomeGraph(locale: string, slug: string): Promise<HomeGraphData | null> {
  const found = await personForHome(slug, locale)
  if (!found) return null
  const { profession, ...person } = found
  const [media, references, professionBooks, affiliations] = await Promise.all([
    Promise.all(HOME_GRAPH_MEDIA.map(async type => {
      const result = await getPublicUserContents({ userId: person.id, type, hasReview: true, limit: HOME_GRAPH_FETCH_LIMIT,
        preferredContentIds: slug === 'lex-fridman' ? [...HOME_GRAPH_PICKS[type]] : [] }, locale)
      const items = result.items.filter(displayableRecord).map(row => homeAppreciationItem(row, locale))
        .filter(item => item.text?.trim() && item.sourceUrl)
      return { key: type, count: result.total, items }
    })),
    getFigureBookPresentationsForCeleb(person.id, locale, true),
    profession && profession !== 'other' ? getProfessionBooks(profession, locale) : [],
    getCelebFactionBooks(person.id, locale),
  ])
  const { appeared, authored } = getDisplayFigureBookGroups(references)
  const professionItems = professionBooks.filter(book => isBookShelfAvailable({ titleBadge: book.titleBadge })).map(homeProfessionBookItem)
  const affiliationItems = uniqueHomeGraphItems(affiliations.flatMap(group => group.books.map(book =>
    homeAffiliationBookItem(book, group.factionSlug, group.factionName, { description: group.factionDescription, group: group.memberGroup }))))
  return { person, branches: [
    ...media,
    { key: 'appearance', count: appeared.length, items: appeared.map(homeFigureBookItem) },
    { key: 'authored', count: authored.length, items: authored.map(homeFigureBookItem) },
    { key: 'profession', count: professionItems.length, items: professionItems },
    { key: 'affiliation', count: affiliationItems.length, items: affiliationItems },
  ] }
}

export async function getHomeGraphData(locale: string, slug: string): Promise<HomeGraphData | null> {
  return cachedList(CACHE_TAGS.CELEBS, ['home-introduction-graph-v13-unified', locale, slug, ...HOME_GRAPH_MEDIA.flatMap(type => [...HOME_GRAPH_PICKS[type]])],
    () => fetchHomeGraph(locale, slug),
    { revalidate: STATIC_REVALIDATE, extraTags: [CACHE_TAGS.CONTENTS, CACHE_TAGS.FIGURE_BOOKS, CACHE_TAGS.FACTIONS] })
}

export async function getHomeGraphDeck(locale: string): Promise<HomeGraphData[]> {
  const candidates = (await getHomeShowcasePeople()).slice(0, HOME_PEOPLE_GRAPH_ATTEMPTS).map(person => person.slug)
  const available: HomeGraphData[] = []
  for (let at = 0; at < candidates.length && available.length < HOME_PEOPLE_COUNT;) {
    const slugs = candidates.slice(at, at + HOME_PEOPLE_COUNT - available.length)
    at += slugs.length
    const results = await Promise.allSettled(slugs.map(slug => getHomeGraphData(locale, slug)))
    results.forEach((result, index) => {
      if (result.status === 'rejected') console.error('[home] 순환 인물 조회 실패', slugs[index], result.reason)
      else if (result.value?.person.avatarUrl && result.value.branches.some(branch => branch.items.length)) available.push(result.value)
    })
  }
  return available
}
