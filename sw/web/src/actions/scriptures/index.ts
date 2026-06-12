'use server'

import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/supabase/static'
import { CategoryId } from '@/constants/categories'
import { CELEB_PROFESSIONS } from '@/constants/celebProfessions'
import { getLocale } from 'next-intl/server'
import { CL_SELECT_LIST, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'
import { DIALOGUE_BRIEF_SELECT, type DialogueBrief } from '@/lib/utils/celeb-dialogues'
import type { Tables } from '@/types/supabase'

// #region Types
export interface ScriptureContent {
  id: string
  title: string
  creator: string | null
  thumbnail_url: string | null
  type: string
  celeb_count: number
  user_count: number
  avg_rating: number | null
  review?: string | null
  review_en?: string | null
  is_spoiler?: boolean
  source_url?: string | null
  user_content_id?: string
  title_ko?: string | null
  title_en?: string | null
  creator_en?: string | null
  isbn_en?: string | null
  thumbnail_en?: string | null
  has_en_edition?: boolean | null
}

export interface ScripturesResult {
  contents: ScriptureContent[]
  total: number
  totalPages: number
  currentPage: number
}

interface TopCeleb {
  id: string
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  title: string | null
  title_en: string | null
  influence: number | null
  count: number
}

export interface ScripturesByProfession {
  profession: string
  label: string
  contents: ScriptureContent[]
  total: number
  topCelebs: TopCeleb[]
}

interface CelebInfo {
  id: string
  nickname: string
  avatar_url: string | null
  profession: string | null
}

// contents(content_locales) 임베드 조회 행 — select 문자열과 1:1 대응
interface ContentJoinRow {
  id: string
  type: string
  content_locales: ContentLocaleRow[] | null
}

// user_contents → contents 조인 조회 행
interface UserContentJoinRow {
  user_id: string
  content_id: string
  rating: number | null
  contents: ContentJoinRow | ContentJoinRow[] | null
}

const PROFESSION_MAP = CELEB_PROFESSIONS.map(p => ({ key: p.value, label: p.label }))
// #endregion

// #region 헬퍼 함수 - 콘텐츠 집계 (페이지네이션 지원)
function aggregateContents(
  data: Array<{
    content_id: string
    rating: number | null
    contents: { id: string; title: string; creator: string | null; thumbnail_url: string | null; type: string; title_ko?: string | null; title_en?: string | null; creator_en?: string | null; isbn_en?: string | null; thumbnail_en?: string | null; has_en_edition?: boolean | null } | null
  }>,
  options: {
    category?: CategoryId
    page?: number
    limit?: number
    userCountMap?: Map<string, number>
  } = {}
): { contents: ScriptureContent[]; total: number } {
  const { category, page = 1, limit = 12, userCountMap } = options

  const contentMap = new Map<string, {
    content: ScriptureContent
    ratings: number[]
  }>()

  for (const item of data) {
    const content = item.contents
    if (!content) continue
    if (category && content.type !== category) continue

    const existing = contentMap.get(content.id)
    if (existing) {
      existing.content.celeb_count++
      if (item.rating) existing.ratings.push(Number(item.rating))
    } else {
      contentMap.set(content.id, {
        content: {
          id: content.id,
          title: content.title,
          creator: content.creator,
          thumbnail_url: content.thumbnail_url,
          type: content.type as CategoryId,
          celeb_count: 1,
          user_count: userCountMap?.get(content.id) ?? 0,
          avg_rating: null,
          title_ko: content.title_ko ?? null,
          title_en: content.title_en ?? null,
          creator_en: content.creator_en ?? null,
          isbn_en: content.isbn_en ?? null,
          thumbnail_en: content.thumbnail_en ?? null,
          has_en_edition: content.has_en_edition ?? null,
        },
        ratings: item.rating ? [Number(item.rating)] : []
      })
    }
  }

  const allContents = Array.from(contentMap.values())
    .map(({ content, ratings }) => ({
      ...content,
      avg_rating: ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : null
    }))
    .sort((a, b) => {
      if (b.celeb_count !== a.celeb_count) return b.celeb_count - a.celeb_count
      return a.title.localeCompare(b.title, 'ko')
    })

  const total = allContents.length
  const startIndex = (page - 1) * limit
  const paginatedContents = allContents.slice(startIndex, startIndex + limit)

  return { contents: paginatedContents, total }
}
// #endregion

// #region 헬퍼 함수 - 배열을 청크로 분할
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

type StaticSupabase = ReturnType<typeof createStaticClient>

// #region 헬퍼 함수 - 페이지네이션으로 모든 데이터 조회
async function fetchAllUserContents(
  supabase: StaticSupabase,
  celebIds: string[],
  category?: string
) {
  const PAGE_SIZE = 1000
  const BATCH_SIZE = 50
  const allData: Array<{
    user_id: string
    content_id: string
    rating: number | null
    contents: { id: string; title: string; creator: string | null; thumbnail_url: string | null; type: string; title_ko?: string | null; title_en?: string | null; creator_en?: string | null; isbn_en?: string | null; thumbnail_en?: string | null; has_en_edition?: boolean | null }
  }> = []

  if (!celebIds.length) return allData

  const idBatches = chunkArray(celebIds, BATCH_SIZE)

  for (const batchIds of idBatches) {
    let from = 0
    let hasMore = true

    while (hasMore) {
      let query = supabase
        .from('user_contents')
        .select(`
          user_id,
          content_id,
          rating,
          contents!inner(id, type, content_locales(${CL_SELECT_LIST}))
        `)
        .in('user_id', batchIds)
        .eq('status', 'FINISHED')
        .range(from, from + PAGE_SIZE - 1)

      if (category) {
        query = query.eq('contents.type', category)
      }

      const { data, error } = await query

      if (error) {
        console.error('fetchAllUserContents error:', error.message, error.code, error.details)
        break
      }

      const locale = await getLocale()
      const rows: UserContentJoinRow[] = data || []
      const typedData = rows.map(item => {
        const raw = Array.isArray(item.contents) ? item.contents[0] : item.contents
        const flat = flattenLocales(raw?.content_locales, locale)
        return {
          user_id: item.user_id,
          content_id: item.content_id,
          rating: item.rating,
          contents: {
            id: raw?.id as string,
            title: flat.title,
            creator: flat.creator,
            thumbnail_url: flat.thumbnail_url,
            type: raw?.type as string,
            title_ko: flat.title_ko,
            title_en: flat.title_en,
            creator_en: flat.creator_en,
            isbn_en: flat.isbn_en,
            thumbnail_en: flat.thumbnail_en,
            has_en_edition: flat.has_en_edition,
          },
        }
      })

      allData.push(...typedData)

      hasMore = data?.length === PAGE_SIZE
      from += PAGE_SIZE
    }
  }

  return allData
}

// 콘텐츠 ID별 셀럽(active CELEB, FINISHED) 카운트 — RPC로 카운트만 수신
async function fetchGlobalCelebCounts(
  supabase: StaticSupabase,
  contentIds: string[]
): Promise<Map<string, number>> {
  if (!contentIds.length) return new Map()

  const { data, error } = await supabase.rpc('get_celeb_content_counts', {
    p_content_ids: contentIds,
  })

  if (error) {
    console.error('fetchGlobalCelebCounts error:', error.message, error.code)
    return new Map()
  }

  const countMap = new Map<string, number>()
  for (const row of data ?? []) {
    countMap.set(row.content_id, Number(row.celeb_count))
  }

  return countMap
}

// 콘텐츠 ID별 일반 유저(USER, FINISHED) 카운트 — RPC로 카운트만 수신
async function fetchUserContentCounts(
  supabase: StaticSupabase,
  category?: string
): Promise<Map<string, number>> {
  const countMap = new Map<string, number>()

  const { data, error } = await supabase.rpc('get_user_content_counts', {
    p_category: category ?? undefined,
  })

  if (error) {
    console.error('fetchUserContentCounts error:', error.message, error.code)
    return countMap
  }

  for (const row of data ?? []) {
    countMap.set(row.content_id, Number(row.user_count))
  }

  return countMap
}
// #endregion

// #region 인물들의 선택 - 셀럽이 가장 많이 본 콘텐츠
async function fetchChosenScriptures(
  category: string | null,
  page: number,
  limit: number,
  locale: string,
): Promise<ScripturesResult> {
  const supabase = createStaticClient()
  const offset = (page - 1) * limit

  const { data, error } = await supabase.rpc('get_chosen_scriptures', {
    p_category: category,
    p_limit: limit,
    p_offset: offset,
  })

  if (error || !data?.length) {
    if (error) console.error('getChosenScriptures error:', error)
    return { contents: [], total: 0, totalPages: 0, currentPage: page }
  }

  const total = Number((data as Record<string, unknown>[])[0]?.total_count ?? 0)
  const contents: ScriptureContent[] = (data as Record<string, unknown>[]).map(row => {
    const titleKo = (row.title_ko as string) ?? null
    const titleEn = (row.title_en as string) ?? null
    const creatorKo = (row.creator as string) ?? null
    const creatorEn = (row.creator_en as string) ?? null
    const thumbKo = (row.thumbnail_url as string) ?? null
    const thumbEn = (row.thumbnail_en as string) ?? null
    return {
      id: row.content_id as string,
      title: (locale === 'en' ? titleEn || titleKo : titleKo || titleEn) || '',
      creator: (locale === 'en' ? creatorEn || creatorKo : creatorKo || creatorEn) ?? null,
      thumbnail_url: (locale === 'en' ? thumbEn || thumbKo : thumbKo || thumbEn) ?? null,
      type: row.content_type as string,
      celeb_count: Number(row.celeb_count),
      user_count: Number(row.user_count),
      avg_rating: row.avg_rating ? Number(row.avg_rating) : null,
      title_ko: titleKo,
      title_en: titleEn,
      creator_en: creatorEn,
      isbn_en: (row.isbn_en as string) ?? null,
      thumbnail_en: thumbEn,
      has_en_edition: (row.has_en_edition as boolean) ?? null,
    }
  })

  return {
    contents,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  }
}

const getChosenScripturesCached = unstable_cache(
  fetchChosenScriptures,
  ['chosen-scriptures'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getChosenScriptures(params?: {
  category?: string
  page?: number
  limit?: number
}): Promise<ScripturesResult> {
  const locale = await getLocale()
  return getChosenScripturesCached(
    params?.category || null,
    params?.page || 1,
    params?.limit || 12,
    locale,
  )
}

export async function getQuickRecordSuggestions(category: string = 'BOOK'): Promise<ScriptureContent[]> {
  const result = await getChosenScriptures({ category, limit: 30 })
  const suggestions = result.contents.filter(item => !item.title.includes('성경'))
  return suggestions.slice(0, 10)
}
// #endregion

// #region 길의 갈래 - 직업별 인기 콘텐츠
// profiles + celeb_influence(total_score) 임베드 조회 행
type TopCelebRow = Pick<
  Tables<'profiles'>,
  'id' | 'nickname' | 'nickname_en' | 'avatar_url' | 'title' | 'title_en'
> & {
  celeb_influence: { total_score: number | null } | { total_score: number | null }[] | null
}

async function fetchScripturesByProfession(
  profession: string,
  page: number,
  limit: number,
  locale: string,
): Promise<ScripturesByProfession | null> {
  const supabase = createStaticClient()

  const { data: celebProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .eq('profession', profession)

  if (profileError || !celebProfiles?.length) return null

  const celebIds = celebProfiles.map(p => p.id)

  const [typedData, { data: topCelebsData }] = await Promise.all([
    fetchAllUserContents(supabase, celebIds),
    supabase
      .from('profiles')
      .select('id, nickname, nickname_en, avatar_url, title, title_en, celeb_influence(total_score)')
      .in('id', celebIds)
      .not('celeb_influence', 'is', null)
      .order('celeb_influence(total_score)', { ascending: false })
      .limit(5),
  ])

  const topCelebRows: TopCelebRow[] = topCelebsData || []
  const topCelebs: TopCeleb[] = topCelebRows.map(c => {
    const influence = Array.isArray(c.celeb_influence) ? c.celeb_influence[0] : c.celeb_influence
    const contentCount = typedData.filter(item => item.user_id === c.id).length
    const nicknameEn = c.nickname_en ?? null
    const titleEn = c.title_en ?? null
    return {
      id: c.id,
      nickname: (locale === 'en' ? nicknameEn || c.nickname : c.nickname) || '',
      nickname_en: nicknameEn,
      avatar_url: c.avatar_url,
      title: (locale === 'en' ? titleEn || c.title : c.title) ?? null,
      title_en: titleEn,
      influence: influence?.total_score ?? null,
      count: contentCount
    }
  })

  const userCountMap = await fetchUserContentCounts(supabase)

  const { contents, total } = aggregateContents(typedData, { page, limit, userCountMap })

  const globalCounts = await fetchGlobalCelebCounts(supabase, contents.map(c => c.id))
  for (const content of contents) {
    content.celeb_count = globalCounts.get(content.id) ?? content.celeb_count
  }

  const professionInfo = PROFESSION_MAP.find(p => p.key === profession)

  return {
    profession,
    label: professionInfo?.label || profession,
    contents,
    total,
    topCelebs
  }
}

const getScripturesByProfessionCached = unstable_cache(
  fetchScripturesByProfession,
  ['scriptures-by-profession'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getScripturesByProfession(params?: {
  profession?: string
  page?: number
  limit?: number
}): Promise<ScripturesByProfession | null> {
  const locale = await getLocale()
  return getScripturesByProfessionCached(
    params?.profession || 'entrepreneur',
    params?.page || 1,
    params?.limit || 12,
    locale,
  )
}

async function fetchProfessionContentCounts(): Promise<Array<{ profession: string; label: string; count: number }>> {
  const supabase = createStaticClient()

  const results = await Promise.all(
    PROFESSION_MAP.map(async ({ key, label }) => {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('profile_type', 'CELEB')
        .eq('status', 'active')
        .eq('profession', key)

      return count && count > 0 ? { profession: key, label, count } : null
    })
  )

  return results
    .filter((r): r is NonNullable<typeof r> => r !== null)
    .sort((a, b) => b.count - a.count)
}

export const getProfessionContentCounts = unstable_cache(
  fetchProfessionContentCounts,
  ['profession-content-counts'],
  { revalidate: 3600, tags: ['celebs'] }
)
// #endregion

// #region 오늘의 인물 - 매일 랜덤 셀럽 1명의 콘텐츠
export interface TodayFigure {
  id: string
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  profession: string | null
  bio: string | null
  bio_en: string | null
  contentCount: number
  greetingLines: string[]
  quote: string | null
  speechTone: string
  voiceV: number
}

export interface TodayFigureSource {
  type: 'news' | 'seed' | 'birthday'
  newsCount: number
}

export interface TodayFigureResult {
  figure: TodayFigure | null
  contents: ScriptureContent[]
  source: TodayFigureSource
}

async function fetchTodayFigure(today: string, locale: string): Promise<TodayFigureResult> {
  const supabase = createStaticClient()

  const { data: dailyFigure } = await supabase
    .from('daily_figures')
    .select('celeb_id, source, news_count')
    .eq('date', today)
    .single()

  if (dailyFigure) {
    const result = await fetchFigureContents(supabase, dailyFigure.celeb_id, locale)
    return {
      ...result,
      source: {
        type: dailyFigure.source as 'news' | 'seed' | 'birthday',
        newsCount: dailyFigure.news_count || 0,
      },
    }
  }

  const seedSource: TodayFigureSource = { type: 'seed', newsCount: 0 }

  // 공개 감상 5개 이상 보유한 활성 셀럽만 RPC로 카운트 수신
  const { data: eligibleData, error: eligibleError } = await supabase.rpc('get_seed_eligible_celebs')

  if (eligibleError || !eligibleData?.length) {
    if (eligibleError) console.error('getTodayFigure seed error:', eligibleError.message)
    return { figure: null, contents: [], source: seedSource }
  }

  // 시드 선택이 캐시 재생성 간에도 흔들리지 않도록 id 순으로 고정
  const eligibleCelebs = [...eligibleData].sort((a, b) => a.celeb_id.localeCompare(b.celeb_id))

  const seed = today.split('-').reduce((acc, n) => acc + parseInt(n), 0) + 1
  const selectedIndex = seed % eligibleCelebs.length
  const selected = eligibleCelebs[selectedIndex]

  const result = await fetchFigureContents(supabase, selected.celeb_id, locale)
  return { ...result, source: seedSource }
}

const getTodayFigureCached = unstable_cache(
  fetchTodayFigure,
  ['today-figure'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getTodayFigure(): Promise<TodayFigureResult> {
  const locale = await getLocale()
  const today = new Date().toISOString().slice(0, 10)
  return getTodayFigureCached(today, locale)
}

// 오늘의 인물 profiles 조회 행
type FigureProfileRow = Pick<
  Tables<'profiles'>,
  'id' | 'nickname' | 'nickname_en' | 'avatar_url' | 'profession' | 'bio' | 'bio_en' | 'speech_tone' | 'voice_v'
>

// 오늘의 인물 user_contents 조회 행
interface FigureUserContentRow {
  id: string
  content_id: string
  rating: number | null
  review: string | null
  review_en: string | null
  is_spoiler: boolean | null
  source_url: string | null
  contents: ContentJoinRow | ContentJoinRow[] | null
}

async function fetchFigureContents(
  supabase: StaticSupabase,
  celebId: string,
  locale: string,
): Promise<TodayFigureResult> {
  const defaultSource: TodayFigureSource = { type: 'seed', newsCount: 0 }

  const [{ data: profile }, { data: userContents }, { data: dialogue }, userCountMap] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nickname, nickname_en, avatar_url, profession, bio, bio_en, speech_tone, voice_v')
      .eq('id', celebId)
      .single(),
    supabase
      .from('user_contents')
      .select(`id, content_id, rating, review, review_en, is_spoiler, source_url, contents(id, type, content_locales(${CL_SELECT_LIST}))`)
      .eq('user_id', celebId)
      .eq('status', 'FINISHED')
      .eq('visibility', 'public'),
    supabase
      .from('celeb_dialogues')
      .select(DIALOGUE_BRIEF_SELECT)
      .eq('celeb_id', celebId)
      .single()
      .overrideTypes<DialogueBrief, { merge: false }>(),
    fetchUserContentCounts(supabase),
  ])

  if (!profile) {
    return { figure: null, contents: [], source: defaultSource }
  }

  const profileRow: FigureProfileRow = profile
  const ucRows: FigureUserContentRow[] = userContents || []

  const contents: ScriptureContent[] = ucRows.map(item => {
    const content = Array.isArray(item.contents) ? item.contents[0] : item.contents
    const flat = flattenLocales(content?.content_locales, locale)
    return {
      id: content?.id || '',
      title: flat.title,
      creator: flat.creator,
      thumbnail_url: flat.thumbnail_url,
      type: (content?.type as CategoryId) || 'BOOK',
      celeb_count: 1,
      user_count: userCountMap.get(content?.id || '') ?? 0,
      avg_rating: item.rating ? Number(item.rating) : null,
      review: item.review,
      review_en: item.review_en ?? null,
      is_spoiler: item.is_spoiler as boolean,
      source_url: item.source_url,
      user_content_id: item.id,
      title_ko: flat.title_ko,
      title_en: flat.title_en,
      creator_en: flat.creator_en,
      isbn_en: flat.isbn_en,
      thumbnail_en: flat.thumbnail_en,
      has_en_edition: flat.has_en_edition,
    }
  }).filter(c => c.id)

  const nicknameEn = profileRow.nickname_en ?? null
  const bioEn = profileRow.bio_en ?? null

  const d: DialogueBrief | null = dialogue
  const useEn = locale === 'en'
  const greetingLines: string[] = (useEn ? d?.greeting_en : d?.greeting) ?? d?.greeting ?? []
  const quote: string | null = (useEn ? d?.quote_en : d?.quote) ?? d?.quote ?? null

  return {
    figure: {
      id: profileRow.id,
      nickname: (locale === 'en' ? nicknameEn || profileRow.nickname : profileRow.nickname) || '',
      nickname_en: nicknameEn,
      avatar_url: profileRow.avatar_url,
      profession: profileRow.profession,
      bio: (locale === 'en' ? bioEn || profileRow.bio : profileRow.bio) ?? null,
      bio_en: bioEn,
      contentCount: contents.length,
      greetingLines,
      quote,
      speechTone: profileRow.speech_tone ?? 'composed',
      voiceV: profileRow.voice_v ?? 0,
    },
    contents,
    source: defaultSource
  }
}
// #endregion

// #region 시대의 작품 - 시대별 인기 콘텐츠
type Era = 'ancient' | 'medieval' | 'modern' | 'contemporary'

const ERA_CONFIG: Record<Era, { label: string; period: string; min: number; max: number; description: string }> = {
  ancient: {
    label: '고대',
    period: '~500년',
    min: -9999,
    max: 500,
    description: '철학과 사상의 씨앗이 뿌려진 시대입니다. 소크라테스, 공자, 붓다가 던진 근본적인 질문들이 오늘날까지 인류를 이끌고 있습니다.'
  },
  medieval: {
    label: '중세',
    period: '500~1500년',
    min: 500,
    max: 1500,
    description: '신앙과 기사도가 꽃피운 시대입니다. 어둠 속에서도 지혜의 불씨를 꺼뜨리지 않은 수도원과 학자들의 헌신이 오늘의 문명을 만들었습니다.'
  },
  modern: {
    label: '근대',
    period: '1500~1900년',
    min: 1500,
    max: 1900,
    description: '이성의 빛이 세상을 깨운 시대입니다. 르네상스, 계몽주의, 산업혁명을 통해 인류는 전례 없는 변화를 경험했습니다.'
  },
  contemporary: {
    label: '현대',
    period: '1900년~',
    min: 1900,
    max: 9999,
    description: '격변과 혁신의 세기입니다. 지금 우리의 생각과 삶의 방식을 형성한 거인들이 이 시대를 살아갔습니다.'
  },
}

interface EraCeleb {
  id: string
  nickname: string
  avatar_url: string | null
  title: string | null
  influence: number | null
  count: number
}

export interface EraScriptures {
  era: Era
  label: string
  period: string
  description: string
  contents: ScriptureContent[]
  celebCount: number
  contentCount: number
  topCelebs: EraCeleb[]
}

async function fetchScripturesByEra(locale: string): Promise<EraScriptures[]> {
  const supabase = createStaticClient()

  const { data, error } = await supabase.rpc('get_scriptures_by_era', {
    p_era: null,
    p_category: null,
    p_limit: 6,
    p_offset: 0,
  })

  if (error || !data?.length) {
    if (error) console.error('getScripturesByEra error:', error)
    return []
  }

  const eraMap = new Map<string, EraScriptures>()
  const rows = data as Record<string, unknown>[]

  for (const row of rows) {
    const era = row.era as Era
    if (!eraMap.has(era)) {
      eraMap.set(era, {
        era,
        label: row.era_label as string,
        period: row.era_period as string,
        description: row.era_description as string,
        contents: [],
        celebCount: Number(row.celeb_count_in_era),
        contentCount: Number(row.total_count ?? 0),
        topCelebs: [],
      })
    }
    const titleKo = (row.title_ko as string) ?? null
    const titleEn = (row.title_en as string) ?? null
    const creatorKo = (row.creator as string) ?? null
    const creatorEn = (row.creator_en as string) ?? null
    const thumbKo = (row.thumbnail_url as string) ?? null
    const thumbEn = (row.thumbnail_en as string) ?? null
    eraMap.get(era)!.contents.push({
      id: row.content_id as string,
      title: (locale === 'en' ? titleEn || titleKo : titleKo || titleEn) || '',
      creator: (locale === 'en' ? creatorEn || creatorKo : creatorKo || creatorEn) ?? null,
      thumbnail_url: (locale === 'en' ? thumbEn || thumbKo : thumbKo || thumbEn) ?? null,
      type: row.content_type as string,
      celeb_count: Number(row.celeb_count),
      user_count: Number(row.user_count),
      avg_rating: row.avg_rating ? Number(row.avg_rating) : null,
      title_ko: (row.title_ko as string) ?? null,
      title_en: (row.title_en as string) ?? null,
      creator_en: (row.creator_en as string) ?? null,
      isbn_en: (row.isbn_en as string) ?? null,
      thumbnail_en: (row.thumbnail_en as string) ?? null,
      has_en_edition: (row.has_en_edition as boolean) ?? null,
    })
  }

  const eras: Era[] = ['ancient', 'medieval', 'modern', 'contemporary']
  return eras.map(era => eraMap.get(era) ?? {
    era,
    label: ERA_CONFIG[era].label,
    period: ERA_CONFIG[era].period,
    description: ERA_CONFIG[era].description,
    contents: [],
    celebCount: 0,
    contentCount: 0,
    topCelebs: [],
  })
}

const getScripturesByEraCached = unstable_cache(
  fetchScripturesByEra,
  ['scriptures-by-era'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getScripturesByEra(): Promise<EraScriptures[]> {
  const locale = await getLocale()
  return getScripturesByEraCached(locale)
}

async function fetchEraContents(
  era: string,
  category: string | null,
  page: number,
  limit: number,
  locale: string,
): Promise<ScripturesResult> {
  const eraKey = era as Era
  if (!ERA_CONFIG[eraKey]) {
    return { contents: [], total: 0, totalPages: 0, currentPage: page }
  }

  const supabase = createStaticClient()
  const offset = (page - 1) * limit
  const { data, error } = await supabase.rpc('get_scriptures_by_era', {
    p_era: eraKey,
    p_category: category,
    p_limit: limit,
    p_offset: offset,
  })

  if (error || !data?.length) {
    if (error) console.error('getEraContents error:', error)
    return { contents: [], total: 0, totalPages: 0, currentPage: page }
  }

  const rows = data as Record<string, unknown>[]
  const total = Number(rows[0]?.total_count ?? 0)
  const contents: ScriptureContent[] = rows.map(row => {
    const titleKo = (row.title_ko as string) ?? null
    const titleEn = (row.title_en as string) ?? null
    const creatorKo = (row.creator as string) ?? null
    const creatorEn = (row.creator_en as string) ?? null
    const thumbKo = (row.thumbnail_url as string) ?? null
    const thumbEn = (row.thumbnail_en as string) ?? null
    return {
      id: row.content_id as string,
      title: (locale === 'en' ? titleEn || titleKo : titleKo || titleEn) || '',
      creator: (locale === 'en' ? creatorEn || creatorKo : creatorKo || creatorEn) ?? null,
      thumbnail_url: (locale === 'en' ? thumbEn || thumbKo : thumbKo || thumbEn) ?? null,
      type: row.content_type as string,
      celeb_count: Number(row.celeb_count),
      user_count: Number(row.user_count),
      avg_rating: row.avg_rating ? Number(row.avg_rating) : null,
      title_ko: titleKo,
      title_en: titleEn,
      creator_en: creatorEn,
      isbn_en: (row.isbn_en as string) ?? null,
      thumbnail_en: thumbEn,
      has_en_edition: (row.has_en_edition as boolean) ?? null,
    }
  })

  return {
    contents,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  }
}

const getEraContentsCached = unstable_cache(
  fetchEraContents,
  ['era-contents'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getEraContents(params: {
  era: string
  category?: string
  page?: number
  limit?: number
}): Promise<ScripturesResult> {
  const locale = await getLocale()
  return getEraContentsCached(
    params.era,
    params.category || null,
    params.page || 1,
    params.limit || 12,
    locale,
  )
}
// #endregion

// #region 콘텐츠를 감상한 셀럽 목록
async function fetchCelebsForContent(contentId: string): Promise<CelebInfo[]> {
  const supabase = createStaticClient()

  const { data: userContents, error: ucError } = await supabase
    .from('user_contents')
    .select('user_id')
    .eq('content_id', contentId)
    .eq('status', 'FINISHED')

  if (ucError || !userContents?.length) return []

  const userIds = userContents.map(uc => uc.user_id)

  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url, profession')
    .in('id', userIds)
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')

  if (profileError) {
    console.error('getCelebsForContent error:', profileError)
    return []
  }

  return (profiles || []).map(p => ({
    id: p.id,
    nickname: p.nickname,
    avatar_url: p.avatar_url,
    profession: p.profession
  }))
}

export const getCelebsForContent = unstable_cache(
  fetchCelebsForContent,
  ['celebs-for-content'],
  { revalidate: 3600, tags: ['celebs'] }
)
// #endregion

// #region 전 시대 통합 - 최고 영향력 셀럽 Top 3 (감상 기록 5개 이상)
async function fetchTopCelebsAcrossAllEras(locale: string): Promise<TopCeleb[]> {
  const supabase = createStaticClient()

  const { data, error } = await supabase.rpc('get_top_celebs_across_eras', {
    p_limit: 3,
  })

  if (error || !data?.length) {
    if (error) console.error('getTopCelebsAcrossAllEras error:', error)
    return []
  }

  return (data as Record<string, unknown>[]).map(row => {
    const nicknameKo = row.nickname as string
    const nicknameEn = (row.nickname_en as string) ?? null
    const titleKo = (row.title as string) ?? null
    const titleEn = (row.title_en as string) ?? null
    return {
      id: row.id as string,
      nickname: (locale === 'en' ? nicknameEn || nicknameKo : nicknameKo) || '',
      nickname_en: nicknameEn,
      avatar_url: (row.avatar_url as string) ?? null,
      title: (locale === 'en' ? titleEn || titleKo : titleKo) ?? null,
      title_en: titleEn,
      influence: row.influence ? Number(row.influence) : null,
      count: Number(row.content_count),
    }
  })
}

const getTopCelebsAcrossAllErasCached = unstable_cache(
  fetchTopCelebsAcrossAllEras,
  ['top-celebs-across-eras'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getTopCelebsAcrossAllEras(): Promise<TopCeleb[]> {
  const locale = await getLocale()
  return getTopCelebsAcrossAllErasCached(locale)
}
// #endregion

// #region 허브 콘텐츠 샘플 - 셀럽별/직업별 대표 콘텐츠 (미리보기용)
export interface HubContentSample {
  id: string
  title: string
  thumbnail_url: string | null
  type: string
  creator: string | null
}

async function fetchContentSamplesForCelebs(
  celebIdsKey: string,
  perCeleb: number,
  locale: string,
): Promise<Record<string, HubContentSample[]>> {
  const celebIds = celebIdsKey ? celebIdsKey.split(',') : []
  if (!celebIds.length) return {}

  const supabase = createStaticClient()

  // contents는 to-one 조인이라 객체로 반환 — 파서가 배열로 추론하므로 overrideTypes로 교정
  const { data, error } = await supabase
    .from('user_contents')
    .select(`user_id, contents!inner(id, type, content_locales(${CL_SELECT_LIST}))`)
    .in('user_id', celebIds)
    .eq('visibility', 'public')
    .eq('status', 'FINISHED')
    .overrideTypes<Array<{ user_id: string; contents: ContentJoinRow }>, { merge: false }>()

  if (error || !data?.length) return {}

  const result: Record<string, HubContentSample[]> = {}
  const seen: Record<string, Set<string>> = {}

  for (const row of data) {
    const celebId = row.user_id
    const content = row.contents
    const flat = flattenLocales(content.content_locales, locale)
    if (!flat.thumbnail_url) continue

    if (!seen[celebId]) seen[celebId] = new Set()
    if (seen[celebId].has(content.id)) continue
    seen[celebId].add(content.id)

    if (!result[celebId]) result[celebId] = []
    if (result[celebId].length >= perCeleb) continue

    result[celebId].push({
      id: content.id,
      title: flat.title,
      thumbnail_url: flat.thumbnail_url,
      type: content.type,
      creator: flat.creator,
    })
  }

  return result
}

const getContentSamplesForCelebsCached = unstable_cache(
  fetchContentSamplesForCelebs,
  ['content-samples-for-celebs'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getContentSamplesForCelebs(celebIds: string[], perCeleb = 2): Promise<Record<string, HubContentSample[]>> {
  if (!celebIds.length) return {}
  const locale = await getLocale()
  // 정렬한 join을 키로 — 같은 조합이면 캐시 히트
  const key = [...celebIds].sort().join(',')
  return getContentSamplesForCelebsCached(key, perCeleb, locale)
}

// get_profession_content_samples RPC 결과 행
interface ProfessionSampleRow {
  profession: string
  content_id: string
  content_type: string
  title: string | null
  title_ko: string | null
  title_en: string | null
  creator: string | null
  creator_en: string | null
  thumbnail_url: string | null
  thumbnail_en: string | null
}

async function fetchContentSamplesByProfession(
  perProfession: number,
  locale: string,
): Promise<Record<string, HubContentSample[]>> {
  const supabase = createStaticClient()

  const { data, error } = await supabase.rpc('get_profession_content_samples', { per_profession: perProfession })
  if (error || !data?.length) return {}

  const result: Record<string, HubContentSample[]> = {}
  const rows: ProfessionSampleRow[] = data
  for (const row of rows) {
    const profession = row.profession
    if (!result[profession]) result[profession] = []
    const titleKo = row.title_ko ?? row.title ?? null
    const titleEn = row.title_en ?? null
    const creatorKo = row.creator ?? null
    const creatorEn = row.creator_en ?? null
    const thumbKo = row.thumbnail_url ?? null
    const thumbEn = row.thumbnail_en ?? null
    result[profession].push({
      id: row.content_id,
      title: (locale === 'en' ? titleEn || titleKo : titleKo || titleEn) || '',
      thumbnail_url: (locale === 'en' ? thumbEn || thumbKo : thumbKo || thumbEn) ?? null,
      type: row.content_type,
      creator: (locale === 'en' ? creatorEn || creatorKo : creatorKo || creatorEn) ?? null,
    })
  }
  return result
}

const getContentSamplesByProfessionCached = unstable_cache(
  fetchContentSamplesByProfession,
  ['content-samples-by-profession'],
  { revalidate: 3600, tags: ['celebs'] }
)

export async function getContentSamplesByProfession(_professions: string[], perProfession = 3): Promise<Record<string, HubContentSample[]>> {
  const locale = await getLocale()
  return getContentSamplesByProfessionCached(perProfession, locale)
}
// #endregion
