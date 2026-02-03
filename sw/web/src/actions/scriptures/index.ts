'use server'

import { createClient } from '@/lib/supabase/server'
import { CategoryId } from '@/constants/categories'
import { CELEB_PROFESSIONS } from '@/constants/celebProfessions'

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
  avatar_url: string | null
  title: string | null
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
    contents: { id: string; title: string; creator: string | null; thumbnail_url: string | null; type: string } | null
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
          avg_rating: null
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
    .sort((a, b) => b.celeb_count - a.celeb_count)

  const total = allContents.length
  const startIndex = (page - 1) * limit
  const paginatedContents = allContents.slice(startIndex, startIndex + limit)

  return { contents: paginatedContents, total }
}
// #endregion

// #region 헬퍼 함수 - 페이지네이션으로 모든 데이터 조회
async function fetchAllUserContents(
  supabase: Awaited<ReturnType<typeof createClient>>,
  celebIds: string[],
  category?: string
) {
  const PAGE_SIZE = 1000
  const allData: Array<{
    user_id: string
    content_id: string
    rating: number | null
    contents: { id: string; title: string; creator: string | null; thumbnail_url: string | null; type: string }
  }> = []

  let from = 0
  let hasMore = true

  while (hasMore) {
    let query = supabase
      .from('user_contents')
      .select(`
        user_id,
        content_id,
        rating,
        contents!inner(id, title, creator, thumbnail_url, type)
      `)
      .in('user_id', celebIds)
      .eq('status', 'FINISHED')
      .range(from, from + PAGE_SIZE - 1)

    if (category) {
      query = query.eq('contents.type', category)
    }

    const { data, error } = await query

    if (error) {
      console.error('fetchAllUserContents error:', error)
      break
    }

    const typedData = (data || []).map(item => ({
      user_id: item.user_id,
      content_id: item.content_id,
      rating: item.rating,
      contents: Array.isArray(item.contents) ? item.contents[0] : item.contents
    }))

    allData.push(...typedData)

    hasMore = data?.length === PAGE_SIZE
    from += PAGE_SIZE
  }

  return allData
}

