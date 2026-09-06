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
  mapFigureBookEditions,
  mapFigureBookPurchaseOptions,
  type FigureBookEdition,
  type FigureBookEditionRow,
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
  /** 저장된 원어 표제·저자를 창작 판정과 위키데이터 중복 대조에 사용한다. */
  titleKo?: string | null
  titleEn?: string | null
  workTitle?: string | null
  wikidataQid?: string | null
  creatorNames?: string[]
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
  figureBook: { workTitle?: string; workCreator?: string; wikidataQid?: string } | null
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
  includeCatalogOnly: boolean,
): Promise<FigureBookContent[]> {
  const db = createStaticClient()
  const assignments = await getFigureBookAssignmentsByCeleb(celebId)
  if (assignments.length === 0) return []

  const platform = getFigureBookPurchasePlatform(locale)
  if (!platform) return []
  const contentIds = assignments.map((assignment) => assignment.content_id)

  let contentData: ContentRow[]
  let purchaseOptions: FigureBookPurchaseOptionRow[]
  let editionRows: FigureBookEditionRow[]
  try {
    ;[contentData, purchaseOptions, editionRows] = await Promise.all([
      selectInChunks<ContentRow>(
        contentIds,
        (ids) => db
          .from('contents')
          .select(`id,type,figureBook:metadata->figureBook,content_locales(${CL_SELECT_LIST})`)
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
      // 제휴 상품이 없는 작품도 판본 정보로 카드를 세우기 위해 판본 표를 함께 읽는다.
      selectInChunks<FigureBookEditionRow>(
        contentIds,
        (ids) => db
          .from('figure_book_editions')
          .select('id,content_id,locale,title,creator,description,isbn,publisher,thumbnail_url,release_date,edition_kind,text_scope,sort_order')
          .in('content_id', ids)
          .eq('locale', locale)
          .overrideTypes<FigureBookEditionRow[], { merge: false }>(),
      ),
    ])
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`인물 도서 조회 실패: ${message}`)
  }

  const contentById = new Map(contentData.map((content) => [content.id, content]))
  const editionRowsByContent = new Map<string, FigureBookEditionRow[]>()
  for (const row of editionRows) {
    editionRowsByContent.set(row.content_id, [...(editionRowsByContent.get(row.content_id) ?? []), row])
  }
  const optionRowsByContent = new Map<string, FigureBookPurchaseOptionRow[]>()
  for (const option of purchaseOptions) {
    const rows = optionRowsByContent.get(option.content_id) ?? []
    rows.push(option)
    optionRowsByContent.set(option.content_id, rows)
  }

  const sources = assignments.flatMap((assignment): FigureBookContent[] => {
    const content = contentById.get(assignment.content_id)
    if (!content) return []

    // 제휴 상품이 있으면 그 판본만 연다. 하나도 없으면 판본 정보만으로 카드를 세운다.
    const purchasable = mapFigureBookPurchaseOptions(
      optionRowsByContent.get(content.id) ?? [],
      locale,
    )
    const editions = purchasable.length > 0
      ? purchasable
      : mapFigureBookEditions(editionRowsByContent.get(content.id) ?? [], locale)
    // 창작 목록은 판매 판본이 없어도 확인된 해당 언어의 작품 메타로 보여줄 수 있다.
    const exactLocale = content.content_locales?.find((row) => row.locale === locale)
    if (editions.length === 0 && (!includeCatalogOnly || !exactLocale?.title?.trim())) return []

    const flat = flattenLocales(content.content_locales, locale)
    const leadEdition = editions[0]
    return [{
      id: content.id,
      title: flat.title || leadEdition?.title || '',
      creator: flat.creator || leadEdition?.creator || null,
      thumbnailUrl: leadEdition?.thumbnailUrl || flat.thumbnail_url,
      type: content.type,
      category: TYPE_TO_CATEGORY[content.type],
      relationType: assignment.relation_type,
      appearanceDescription: assignment.relation_type === 'appearance'
        ? getFigureBookCharacterDescription(assignment, locale)
        : null,
      editions,
      titleKo: flat.title_ko,
      titleEn: flat.title_en,
      workTitle: content.figureBook?.workTitle ?? null,
      wikidataQid: content.figureBook?.wikidataQid ?? null,
      creatorNames: [...new Set([
        ...(content.content_locales ?? []).map((row) => row.creator),
        content.figureBook?.workCreator,
      ].filter((name): name is string => Boolean(name?.trim())))],
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
  includeCatalogOnly = false,
): Promise<FigureBookContent[]> {
  return cachedDetail(
    CACHE_TAGS.CELEBS,
    celebId,
    ['figure-books-by-celeb-v2-creator-metadata', celebId, locale, String(includeCatalogOnly)],
    () => fetchSourcesByCeleb(celebId, locale, includeCatalogOnly),
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
