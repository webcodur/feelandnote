'use server'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectInChunks } from '@feelandnote/shared/lib/paginate'
import type { CategoryId } from '@/constants/categories'
import { cachedDetail } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import {
  CL_SELECT,
  flattenLocales,
  type ContentLocaleRow,
} from '@/lib/utils/content-locale'
import type { ContentType } from '@/types/database'
import {
  getFictionSourceCharacterDescription,
  getFictionSourceLocaleFields,
} from './fictionSourceLocale'
import {
  getAllFictionSourceAssignments,
  type FictionSourceAssignmentRow,
  type FictionSourceRelationType,
} from './fictionSourceAssignments'

export type { FictionSourceRelationType } from './fictionSourceAssignments'

export interface FictionSourceContent {
  id: string
  title: string
  creator: string | null
  thumbnailUrl: string | null
  type: ContentType
  category: CategoryId
  relationType: FictionSourceRelationType
  appearanceDescription: string | null
  description: string | null
  publisher: string | null
  isbn: string | null
  releaseDate: string | null
  coupangUrl: string | null
}

export interface FictionSourceCharacter {
  id: string
  slug: string
  nickname: string
  title: string | null
  avatarUrl: string | null
  relationType: FictionSourceRelationType
}

interface ContentRow {
  id: string
  type: ContentType
  release_date: string | null
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
): Promise<FictionSourceContent[]> {
  const supabase = createStaticClient()
  const assignments = (await getAllFictionSourceAssignments())
    .filter((assignment) => assignment.celeb_id === celebId)
  if (assignments.length === 0) return []

  let contentData: ContentRow[]
  try {
    contentData = await selectInChunks<ContentRow>(
      assignments.map((assignment) => assignment.content_id),
      (contentIds) => supabase
        .from('contents')
        .select(`id,type,release_date,content_locales(${CL_SELECT})`)
        .in('id', contentIds)
        .overrideTypes<ContentRow[], { merge: false }>(),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`픽션 인물 대표 원전 조회 실패: ${message}`)
  }

  const contentById = new Map(contentData.map((content) => [content.id, content]))
  const sources = assignments.flatMap((assignment): FictionSourceContent[] => {
    const content = contentById.get(assignment.content_id)
    if (!content) return []
    const flat = flattenLocales(content.content_locales, locale)
    const localeFields = getFictionSourceLocaleFields(content.content_locales, locale)
    return [{
      id: content.id,
      title: flat.title,
      creator: flat.creator,
      thumbnailUrl: flat.thumbnail_url,
      type: content.type,
      category: TYPE_TO_CATEGORY[content.type],
      relationType: assignment.relation_type,
      appearanceDescription: getFictionSourceCharacterDescription(assignment, locale),
      description: localeFields.description,
      publisher: localeFields.publisher,
      isbn: localeFields.isbn,
      releaseDate: content.release_date,
      coupangUrl: localeFields.coupangUrl,
    }]
  })

  return sources.sort((a, b) => (
    a.title.localeCompare(b.title, locale)
    || a.id.localeCompare(b.id)
  ))
}

async function fetchCharactersByContent(
  contentId: string,
  locale: string,
  knownAssignments?: FictionSourceAssignmentRow[],
): Promise<FictionSourceCharacter[]> {
  const supabase = createStaticClient()
  const assignments = (knownAssignments ?? await getAllFictionSourceAssignments())
    .filter((assignment) => assignment.content_id === contentId)
    .sort((a, b) => a.sort_order - b.sort_order || a.celeb_id.localeCompare(b.celeb_id))
  if (assignments.length === 0) return []

  let profileData: ProfileRow[]
  try {
    profileData = await selectInChunks<ProfileRow>(
      assignments.map((assignment) => assignment.celeb_id),
      (celebIds) => supabase
        .from('celebs')
        .select('id,slug,nickname,nickname_en,title,title_en,avatar_url')
        .in('id', celebIds)
        .eq('celeb_tier', 'fiction')
        .eq('publication_status', 'active')
        .overrideTypes<ProfileRow[], { merge: false }>(),
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`대표 원전 등장인물 조회 실패: ${message}`)
  }

  const profileById = new Map(profileData.map((profile) => [profile.id, profile]))
  const isEnglish = locale === 'en'
  return assignments.flatMap((assignment): FictionSourceCharacter[] => {
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

export async function getFictionSourcesForCeleb(
  celebId: string,
  locale: string = 'ko',
): Promise<FictionSourceContent[]> {
  return cachedDetail(
    CACHE_TAGS.CELEBS,
    celebId,
    ['fiction-sources-by-celeb-v4-character-descriptions', celebId, locale],
    () => fetchSourcesByCeleb(celebId, locale),
    { extraTags: [CACHE_TAGS.FICTION_SOURCES, CACHE_TAGS.CONTENTS] },
  )
}

export async function getFictionCharactersForContent(
  contentId: string,
  locale: string = 'ko',
): Promise<FictionSourceCharacter[]> {
  const assignments = await getAllFictionSourceAssignments()
  if (!assignments.some((assignment) => assignment.content_id === contentId)) return []

  return cachedDetail(
    CACHE_TAGS.CONTENTS,
    contentId,
    ['fiction-characters-by-content', contentId, locale],
    () => fetchCharactersByContent(contentId, locale, assignments),
    { extraTags: [CACHE_TAGS.FICTION_SOURCES, CACHE_TAGS.CELEBS] },
  )
}
