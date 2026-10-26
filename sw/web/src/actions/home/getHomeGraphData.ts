'use server'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { excludedBookEditionReason } from '@feelandnote/content-search/book-edition-policy'
import { getPublicUserContents, type UserContentPublic } from '@/actions/contents/getUserContents'
import { getFigureBookPresentationsForCeleb } from '@/actions/figure-books/getFigureBookPresentations'
import { getCelebFactionBooks } from '@/actions/celebs/getCelebFactionBooks'
import { getDisplayFigureBookGroups } from '@/lib/celeb/authoredBooks'
import { isBookShelfAvailable } from '@/lib/books/bookShelf'
import { cachedList, STATIC_REVALIDATE, throwOnQueryError } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import { HOME_GRAPH_CANDIDATE_COUNT, HOME_GRAPH_MEDIA, HOME_GRAPH_PEOPLE, HOME_GRAPH_PICKS, HOME_GRAPH_PREVIEW_COUNT, HOME_GRAPH_READING_PICKS } from '@/components/features/home/introduction/config'
import type { HomeGraphData, HomeGraphMode, HomeGraphPerson } from '@/components/features/home/introduction/types'
import { homeAffiliationBookItem, homeAppreciationItem, homeFigureBookItem, uniqueHomeGraphItems } from './homeGraphItems'

async function personForHome(slug: string, locale: string): Promise<HomeGraphPerson | null> {
  const { data, error } = await createStaticClient().from('celebs')
    .select('id,slug,nickname,nickname_en,avatar_url,title,title_en')
    .eq('slug', slug).eq('publication_status', 'active').maybeSingle()
  throwOnQueryError('홈 그래프 인물', error)
  if (!data?.slug) return null
  return { id: data.id, slug: data.slug, name: (locale === 'en' ? data.nickname_en : data.nickname) || data.nickname,
    avatarUrl: data.avatar_url, title: locale === 'en' ? data.title_en : data.title }
}

function displayableRecord(row: UserContentPublic) {
  if (row.content.type !== 'BOOK') return true
  if (!row.content.thumbnail_url) return false
  const edition = row.content.bookLocale
  return !!edition?.title && !!edition.thumbnail_url
    && isBookShelfAvailable({ titleBadge: row.content.title_badge })
    && !excludedBookEditionReason({ ...edition, contentId: row.content_id })
}

async function fetchAppreciationGraph(locale: string, slug: string): Promise<HomeGraphData | null> {
  const person = await personForHome(slug, locale)
  if (!person) return null
  const branches = await Promise.all(HOME_GRAPH_MEDIA.map(async type => {
    const result = await getPublicUserContents({ userId: person.id, type, hasReview: true, limit: HOME_GRAPH_CANDIDATE_COUNT,
      preferredContentIds: slug === HOME_GRAPH_PEOPLE.appreciations[0] ? [...HOME_GRAPH_PICKS[type]] : [] }, locale)
    const items = result.items.filter(displayableRecord).map(row => homeAppreciationItem(row, locale))
      .filter(item => item.text?.trim() && item.sourceUrl).slice(0, HOME_GRAPH_PREVIEW_COUNT)
    return { key: type, count: result.total, items }
  }))
  return { person, branches }
}

async function fetchReadingGraph(locale: string, slug: string): Promise<HomeGraphData | null> {
  const person = await personForHome(slug, locale)
  if (!person) return null
  const [read, references, affiliations] = await Promise.all([
    getPublicUserContents({ userId: person.id, type: 'BOOK', limit: HOME_GRAPH_CANDIDATE_COUNT,
      preferredContentIds: [...(HOME_GRAPH_READING_PICKS[slug] ?? [])] }, locale),
    getFigureBookPresentationsForCeleb(person.id, locale, true),
    getCelebFactionBooks(person.id, locale),
  ])
  const { appeared, authored } = getDisplayFigureBookGroups(references)
  const affiliationItems = uniqueHomeGraphItems(affiliations.flatMap(group => group.books.map(book =>
    homeAffiliationBookItem(book, group.factionSlug, group.factionName))))
  const readItems = read.items.filter(displayableRecord).slice(0, HOME_GRAPH_PREVIEW_COUNT)
  return { person, branches: [
    { key: 'read', count: read.total, items: readItems.map(row => homeAppreciationItem(row, locale)) },
    { key: 'appearance', count: appeared.length, items: appeared.slice(0, HOME_GRAPH_PREVIEW_COUNT).map(homeFigureBookItem) },
    { key: 'authored', count: authored.length, items: authored.slice(0, HOME_GRAPH_PREVIEW_COUNT).map(homeFigureBookItem) },
    { key: 'affiliation', count: affiliationItems.length, items: affiliationItems.slice(0, HOME_GRAPH_PREVIEW_COUNT) },
  ] }
}

export async function getHomeGraphData(mode: HomeGraphMode, locale: string, slug: string = HOME_GRAPH_PEOPLE[mode][0]): Promise<HomeGraphData | null> {
  if (!(HOME_GRAPH_PEOPLE[mode] as readonly string[]).includes(slug)) return null
  const picks = mode === 'books' ? [...(HOME_GRAPH_READING_PICKS[slug] ?? [])] : HOME_GRAPH_MEDIA.flatMap(type => [...HOME_GRAPH_PICKS[type]])
  return cachedList(CACHE_TAGS.CELEBS, ['home-introduction-graph-v4', mode, locale, slug, ...picks],
    () => mode === 'books' ? fetchReadingGraph(locale, slug) : fetchAppreciationGraph(locale, slug),
    { revalidate: STATIC_REVALIDATE, extraTags: [CACHE_TAGS.CONTENTS, CACHE_TAGS.FIGURE_BOOKS, CACHE_TAGS.FACTIONS] })
}

export async function getHomeGraphDeck(mode: HomeGraphMode, locale: string): Promise<HomeGraphData[]> {
  const results = await Promise.allSettled(HOME_GRAPH_PEOPLE[mode].map(slug => getHomeGraphData(mode, locale, slug)))
  return results.flatMap((result, index) => {
    if (result.status === 'rejected') {
      console.error('[home] 순환 인물 조회 실패', mode, HOME_GRAPH_PEOPLE[mode][index], result.reason)
      return []
    }
    const data = result.value
    return data?.person.avatarUrl && data.branches.length === 4 && data.branches.every(branch => branch.items.length) ? [data] : []
  })
}
