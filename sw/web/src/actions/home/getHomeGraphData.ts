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
import { HOME_GRAPH_CANDIDATE_COUNT, HOME_GRAPH_MEDIA, HOME_GRAPH_PICKS, HOME_GRAPH_PREVIEW_COUNT, HOME_GRAPH_READING_PICKS } from '@/components/features/home/introduction/config'
import type { HomeGraphData, HomeGraphMode, HomeGraphPerson } from '@/components/features/home/introduction/types'
import { homeAffiliationBookItem, homeAppreciationItem, homeFigureBookItem, uniqueHomeGraphItems } from './homeGraphItems'
import { getHomeShowcasePeople } from './getHomePeople'

async function personForHome(slug: string, locale: string): Promise<HomeGraphPerson | null> {
  const { data, error } = await createStaticClient().from('celebs')
    .select('id,slug,nickname,nickname_en,avatar_url,portrait_url,title,title_en,nationality')
    .eq('slug', slug).eq('publication_status', 'active').in('celeb_reality', [...LISTING_DEFAULT_REALITIES]).maybeSingle()
  throwOnQueryError('홈 그래프 인물', error)
  if (!data?.slug) return null
  return { id: data.id, slug: data.slug, name: (locale === 'en' ? data.nickname_en : data.nickname) || data.nickname,
    avatarUrl: data.avatar_url, photoUrl: data.portrait_url, title: locale === 'en' ? data.title_en : data.title,
    nationality: data.nationality }
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
      preferredContentIds: slug === 'lex-fridman' ? [...HOME_GRAPH_PICKS[type]] : [] }, locale)
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
    homeAffiliationBookItem(book, group.factionSlug, group.factionName, { description: group.factionDescription, group: group.memberGroup }))))
  const readItems = read.items.filter(displayableRecord).slice(0, HOME_GRAPH_PREVIEW_COUNT)
  return { person, branches: [
    { key: 'read', count: read.total, items: readItems.map(row => homeAppreciationItem(row, locale)) },
    { key: 'appearance', count: appeared.length, items: appeared.slice(0, HOME_GRAPH_PREVIEW_COUNT).map(homeFigureBookItem) },
    { key: 'authored', count: authored.length, items: authored.slice(0, HOME_GRAPH_PREVIEW_COUNT).map(homeFigureBookItem) },
    { key: 'affiliation', count: affiliationItems.length, items: affiliationItems.slice(0, HOME_GRAPH_PREVIEW_COUNT) },
  ] }
}

export async function getHomeGraphData(mode: HomeGraphMode, locale: string, slug: string): Promise<HomeGraphData | null> {
  const picks = mode === 'books' ? [...(HOME_GRAPH_READING_PICKS[slug] ?? [])] : HOME_GRAPH_MEDIA.flatMap(type => [...HOME_GRAPH_PICKS[type]])
  return cachedList(CACHE_TAGS.CELEBS, ['home-introduction-graph-v11-person-first', mode, locale, slug, ...picks],
    () => mode === 'books' ? fetchReadingGraph(locale, slug) : fetchAppreciationGraph(locale, slug),
    { revalidate: STATIC_REVALIDATE, extraTags: [CACHE_TAGS.CONTENTS, CACHE_TAGS.FIGURE_BOOKS, CACHE_TAGS.FACTIONS] })
}

export async function getHomeGraphDeck(mode: HomeGraphMode, locale: string): Promise<HomeGraphData[]> {
  // 감상 구획의 편성을 먼저 확정해 인물과 책 구획에 같은 인물이 나오지 않게 한다.
  const taken = new Set(mode === 'books' ? (await getHomeGraphDeck('appreciations', locale)).map(data => data.person.id) : [])
  const candidates = (await getHomeShowcasePeople(mode)).filter(person => !taken.has(person.id))
    .slice(0, HOME_PEOPLE_GRAPH_ATTEMPTS).map(person => person.slug)
  const available: HomeGraphData[] = []
  for (let at = 0; at < candidates.length && available.length < HOME_PEOPLE_COUNT;) {
    const slugs = candidates.slice(at, at + HOME_PEOPLE_COUNT - available.length)
    at += slugs.length
    const results = await Promise.allSettled(slugs.map(slug => getHomeGraphData(mode, locale, slug)))
    results.forEach((result, index) => {
      if (result.status === 'rejected') console.error('[home] 순환 인물 조회 실패', mode, slugs[index], result.reason)
      else if (result.value?.person.avatarUrl && result.value.branches.some(branch => branch.items.length)) available.push(result.value)
    })
  }
  return available
}
