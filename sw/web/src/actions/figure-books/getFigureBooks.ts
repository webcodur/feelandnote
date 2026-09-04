'use server'

import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectInChunks } from '@feelandnote/shared/lib/paginate'
import type { CategoryId } from '@/constants/categories'
import { cachedDetail } from '@/lib/cache'
import { createStaticClient } from '@/lib/db/static'
import {
  CL_SELECT_LIST,
  flattenLocales,
  type ContentLocaleRow,
} from '@/lib/utils/content-locale'
import type { ContentType } from '@/types/database'
import {
  getFigureBookCharacterDescription,
  getFigureBookPurchasePlatform,
  mapFigureBookPurchaseOptions,
  type FigureBookEdition,
  type FigureBookPurchaseOptionRow,
} from './figureBookLocale'
import {
  getFigureBookAssignmentsByCeleb,
  getFigureBookAssignmentsByContent,
  type FigureBookAssignmentRow,
  type FigureBookRelationType,
} from './figureBookAssignments'

export type { FigureBookRelationType } from './figureBookAssignments'
export type { FigureBookEdition } from './figureBookLocale'

export interface FigureBookContent {
  id: string
  title: string
  creator: string | null
  thumbnailUrl: string | null
  type: ContentType
  category: CategoryId
  relationType: FigureBookRelationType
  appearanceDescription: string | null
  editions: FigureBookEdition[]
}

export interface FigureBookCharacter {
  id: string
  slug: string
  nickname: string
  title: string | null
  avatarUrl: string | null
  relationType: FigureBookRelationType
}

interface ContentRow {
  id: string
  type: ContentType
  content_locales: ContentLocaleRow[] | null
}

interface ProfileRow {
  id: string
  slug: string | null
  nickname: string | null
  nickname_en: string | null
  title: string | null
  title_en: string | null
  avatar_url: string | null
}

const TYPE_TO_CATEGORY: Record<ContentType, CategoryId> = {
  BOOK: 'book',
  VIDEO: 'video',
  GAME: 'game',
  MUSIC: 'music',
}

async function fetchSourcesByCeleb(
  celebId: string,
  locale: string,
): Promise<FigureBookContent[]> {
  const db = createStaticClient()
  const assignments = await getFigureBookAssignmentsByCeleb(celebId)
  if (assignments.length === 0) return []

  const platform = getFigureBookPurchasePlatform(locale)
  if (!platform) return []
  const contentIds = assignments.map((assignment) => assignment.content_id)

  let contentData: ContentRow[]
  let purchaseOptions: FigureBookPurchaseOptionRow[]
  try {
    ;[contentData, purchaseOptions] = await Promise.all([
      selectInChunks<ContentRow>(
        contentIds,
        (ids) => db
          .from('contents')
          .select(`id,type,content_locales(${CL_SELECT_LIST})`)
          .in('id', ids)
          .overrideTypes<ContentRow[], { merge: false }>(),
      ),
      selectInChunks<FigureBookPurchaseOptionRow>(
        contentIds,
        (ids) => db
          .from('figure_book_purchase_options')
          .select('edition_id,content_id,locale,title,creator,description,isbn,publisher,thumbnail_url,release_date,edition_kind,text_scope,sort_order,platform,affiliate_url')
          .in('content_id', ids)
          .eq('locale', locale)
          .eq('platform', platform)
          .overrideTypes<FigureBookPurchaseOptionRow[], { merge: false }>(),
      ),
    ])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`인물 도서 조회 실패: ${message}`)
  }

  const contentById = new Map(contentData.map((content) => [content.id, content]))
  const optionRowsByContent = new Map<string, FigureBookPurchaseOptionRow[]>()
  for (const option of purchaseOptions) {
    const rows = optionRowsByContent.get(option.content_id) ?? []
    rows.push(option)
    optionRowsByContent.set(option.content_id, rows)
  }

  const sources = assignments.flatMap((assignment): FigureBookContent[] => {
    const content = contentById.get(assignment.content_id)
    if (!content) return []

    const editions = mapFigureBookPurchaseOptions(
      optionRowsByContent.get(content.id) ?? [],
      locale,
    )
    // 관계는 작품에 남겨 두되, 공개 책장에는 활성 제휴 상품이 있는 판본만 연다.
    if (editions.length === 0) return []

    const flat = flattenLocales(content.content_locales, locale)
    const leadEdition = editions[0]
    return [{
      id: content.id,
      title: flat.title || leadEdition.title,
      creator: flat.creator || leadEdition.creator,
      thumbnailUrl: leadEdition.thumbnailUrl || flat.thumbnail_url,
      type: content.type,
      category: TYPE_TO_CATEGORY[content.type],
      relationType: assignment.relation_type,
      appearanceDescription: assignment.relation_type === 'appearance'
        ? getFigureBookCharacterDescription(assignment, locale)
        : null,
      editions,
    }]
  })

  return sources
}

async function fetchCharactersByContent(
  contentId: string,
  locale: string,
  knownAssignments?: FigureBookAssignmentRow[],
): Promise<FigureBookCharacter[]> {
  const db = createStaticClient()
  const assignments = knownAssignments
    ?? await getFigureBookAssignmentsByContent(contentId)
  if (assignments.length === 0) return []

  let profileData: ProfileRow[]
  try {
    profileData = await selectInChunks<ProfileRow>(
      assignments.map((assignment) => assignment.celeb_id),
      (celebIds) => db
        .from('celebs')
        .select('id,slug,nickname,nickname_en,title,title_en,avatar_url')
        .in('id', celebIds)
        .eq('publication_status', 'active')
        .overrideTypes<ProfileRow[], { merge: false }>(),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`도서 연결 인물 조회 실패: ${message}`)
  }

  const profileById = new Map(profileData.map((profile) => [profile.id, profile]))
  const isEnglish = locale === 'en'
  return assignments.flatMap((assignment): FigureBookCharacter[] => {
    const profile = profileById.get(assignment.celeb_id)
    if (!profile?.slug) return []
    return [{
      id: profile.id,
      slug: profile.slug,
      nickname: (
        isEnglish
          ? profile.nickname_en || profile.nickname
          : profile.nickname
      ) || profile.slug,
      title: isEnglish ? profile.title_en || profile.title : profile.title,
      avatarUrl: profile.avatar_url,
      relationType: assignment.relation_type,
    }]
  })
}

export async function getFigureBooksForCeleb(
  celebId: string,
  locale: string = 'ko',
): Promise<FigureBookContent[]> {
  return cachedDetail(
    CACHE_TAGS.CELEBS,
    celebId,
    ['figure-books-by-celeb-v1-two-relations', celebId, locale],
    () => fetchSourcesByCeleb(celebId, locale),
    { extraTags: [CACHE_TAGS.FIGURE_BOOKS, CACHE_TAGS.CONTENTS] },
  )
}

export async function getFigureBookCharactersForContent(
  contentId: string,
  locale: string = 'ko',
): Promise<FigureBookCharacter[]> {
  return cachedDetail(
    CACHE_TAGS.CONTENTS,
    contentId,
    ['figure-book-people-by-content-v1', contentId, locale],
    () => fetchCharactersByContent(contentId, locale),
    { extraTags: [CACHE_TAGS.FIGURE_BOOKS, CACHE_TAGS.CELEBS] },
  )
}
