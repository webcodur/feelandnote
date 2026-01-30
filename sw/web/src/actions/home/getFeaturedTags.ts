'use server'

import { createClient } from '@/lib/supabase/server'
import type { CelebProfile, CelebTagInfo } from '@/types/home'
import { getCelebLevelByRanking } from '@/constants/materials'

export type FeaturedCeleb = CelebProfile & {
  short_desc: string | null
  long_desc: string | null
}

export interface FeaturedTag {
  id: string
  name: string
  description: string | null
  color: string
  celebs: FeaturedCeleb[]
}

export async function getFeaturedTags(): Promise<FeaturedTag[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  // 1. 태그 조회
  const { data: tags } = await supabase
    .from('celeb_tags')
    .select('id, name, description, color')
    .eq('is_featured', true)
    .or(`start_date.is.null,start_date.lte.${today}`)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order('sort_order', { ascending: true })
    .limit(4)

  if (!tags?.length) return []

  const tagIds = tags.map(t => t.id)

  // 2. 모든 태그의 assignments 한 번에 조회
  const { data: allAssignments } = await supabase
    .from('celeb_tag_assignments')
    .select('*')
    .in('tag_id', tagIds)
    .order('sort_order', { ascending: true })

  const assignmentsByTag: Record<string, typeof allAssignments> = {}
  const allCelebIds = new Set<string>()

  tags.forEach(tag => {
    const tagAssignments = (allAssignments ?? [])
      .filter(a => a.tag_id === tag.id)
      .slice(0, 8)
    assignmentsByTag[tag.id] = tagAssignments
    tagAssignments.forEach(a => allCelebIds.add(a.celeb_id))
  })

  const celebIdArray = Array.from(allCelebIds)
  if (celebIdArray.length === 0) {
    return tags.map(tag => ({ ...tag, celebs: [] }))
  }

  // 3. 모든 셀럽 데이터 병렬 조회 (N+1 쿼리 방지)
  const [
    profilesResult,
    followsResult,
    influencesResult,
    tagDataResult,
    contentCountsResult,
    userResult
  ] = await Promise.all([
    // 프로필
    supabase.from('profiles').select(`
      id, nickname, avatar_url, portrait_url, title, profession,
      consumption_philosophy, nationality, birth_date, death_date,
      bio, quotes, is_verified, claimed_by
    `).in('id', celebIdArray),
    // 팔로워 수
    supabase.from('follows').select('following_id').in('following_id', celebIdArray),
    // 영향력
    supabase.from('celeb_influence').select('celeb_id, total_score').in('celeb_id', celebIdArray),
    // 태그 정보
    supabase.from('celeb_tag_assignments')
      .select('celeb_id, short_desc, long_desc, tag:celeb_tags(id, name, color)')
      .in('celeb_id', celebIdArray),
    // 콘텐츠 수
    supabase.rpc('count_contents_by_users', { user_ids: celebIdArray }),
    // 현재 유저
    supabase.auth.getUser()
  ])

  // 맵 구성
  const profileMap = new Map<string, any>()
  ;(profilesResult.data ?? []).forEach(p => profileMap.set(p.id, p))

  const followerCountMap = new Map<string, number>()
  ;(followsResult.data ?? []).forEach(f => {
    followerCountMap.set(f.following_id, (followerCountMap.get(f.following_id) ?? 0) + 1)
  })

  const influenceMap = new Map<string, number>()
  ;(influencesResult.data ?? []).forEach(inf => {
    influenceMap.set(inf.celeb_id, inf.total_score ?? 0)
  })

  const tagsMap = new Map<string, CelebTagInfo[]>()
  ;(tagDataResult.data ?? []).forEach((item: any) => {
    if (!item.tag) return
    const list = tagsMap.get(item.celeb_id) ?? []
    list.push({ ...item.tag, short_desc: item.short_desc, long_desc: item.long_desc })
    tagsMap.set(item.celeb_id, list)
  })

  const contentCountMap = new Map<string, number>()
  if (contentCountsResult.data) {
    (contentCountsResult.data as any[]).forEach(c => contentCountMap.set(c.user_id, c.count))
  }

  // 유저별 팔로우 여부
  const user = userResult.data?.user
  const myFollowings = new Set<string>()
  if (user) {
    const { data: follows } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', user.id)
      .in('following_id', celebIdArray)
    follows?.forEach(f => myFollowings.add(f.following_id))
  }

  // 결과 조합
  const result: FeaturedTag[] = []

  for (const tag of tags) {
    const assignments = assignmentsByTag[tag.id] ?? []
    if (!assignments.length) continue

    const celebs: FeaturedCeleb[] = assignments
      .map((a: any): FeaturedCeleb | null => {
        const c = profileMap.get(a.celeb_id)
        if (!c) return null

        const score = influenceMap.get(c.id) ?? 0
        const celebTags = tagsMap.get(c.id) ?? []

        return {
          id: c.id,
          nickname: c.nickname,
          avatar_url: c.avatar_url,
          portrait_url: c.portrait_url,
          title: c.title,
          profession: c.profession,
          consumption_philosophy: c.consumption_philosophy,
          nationality: c.nationality,
          birth_date: c.birth_date,
          death_date: c.death_date,
          bio: c.bio,
          quotes: c.quotes,
          is_verified: c.is_verified ?? false,
          is_platform_managed: c.claimed_by === null,
          follower_count: followerCountMap.get(c.id) ?? 0,
          content_count: contentCountMap.get(c.id) ?? 0,
          is_following: myFollowings.has(c.id),
          is_follower: false,
          influence: score > 0 ? {
            total_score: score,
            level: getCelebLevelByRanking(1, 1),
            ranking: undefined,
            percentile: undefined
          } : null,
          tags: celebTags,
          short_desc: a.short_desc,
          long_desc: a.long_desc,
        }
      })
      .filter((c): c is FeaturedCeleb => c !== null)

    if (celebs.length > 0) {
      result.push({
        id: tag.id,
        name: tag.name,
        description: tag.description,
        color: tag.color,
        celebs,
      })
    }
  }

  return result
}
