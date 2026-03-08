'use server'

import { createClient } from '@/lib/supabase/server'
import { CategoryId } from '@/constants/categories'
import { CELEB_PROFESSIONS } from '@/constants/celebProfessions'
import { CL_SELECT, flattenLocales, type ContentLocaleRow } from '@/lib/utils/content-locale'

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

// 직업 매핑 (공유 패키지에서 변환)
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

// #region 헬퍼 함수 - 페이지네이션으로 모든 데이터 조회
async function fetchAllUserContents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  celebIds: string[],
  category?: string
) {
  const PAGE_SIZE = 1000
  const BATCH_SIZE = 50 // URL 길이 제한으로 인해 ID를 배치로 분할
  const allData: Array<{
    user_id: string
    content_id: string
    rating: number | null
    contents: { id: string; title: string; creator: string | null; thumbnail_url: string | null; type: string; title_ko?: string | null; title_en?: string | null; creator_en?: string | null; isbn_en?: string | null; thumbnail_en?: string | null; has_en_edition?: boolean | null }
  }> = []

  // 빈 배열이면 빈 결과 반환 (Supabase .in()은 빈 배열에서 에러 발생)
  if (!celebIds.length) return allData

  // ID를 배치로 분할하여 쿼리
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
          contents!inner(id, type, content_locales(${CL_SELECT}))
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

      const typedData = (data || []).map(item => {
        const raw = Array.isArray(item.contents) ? item.contents[0] : item.contents
        const flat = flattenLocales((raw as any)?.content_locales as ContentLocaleRow[] | null)
        return {
          user_id: item.user_id,
          content_id: item.content_id,
          rating: item.rating,
          contents: {
            id: (raw as any)?.id as string,
            title: flat.title,
            creator: flat.creator,
            thumbnail_url: flat.thumbnail_url,
            type: (raw as any)?.type as string,
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

// content_id별 전체 셀럽 카운트 조회 (직업/시대 스코프 무관)
async function fetchGlobalCelebCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contentIds: string[]
): Promise<Map<string, number>> {
  if (!contentIds.length) return new Map()

  // 해당 콘텐츠의 user_contents 조회
  const { data: ucData } = await supabase
    .from('user_contents')
    .select('content_id, user_id')
    .in('content_id', contentIds)
    .eq('status', 'FINISHED')

  if (!ucData?.length) return new Map()

  // 고유 user_id에서 CELEB만 필터
  const uniqueUserIds = [...new Set(ucData.map(r => r.user_id))]
  const celebIdSet = new Set<string>()

  for (const batch of chunkArray(uniqueUserIds, 50)) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .in('id', batch)
      .eq('profile_type', 'CELEB')
      .eq('status', 'active')

    if (profiles) profiles.forEach(p => celebIdSet.add(p.id))
  }

  // content_id별 셀럽 수 집계
  const countMap = new Map<string, number>()
  for (const item of ucData) {
    if (!celebIdSet.has(item.user_id)) continue
    countMap.set(item.content_id, (countMap.get(item.content_id) || 0) + 1)
  }

  return countMap
}

// 일반 사용자(USER)의 content_id별 카운트 조회
async function fetchUserContentCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  category?: string
): Promise<Map<string, number>> {
  const PAGE_SIZE = 1000
  const BATCH_SIZE = 50
  const countMap = new Map<string, number>()

  // USER 프로필 ID 목록 조회
  const { data: userProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('profile_type', 'USER')

  if (profileError) {
    console.error('fetchUserContentCounts profile error:', profileError.message)
    return countMap
  }

  if (!userProfiles?.length) return countMap

  const userIds = userProfiles.map(p => p.id)
  const idBatches = chunkArray(userIds, BATCH_SIZE)

  for (const batchIds of idBatches) {
    let from = 0
    let hasMore = true

    while (hasMore) {
      let query = supabase
        .from('user_contents')
        .select('content_id, contents!inner(type)')
        .in('user_id', batchIds)
        .eq('status', 'FINISHED')
        .range(from, from + PAGE_SIZE - 1)

      if (category) {
        query = query.eq('contents.type', category)
      }

      const { data, error } = await query

      if (error) {
        console.error('fetchUserContentCounts error:', error.message, error.code)
        break
      }
      if (!data?.length) break

      for (const item of data) {
        const count = countMap.get(item.content_id) || 0
        countMap.set(item.content_id, count + 1)
      }

      hasMore = data.length === PAGE_SIZE
      from += PAGE_SIZE
    }
  }

  return countMap
}
// #endregion

// #region 인물들의 선택 - 셀럽이 가장 많이 본 콘텐츠
export async function getChosenScriptures(params?: {
  category?: string
  page?: number
  limit?: number
}): Promise<ScripturesResult> {
  const supabase = await createClient()
  const page = params?.page || 1
  const limit = params?.limit || 12
  const offset = (page - 1) * limit

  const { data, error } = await supabase.rpc('get_chosen_scriptures', {
    p_category: params?.category || null,
    p_limit: limit,
    p_offset: offset,
  })

  if (error || !data?.length) {
    if (error) console.error('getChosenScriptures error:', error)
    return { contents: [], total: 0, totalPages: 0, currentPage: page }
  }

  const total = Number((data as Record<string, unknown>[])[0]?.total_count ?? 0)
  const contents: ScriptureContent[] = (data as Record<string, unknown>[]).map(row => ({
    id: row.content_id as string,
    title: row.title as string,
    creator: (row.creator as string) ?? null,
    thumbnail_url: (row.thumbnail_url as string) ?? null,
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
  }))

  return {
    contents,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  }
}

// 빠른 기록용 추천 목록 (성경 제외)
export async function getQuickRecordSuggestions(category: string = 'BOOK'): Promise<ScriptureContent[]> {
  // 1. 넉넉하게 가져와서 필터링 (성경 제외)
  const result = await getChosenScriptures({ category, limit: 30 })
  
  // 2. "성경" 키워드 제외 필터링
  const suggestions = result.contents.filter(item => !item.title.includes('성경'))

  // 3. 상위 10개만 반환
  return suggestions.slice(0, 10)
}
// #endregion

// #region 길의 갈래 - 직업별 인기 콘텐츠
export async function getScripturesByProfession(params?: {
  profession?: string
  page?: number
  limit?: number
}): Promise<ScripturesByProfession | null> {
  const supabase = await createClient()
  const page = params?.page || 1
  const limit = params?.limit || 12
  const profession = params?.profession || 'entrepreneur'

  // 해당 직업의 CELEB 프로필 ID 조회
  const { data: celebProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .eq('profession', profession)

  if (profileError || !celebProfiles?.length) return null

  const celebIds = celebProfiles.map(p => p.id)

  // 콘텐츠 + top5 셀럽 병렬 조회 (둘 다 celebIds만 필요)
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

  const topCelebs: TopCeleb[] = (topCelebsData || []).map(c => {
    const influence = Array.isArray(c.celeb_influence) ? c.celeb_influence[0] : c.celeb_influence
    // user_contents 카운트 계산
    const contentCount = typedData.filter(item => item.user_id === c.id).length
    
    return {
      id: c.id,
      nickname: c.nickname,
      nickname_en: (c as any).nickname_en ?? null,
      avatar_url: c.avatar_url,
      title: c.title,
      title_en: (c as any).title_en ?? null,
      influence: influence?.total_score ?? null,
      count: contentCount
    }
  })

  // 일반 사용자(USER) 콘텐츠 카운트 조회
  const userCountMap = await fetchUserContentCounts(supabase)

  const { contents, total } = aggregateContents(typedData, { page, limit, userCountMap })

  // 뱃지에는 전체 셀럽 카운트 표시 (직업 스코프 무관)
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

// 직업별 셀럽 인원 수 조회 (탭 표시용)
export async function getProfessionContentCounts(): Promise<Array<{ profession: string; label: string; count: number }>> {
  const supabase = await createClient()

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
}

export interface TodayFigureSource {
  type: 'news' | 'seed'
  newsCount: number
}

export interface TodayFigureResult {
  figure: TodayFigure | null
  contents: ScriptureContent[]
  source: TodayFigureSource
}

export async function getTodayFigure(): Promise<TodayFigureResult> {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  // 0. daily_figures에서 오늘 데이터 확인 (Cron이 저장한 뉴스 기반 인물)
  const { data: dailyFigure } = await supabase
    .from('daily_figures')
    .select('celeb_id, source, news_count')
    .eq('date', today)
    .single()

  if (dailyFigure) {
    const result = await fetchFigureContents(supabase, dailyFigure.celeb_id)
    return {
      ...result,
      source: {
        type: dailyFigure.source as 'news' | 'seed',
        newsCount: dailyFigure.news_count || 0,
      },
    }
  }

  const seedSource: TodayFigureSource = { type: 'seed', newsCount: 0 }

  // Fallback: 기존 seed 알고리즘
  // 1. 셀럽 프로필 ID 목록 조회
  const { data: celebProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')

  if (profileError || !celebProfiles?.length) {
    return { figure: null, contents: [], source: seedSource }
  }

  const celebIds = celebProfiles.map(p => p.id)

  // 2. 해당 셀럽들의 콘텐츠 개수 집계 (배치 + 페이지네이션)
  const PAGE_SIZE = 1000
  const BATCH_SIZE = 50
  const celebCountsData: { user_id: string }[] = []
  const idBatches = chunkArray(celebIds, BATCH_SIZE)

  for (const batchIds of idBatches) {
    let from = 0
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from('user_contents')
        .select('user_id')
        .in('user_id', batchIds)
        .eq('status', 'FINISHED')
        .eq('visibility', 'public')
        .range(from, from + PAGE_SIZE - 1)

      if (error || !data?.length) break
      celebCountsData.push(...data)
      hasMore = data.length === PAGE_SIZE
      from += PAGE_SIZE
    }
  }

  if (!celebCountsData.length) {
    return { figure: null, contents: [], source: seedSource }
  }

  // 셀럽별 콘텐츠 개수 집계
  const countMap = new Map<string, number>()
  for (const item of celebCountsData) {
    const count = countMap.get(item.user_id) || 0
    countMap.set(item.user_id, count + 1)
  }

  // 5개 이상인 셀럽만 필터
  const eligibleCelebs = Array.from(countMap.entries())
    .filter(([, count]) => count >= 5)
    .map(([id, count]) => ({ id, count }))

  if (!eligibleCelebs.length) {
    return { figure: null, contents: [], source: seedSource }
  }

  // seed 기반 결정적 랜덤 선택
  const seed = today.split('-').reduce((acc, n) => acc + parseInt(n), 0) + 1
  const selectedIndex = seed % eligibleCelebs.length
  const selected = eligibleCelebs[selectedIndex]

  const result = await fetchFigureContents(supabase, selected.id)
  return { ...result, source: seedSource }
}

/** 셀럽 ID로 프로필 + 콘텐츠 조회 (공통 로직) */
async function fetchFigureContents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  celebId: string
): Promise<TodayFigureResult> {
  const defaultSource: TodayFigureSource = { type: 'seed', newsCount: 0 }

  // 프로필 + 콘텐츠 + 유저 카운트 병렬 조회
  const [{ data: profile }, { data: userContents }, userCountMap] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, nickname, nickname_en, avatar_url, profession, bio, bio_en')
      .eq('id', celebId)
      .single(),
    supabase
      .from('user_contents')
      .select(`id, content_id, rating, review, review_en, is_spoiler, source_url, contents(id, type, content_locales(${CL_SELECT}))`)
      .eq('user_id', celebId)
      .eq('status', 'FINISHED')
      .eq('visibility', 'public'),
    fetchUserContentCounts(supabase),
  ])

  if (!profile) {
    return { figure: null, contents: [], source: defaultSource }
  }

  const contents: ScriptureContent[] = (userContents || []).map(item => {
    const content = Array.isArray(item.contents) ? item.contents[0] : item.contents
    const flat = flattenLocales((content as any)?.content_locales as ContentLocaleRow[] | null)
    return {
      id: content?.id || '',
      title: flat.title,
      creator: flat.creator,
      thumbnail_url: flat.thumbnail_url,
      type: ((content as any)?.type as CategoryId) || 'BOOK',
      celeb_count: 1,
      user_count: userCountMap.get(content?.id || '') ?? 0,
      avg_rating: item.rating ? Number(item.rating) : null,
      review: item.review,
      review_en: (item as any).review_en ?? null,
      is_spoiler: item.is_spoiler,
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

  return {
    figure: {
      id: profile.id,
      nickname: profile.nickname,
      nickname_en: (profile as any).nickname_en ?? null,
      avatar_url: profile.avatar_url,
      profession: profile.profession,
      bio: profile.bio,
      bio_en: (profile as any).bio_en ?? null,
      contentCount: contents.length
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

export async function getScripturesByEra(): Promise<EraScriptures[]> {
  const supabase = await createClient()

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

  // RPC 결과를 시대별로 그룹핑
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
    eraMap.get(era)!.contents.push({
      id: row.content_id as string,
      title: row.title as string,
      creator: (row.creator as string) ?? null,
      thumbnail_url: (row.thumbnail_url as string) ?? null,
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

  // ERA_CONFIG 순서 보장
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

// #region 단일 시대 콘텐츠 조회 (카테고리 필터 + 페이지네이션)
export async function getEraContents(params: {
  era: string
  category?: string
  page?: number
  limit?: number
}): Promise<ScripturesResult> {
  const supabase = await createClient()
  const era = params.era as Era
  const page = params.page || 1
  const limit = params.limit || 12
  const category = params.category || null

  if (!ERA_CONFIG[era]) {
    return { contents: [], total: 0, totalPages: 0, currentPage: page }
  }

  const offset = (page - 1) * limit
  const { data, error } = await supabase.rpc('get_scriptures_by_era', {
    p_era: era,
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
  const contents: ScriptureContent[] = rows.map(row => ({
    id: row.content_id as string,
    title: row.title as string,
    creator: (row.creator as string) ?? null,
    thumbnail_url: (row.thumbnail_url as string) ?? null,
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
  }))

  return {
    contents,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
  }
}
// #endregion

// #region 콘텐츠를 감상한 셀럽 목록
export async function getCelebsForContent(contentId: string): Promise<CelebInfo[]> {
  const supabase = await createClient()

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
// #endregion

// #region 전 시대 통합 - 최고 영향력 셀럽 Top 3 (감상 기록 5개 이상)
export async function getTopCelebsAcrossAllEras(): Promise<TopCeleb[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_top_celebs_across_eras', {
    p_limit: 3,
  })

  if (error || !data?.length) {
    if (error) console.error('getTopCelebsAcrossAllEras error:', error)
    return []
  }

  return (data as Record<string, unknown>[]).map(row => ({
    id: row.id as string,
    nickname: row.nickname as string,
    nickname_en: (row.nickname_en as string) ?? null,
    avatar_url: (row.avatar_url as string) ?? null,
    title: (row.title as string) ?? null,
    title_en: (row.title_en as string) ?? null,
    influence: row.influence ? Number(row.influence) : null,
    count: Number(row.content_count),
  }))
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

/** 셀럽 ID 목록 → 셀럽별 대표 콘텐츠 반환 (썸네일 있는 것만) */
export async function getContentSamplesForCelebs(celebIds: string[], perCeleb = 2): Promise<Record<string, HubContentSample[]>> {
  if (!celebIds.length) return {}
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_contents')
    .select(`user_id, contents!inner(id, type, content_locales(${CL_SELECT}))`)
    .in('user_id', celebIds)
    .eq('visibility', 'public')
    .eq('status', 'FINISHED')

  if (error || !data?.length) return {}

  const result: Record<string, HubContentSample[]> = {}
  const seen: Record<string, Set<string>> = {}

  for (const row of data as any[]) {
    const celebId = row.user_id as string
    const content = row.contents as any
    const flat = flattenLocales(content.content_locales as ContentLocaleRow[])
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

/** 직업별 대표 콘텐츠 반환 (여러 셀럽이 공통 기록한 콘텐츠 우선) */
export async function getContentSamplesByProfession(professions: string[], perProfession = 2): Promise<Record<string, HubContentSample[]>> {
  if (!professions.length) return {}
  const supabase = await createClient()

  const { data: celebs, error: celebErr } = await supabase
    .from('profiles')
    .select('id, profession')
    .eq('profile_type', 'CELEB')
    .eq('status', 'active')
    .in('profession', professions)

  if (celebErr || !celebs?.length) return {}

  const celebToProfession: Record<string, string> = {}
  for (const c of celebs) {
    if (c.profession) celebToProfession[c.id] = c.profession
  }

  const { data, error } = await supabase
    .from('user_contents')
    .select(`user_id, contents!inner(id, type, content_locales(${CL_SELECT}))`)
    .in('user_id', celebs.map(c => c.id))
    .eq('visibility', 'public')
    .eq('status', 'FINISHED')
    .limit(500)

  if (error || !data?.length) return {}

  // 콘텐츠별 직업 매핑 + 기록 수 집계
  const contentIndex = new Map<string, { sample: HubContentSample; professionCounts: Record<string, number> }>()

  for (const row of data as any[]) {
    const content = row.contents as any
    const profession = celebToProfession[row.user_id as string]
    if (!profession) continue

    if (!contentIndex.has(content.id)) {
      const flat = flattenLocales(content.content_locales as ContentLocaleRow[])
      if (!flat.thumbnail_url) continue
      contentIndex.set(content.id, {
        sample: { id: content.id, title: flat.title, thumbnail_url: flat.thumbnail_url, type: content.type, creator: flat.creator },
        professionCounts: {},
      })
    }
    const entry = contentIndex.get(content.id)!
    entry.professionCounts[profession] = (entry.professionCounts[profession] ?? 0) + 1
  }

  const result: Record<string, HubContentSample[]> = {}
  for (const profession of professions) {
    const candidates = [...contentIndex.values()]
      .filter(e => e.professionCounts[profession])
      .sort((a, b) => (b.professionCounts[profession] ?? 0) - (a.professionCounts[profession] ?? 0))
      .slice(0, perProfession)
      .map(e => e.sample)
    if (candidates.length) result[profession] = candidates
  }
  return result
}
// #endregion