// 일반 사용자(USER)의 content_id별 카운트 조회
async function fetchUserContentCounts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  category?: string
): Promise<Map<string, number>> {
  const PAGE_SIZE = 1000
  const countMap = new Map<string, number>()

  // USER 프로필 ID 목록 조회
  const { data: userProfiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('profile_type', 'USER')

  if (!userProfiles?.length) return countMap

  const userIds = userProfiles.map(p => p.id)
  let from = 0
  let hasMore = true

  while (hasMore) {
    let query = supabase
      .from('user_contents')
      .select('content_id, contents!inner(type)')
      .in('user_id', userIds)
      .eq('status', 'FINISHED')
      .range(from, from + PAGE_SIZE - 1)

    if (category) {
      query = query.eq('contents.type', category)
    }

    const { data, error } = await query

    if (error || !data?.length) break

    for (const item of data) {
      const count = countMap.get(item.content_id) || 0
      countMap.set(item.content_id, count + 1)
    }

    hasMore = data.length === PAGE_SIZE
    from += PAGE_SIZE
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

  // 1. CELEB 프로필 ID 목록 조회
  const { data: celebProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('profile_type', 'CELEB')

  if (profileError || !celebProfiles?.length) {
    console.error('getChosenScriptures profile error:', profileError)
    return { contents: [], total: 0, totalPages: 0, currentPage: page }
  }

  const celebIds = celebProfiles.map(p => p.id)
  const category = params?.category

  // 2. 해당 셀럽들의 콘텐츠 조회 (페이지네이션으로 모든 데이터 가져오기)
  const typedData = await fetchAllUserContents(supabase, celebIds, category)

  // 3. 일반 사용자(USER) 콘텐츠 카운트 조회
  const userCountMap = await fetchUserContentCounts(supabase, category)

  // aggregateContents에서 카테고리 필터는 이미 DB에서 적용됨
  const { contents, total } = aggregateContents(typedData, {
    page,
    limit,
    userCountMap
  })

  return {
    contents,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page
  }
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

  // 해당 직업의 CELEB 프로필 ID 조회 (기존 쿼리 유지)
  const { data: celebProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('profile_type', 'CELEB')
    .eq('profession', profession)

  if (profileError || !celebProfiles?.length) return null

  const celebIds = celebProfiles.map(p => p.id)

  // 해당 셀럽들의 콘텐츠 조회 (페이지네이션으로 모든 데이터 가져오기)
  // TopCeleb의 count를 계산하기 위해 먼저 가져옵니다.
  const typedData = await fetchAllUserContents(supabase, celebIds)

  // 영향력 기준 top 5 셀럽 (celeb_influence 테이블 조인)
  const { data: topCelebsData } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url, title, celeb_influence(total_score)')
    .in('id', celebIds)
    .not('celeb_influence', 'is', null)
    .order('celeb_influence(total_score)', { ascending: false })
    .limit(5)

  const topCelebs: TopCeleb[] = (topCelebsData || []).map(c => {
    const influence = Array.isArray(c.celeb_influence) ? c.celeb_influence[0] : c.celeb_influence
    // user_contents 카운트 계산
    const contentCount = typedData.filter(item => item.user_id === c.id).length
    
    return {
      id: c.id,
      nickname: c.nickname,
      avatar_url: c.avatar_url,
      title: c.title,
      influence: influence?.total_score ?? null,
      count: contentCount
    }
  })

  // 일반 사용자(USER) 콘텐츠 카운트 조회
  const userCountMap = await fetchUserContentCounts(supabase)

  const { contents, total } = aggregateContents(typedData, { page, limit, userCountMap })
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
  const results: Array<{ profession: string; label: string; count: number }> = []

  for (const { key, label } of PROFESSION_MAP) {
    const { data: celebProfiles, count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('profile_type', 'CELEB')
      .eq('profession', key)

    // 해당 직업의 셀럽이 있으면 추가 (셀럽 인원 수 표시)
    if (count && count > 0) {
      results.push({ profession: key, label, count })
    }
  }

  return results.sort((a, b) => b.count - a.count)
}
// #endregion

// #region 오늘의 인물 - 매일 랜덤 셀럽 1명의 콘텐츠
export interface TodaySage {
  id: string
  nickname: string
  avatar_url: string | null
  profession: string | null
  bio: string | null
  contentCount: number
}

export interface TodaySageResult {
  sage: TodaySage | null
  contents: ScriptureContent[]
}

export async function getTodaySage(): Promise<TodaySageResult> {
  const supabase = await createClient()

  // 1. 셀럽 프로필 ID 목록 조회
  const { data: celebProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('profile_type', 'CELEB')

  if (profileError || !celebProfiles?.length) {
    return { sage: null, contents: [] }
  }

  const celebIds = celebProfiles.map(p => p.id)

  // 2. 해당 셀럽들의 콘텐츠 개수 집계 (페이지네이션으로 모든 데이터 가져오기)
  const PAGE_SIZE = 1000
  const celebCountsData: { user_id: string }[] = []
  let from = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('user_contents')
      .select('user_id')
      .in('user_id', celebIds)
      .eq('status', 'FINISHED')
      .range(from, from + PAGE_SIZE - 1)

    if (error || !data?.length) break
    celebCountsData.push(...data)
    hasMore = data.length === PAGE_SIZE
    from += PAGE_SIZE
  }

  if (!celebCountsData.length) {
    return { sage: null, contents: [] }
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
    return { sage: null, contents: [] }
  }

  // 2. 오늘 날짜 기반 결정적 랜덤 선택
  const today = new Date().toISOString().slice(0, 10)
  const seed = today.split('-').reduce((acc, n) => acc + parseInt(n), 0)
  const selectedIndex = seed % eligibleCelebs.length
  const selected = eligibleCelebs[selectedIndex]

  // 3. 선택된 셀럽 프로필 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nickname, avatar_url, profession, bio')
    .eq('id', selected.id)
    .single()

  if (!profile) {
    return { sage: null, contents: [] }
  }

  // 4. 해당 셀럽의 콘텐츠 조회
  const { data: userContents } = await supabase
    .from('user_contents')
    .select('content_id, rating, contents(id, title, creator, thumbnail_url, type)')
    .eq('user_id', selected.id)
    .eq('status', 'FINISHED')

  // 5. 일반 사용자(USER) 콘텐츠 카운트 조회
  const userCountMap = await fetchUserContentCounts(supabase)

  const contents: ScriptureContent[] = (userContents || []).map(item => {
    const content = Array.isArray(item.contents) ? item.contents[0] : item.contents
    return {
      id: content?.id || '',
      title: content?.title || '',
      creator: content?.creator || null,
      thumbnail_url: content?.thumbnail_url || null,
      type: (content?.type as CategoryId) || 'BOOK',
      celeb_count: 1,
      user_count: userCountMap.get(content?.id || '') ?? 0,
      avg_rating: item.rating ? Number(item.rating) : null
    }
  }).filter(c => c.id)

  return {
    sage: {
      id: profile.id,
      nickname: profile.nickname,
      avatar_url: profile.avatar_url,
      profession: profile.profession,
      bio: profile.bio,
      contentCount: selected.count
    },
    contents
  }
}
// #endregion

// #region 세대의 경전 - 시대별 인기 콘텐츠
type Era = 'ancient' | 'medieval' | 'modern' | 'contemporary'

const ERA_CONFIG: Record<Era, { label: string; period: string; min: number; max: number; description: string }> = {
  ancient: {
    label: '고대',
    period: '~500년',
    min: -9999,
    max: 500,
    description: '철학과 사상의 씨앗이 뿌려진 시대. 소크라테스, 공자, 붓다가 인류의 근본 질문을 던졌다.'
  },
  medieval: {
    label: '중세',
    period: '500~1500년',
    min: 500,
    max: 1500,
    description: '신앙과 기사도의 시대. 어둠 속에서도 지혜의 불씨를 지킨 수도원과 학자들.'
  },
  modern: {
    label: '근대',
    period: '1500~1900년',
    min: 1500,
    max: 1900,
    description: '이성의 빛이 세상을 깨우다. 르네상스, 계몽주의, 산업혁명이 세계를 바꿨다.'
  },
  contemporary: {
    label: '현대',
    period: '1900년~',
    min: 1900,
    max: 9999,
    description: '격변과 혁신의 세기. 지금 우리의 생각을 형성한 거인들이 살았던 시대.'
  },
}

function parseYear(birthDate: string | null): number | null {
  if (!birthDate) return null
  const match = birthDate.match(/^(-?\d+)/)
  return match ? parseInt(match[1]) : null
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
  topCelebs: EraCeleb[]
}

export async function getScripturesByEra(): Promise<EraScriptures[]> {
  const supabase = await createClient()

  // 1. 셀럽 프로필 + 생년 조회 (기존 쿼리 유지)
  const { data: celebProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, birth_date')
    .eq('profile_type', 'CELEB')
    .not('birth_date', 'is', null)

  if (profileError || !celebProfiles?.length) {
    return []
  }

  // 2. 시대별 셀럽 ID 분류
  const eraCelebs: Record<Era, string[]> = {
    ancient: [],
    medieval: [],
    modern: [],
    contemporary: [],
  }

  for (const celeb of celebProfiles) {
    const year = parseYear(celeb.birth_date)
    if (year === null) continue

    for (const [era, config] of Object.entries(ERA_CONFIG) as [Era, typeof ERA_CONFIG[Era]][]) {
      if (year >= config.min && year < config.max) {
        eraCelebs[era].push(celeb.id)
        break
      }
    }
  }

  // 3. 일반 사용자(USER) 콘텐츠 카운트 조회 (한 번만)
  const userCountMap = await fetchUserContentCounts(supabase)

  // 4. 각 시대별 콘텐츠 조회
  const results: EraScriptures[] = []

  for (const [era, config] of Object.entries(ERA_CONFIG) as [Era, typeof ERA_CONFIG[Era]][]) {
    const celebIds = eraCelebs[era]
    if (!celebIds.length) {
      results.push({ era, label: config.label, period: config.period, description: config.description, contents: [], celebCount: 0, topCelebs: [] })
      continue
    }

    // 페이지네이션으로 모든 데이터 가져오기 (먼저 호출해야 카운트 가능)
    const typedData = await fetchAllUserContents(supabase, celebIds)

    // 영향력 기준 top 5 셀럽 (celeb_influence 테이블 조인)
    const { data: topCelebsData } = await supabase
      .from('profiles')
      .select('id, nickname, avatar_url, title, celeb_influence(total_score)')
      .in('id', celebIds)
      .not('celeb_influence', 'is', null)
      .order('celeb_influence(total_score)', { ascending: false })
      .limit(5)

    const topCelebs: EraCeleb[] = (topCelebsData || []).map(c => {
      const influence = Array.isArray(c.celeb_influence) ? c.celeb_influence[0] : c.celeb_influence
      
      // user_contents 카운트 계산
      const contentCount = typedData.filter(item => item.user_id === c.id).length
      
      return {
        id: c.id,
        nickname: c.nickname,
        avatar_url: c.avatar_url,
        title: c.title,
        influence: influence?.total_score ?? null,
        count: contentCount
      }
    })

    const { contents } = aggregateContents(typedData, { limit: 6, userCountMap })
    results.push({ era, label: config.label, period: config.period, description: config.description, contents, celebCount: celebIds.length, topCelebs })
  }

  return results
}

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
