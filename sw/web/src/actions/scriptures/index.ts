'use server'

import { createClient } from '@/lib/supabase/server'
import { CategoryId } from '@/constants/categories'

// #region Types
export interface ScriptureContent {
  id: string
  title: string
  creator: string | null
  thumbnail_url: string | null
  type: string
  celeb_count: number
  avg_rating: number | null
}

export interface ScripturesResult {
  contents: ScriptureContent[]
  total: number
  totalPages: number
  currentPage: number
}

export interface ScripturesByProfession {
  profession: string
  label: string
  contents: ScriptureContent[]
  total: number
}

interface CelebInfo {
  id: string
  nickname: string
  avatar_url: string | null
  profession: string | null
}

// 직업 매핑 (내부용)
const PROFESSION_MAP = [
  { key: 'entrepreneur', label: '기업인' },
  { key: 'scholar', label: '학자' },
  { key: 'artist', label: '예술가' },
  { key: 'politician', label: '정치인' },
  { key: 'author', label: '작가' },
  { key: 'commander', label: '지휘관' },
  { key: 'leader', label: '지도자' },
  { key: 'investor', label: '투자자' },
  { key: 'athlete', label: '운동선수' },
  { key: 'actor', label: '배우' },
] as const
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
  } = {}
): { contents: ScriptureContent[]; total: number } {
  const { category, page = 1, limit = 12 } = options

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

  // 2. 해당 셀럽들의 콘텐츠 조회
  // 카테고리 필터가 있으면 DB에서 직접 필터링 (1000개 limit 문제 해결)
  let query = supabase
    .from('user_contents')
    .select(`
      content_id,
      rating,
      contents!inner(id, title, creator, thumbnail_url, type)
    `)
    .in('user_id', celebIds)
    .eq('status', 'FINISHED')

  if (category) {
    query = query.eq('contents.type', category)
  }

  const { data, error } = await query.limit(5000)

  if (error) {
    console.error('getChosenScriptures error:', error)
    return { contents: [], total: 0, totalPages: 0, currentPage: page }
  }

  const typedData = (data || []).map(item => ({
    content_id: item.content_id,
    rating: item.rating,
    contents: Array.isArray(item.contents) ? item.contents[0] : item.contents
  }))

  // aggregateContents에서 카테고리 필터는 이미 DB에서 적용됨
  const { contents, total } = aggregateContents(typedData, {
    page,
    limit
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

  // 해당 직업의 CELEB 프로필 ID 조회
  const { data: celebProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('profile_type', 'CELEB')
    .eq('profession', profession)

  if (profileError || !celebProfiles?.length) return null

  const celebIds = celebProfiles.map(p => p.id)

  // 해당 셀럽들의 콘텐츠 조회
  const { data, error } = await supabase
    .from('user_contents')
    .select(`
      content_id,
      rating,
      contents(id, title, creator, thumbnail_url, type)
    `)
    .in('user_id', celebIds)
    .eq('status', 'FINISHED')
    .limit(5000)

  if (error) {
    console.error(`getScripturesByProfession error for ${profession}:`, error)
    return null
  }

  const typedData = (data || []).map(item => ({
    content_id: item.content_id,
    rating: item.rating,
    contents: Array.isArray(item.contents) ? item.contents[0] : item.contents
  }))

  const { contents, total } = aggregateContents(typedData, { page, limit })
  const professionInfo = PROFESSION_MAP.find(p => p.key === profession)

  return {
    profession,
    label: professionInfo?.label || profession,
    contents,
    total
  }
}

// 직업별 콘텐츠 개수만 조회 (탭 표시용)
export async function getProfessionContentCounts(): Promise<Array<{ profession: string; label: string; count: number }>> {
  const supabase = await createClient()
  const results: Array<{ profession: string; label: string; count: number }> = []

  for (const { key, label } of PROFESSION_MAP) {
    const { data: celebProfiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('profile_type', 'CELEB')
      .eq('profession', key)

    if (!celebProfiles?.length) continue

    const celebIds = celebProfiles.map(p => p.id)

    const { count } = await supabase
      .from('user_contents')
      .select('content_id', { count: 'exact', head: true })
      .in('user_id', celebIds)
      .eq('status', 'FINISHED')

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

  // 2. 해당 셀럽들의 콘텐츠 개수 집계
  const { data: celebCounts, error: countError } = await supabase
    .from('user_contents')
    .select('user_id')
    .in('user_id', celebIds)
    .eq('status', 'FINISHED')
    .limit(5000)

  if (countError || !celebCounts?.length) {
    return { sage: null, contents: [] }
  }

  // 셀럽별 콘텐츠 개수 집계
  const countMap = new Map<string, number>()
  for (const item of celebCounts) {
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

  const contents: ScriptureContent[] = (userContents || []).map(item => {
    const content = Array.isArray(item.contents) ? item.contents[0] : item.contents
    return {
      id: content?.id || '',
      title: content?.title || '',
      creator: content?.creator || null,
      thumbnail_url: content?.thumbnail_url || null,
      type: (content?.type as CategoryId) || 'BOOK',
      celeb_count: 1,
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

const ERA_CONFIG: Record<Era, { label: string; period: string; min: number; max: number }> = {
  ancient: { label: '고대', period: '~500년', min: -9999, max: 500 },
  medieval: { label: '중세', period: '500~1500년', min: 500, max: 1500 },
  modern: { label: '근대', period: '1500~1900년', min: 1500, max: 1900 },
  contemporary: { label: '현대', period: '1900년~', min: 1900, max: 9999 },
}

function parseYear(birthDate: string | null): number | null {
  if (!birthDate) return null
  const match = birthDate.match(/^(-?\d+)/)
  return match ? parseInt(match[1]) : null
}

export interface EraScriptures {
  era: Era
  label: string
  period: string
  contents: ScriptureContent[]
  celebCount: number
}

export async function getScripturesByEra(): Promise<EraScriptures[]> {
  const supabase = await createClient()

  // 1. 셀럽 프로필 + 생년 조회
  const { data: celebProfiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, birth_date')
    .eq('profile_type', 'CELEB')
    .not('birth_date', 'is', null)

  if (profileError || !celebProfiles?.length) {
    return []
  }

  // 2. 시대별 셀럽 분류
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

  // 3. 각 시대별 콘텐츠 조회
  const results: EraScriptures[] = []

  for (const [era, config] of Object.entries(ERA_CONFIG) as [Era, typeof ERA_CONFIG[Era]][]) {
    const celebIds = eraCelebs[era]
    if (!celebIds.length) {
      results.push({ era, label: config.label, period: config.period, contents: [], celebCount: 0 })
      continue
    }

    const { data } = await supabase
      .from('user_contents')
      .select('content_id, rating, contents(id, title, creator, thumbnail_url, type)')
      .in('user_id', celebIds)
      .eq('status', 'FINISHED')
      .limit(5000)

    const typedData = (data || []).map(item => ({
      content_id: item.content_id,
      rating: item.rating,
      contents: Array.isArray(item.contents) ? item.contents[0] : item.contents
    }))

    const { contents } = aggregateContents(typedData, { limit: 6 })
    results.push({ era, label: config.label, period: config.period, contents, celebCount: celebIds.length })
  }

  return results
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
