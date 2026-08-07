'use server'

import { unstable_cache } from 'next/cache'
import { CACHE_TAGS } from '@feelandnote/shared/constants/cache-tags'
import { selectInChunks } from '@feelandnote/shared/lib/paginate'
import type { CategoryId } from '@/constants/categories'
import { STATIC_REVALIDATE, cachedDetail } from '@/lib/cache'
import { createStaticClient } from '@/lib/supabase/static'
import {
  CL_SELECT,
  flattenLocales,
  type ContentLocaleRow,
} from '@/lib/utils/content-locale'
import type { ContentType } from '@/types/database'

export type FictionSourceRelationType = 'appearance' | 'origin' | 'adaptation'

export interface FictionSourceContent {
  id: string
  title: string
  creator: string | null
  thumbnailUrl: string | null
  type: ContentType
  category: CategoryId
  relationType: FictionSourceRelationType
}

export interface FictionSourceCharacter {
  id: string
  slug: string
  nickname: string
  title: string | null
  avatarUrl: string | null
  relationType: FictionSourceRelationType
}

interface AssignmentRow {
  content_id: string
  celeb_id: string
  relation_type: FictionSourceRelationType
  sort_order: number
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

const ASSIGNMENT_PAGE_SIZE = 500

/**
 * 콘텐츠 상세 1만여 면마다 관계 테이블을 한 번씩 조회하지 않도록 전체 연결을 한 캐시키로
 * 공유한다. 1,000행 PostgREST 상한을 넘겨도 조용히 잘리지 않게 고정 정렬 + 페이징한다.
 */
async function fetchAllAssignments(): Promise<AssignmentRow[]> {
  const supabase = createStaticClient()
  const rows: AssignmentRow[] = []

  for (let from = 0; ; from += ASSIGNMENT_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('fiction_source_characters')
      .select('content_id,celeb_id,relation_type,sort_order')
      .order('content_id')
      .order('sort_order')
      .order('celeb_id')
      .range(from, from + ASSIGNMENT_PAGE_SIZE - 1)
      .overrideTypes<AssignmentRow[], { merge: false }>()

    if (error) {
      throw new Error(`픽션 원전 인물 연결 조회 실패: ${error.message}`)
    }

    const page = data ?? []
    rows.push(...page)
    if (page.length < ASSIGNMENT_PAGE_SIZE) break
  }

  return rows
}

const fetchAllAssignmentsCached = unstable_cache(
  fetchAllAssignments,
  ['fiction-source-character-assignments'],
  {
    revalidate: STATIC_REVALIDATE,
    tags: [CACHE_TAGS.FICTION_SOURCES],
  },
)

async function fetchSourcesByCeleb(
  celebId: string,
  locale: string,
): Promise<FictionSourceContent[]> {
  const supabase = createStaticClient()
  const assignments = (await fetchAllAssignmentsCached())
    .filter((assignment) => assignment.celeb_id === celebId)
  if (assignments.length === 0) return []

  let contentData: ContentRow[]
  try {
    contentData = await selectInChunks<ContentRow>(
      assignments.map((assignment) => assignment.content_id),
      (contentIds) => supabase
        .from('contents')
        .select(`id,type,content_locales(${CL_SELECT})`)
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
    return [{
      id: content.id,
      title: flat.title,
      creator: flat.creator,
      thumbnailUrl: flat.thumbnail_url,
      type: content.type,
      category: TYPE_TO_CATEGORY[content.type],
      relationType: assignment.relation_type,
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
  knownAssignments?: AssignmentRow[],
): Promise<FictionSourceCharacter[]> {
  const supabase = createStaticClient()
  const assignments = (knownAssignments ?? await fetchAllAssignmentsCached())
    .filter((assignment) => assignment.content_id === contentId)
    .sort((a, b) => a.sort_order - b.sort_order || a.celeb_id.localeCompare(b.celeb_id))
  if (assignments.length === 0) return []

  let profileData: ProfileRow[]
  try {
    profileData = await selectInChunks<ProfileRow>(
      assignments.map((assignment) => assignment.celeb_id),
      (celebIds) => supabase
        .from('profiles')
        .select('id,slug,nickname,nickname_en,title,title_en,avatar_url')
        .in('id', celebIds)
        .eq('profile_type', 'CELEB')
        .eq('celeb_tier', 'fiction')
        .eq('status', 'active')
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
  // 인물 한 명이 등장하는 원전 — 그 인물 항목 태그를 단다
  return cachedDetail(
    CACHE_TAGS.CELEBS,
    celebId,
    ['fiction-sources-by-celeb', celebId, locale],
    () => fetchSourcesByCeleb(celebId, locale),
    { extraTags: [CACHE_TAGS.FICTION_SOURCES, CACHE_TAGS.CONTENTS] },
  )
}

export async function getFictionCharactersForContent(
  contentId: string,
  locale: string = 'ko',
): Promise<FictionSourceCharacter[]> {
  const assignments = await fetchAllAssignmentsCached()
  if (!assignments.some((assignment) => assignment.content_id === contentId)) {
    return []
  }

  // 작품 한 건에 등장하는 인물 — 그 작품 항목 태그를 단다
  return cachedDetail(
    CACHE_TAGS.CONTENTS,
    contentId,
    ['fiction-characters-by-content', contentId, locale],
    () => fetchCharactersByContent(contentId, locale, assignments),
    { extraTags: [CACHE_TAGS.FICTION_SOURCES, CACHE_TAGS.CELEBS] },
  )
}
