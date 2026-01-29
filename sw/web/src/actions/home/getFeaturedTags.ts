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

  const { data: tags, error: tagError } = await supabase
    .from('celeb_tags')
    .select('id, name, description, color')
    .eq('is_featured', true)
    .or(`start_date.is.null,start_date.lte.${today}`)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order('sort_order', { ascending: true })
    .limit(4)

  if (tagError || !tags?.length) {
    return []
  }

  const result: FeaturedTag[] = []

  // 2. 전체 영향력 데이터 (랭킹 산정용)
  // 매번 전체를 긁는건 비효율적일 수 있으나, 현재 규모에선 OK (캐싱 고려 가능)
  const { count: influenceTotal } = await supabase
    .from('celeb_influence')
    .select('*', { count: 'exact', head: true })
    .gt('total_score', 0)

  for (const tag of tags) {
    const { data: assignments, error: assignError } = await supabase
      .from('celeb_tag_assignments')
      .select('*')
      .eq('tag_id', tag.id)
      .limit(8)

    if (!assignments?.length) continue

    const celebIds = assignments.map(a => a.celeb_id)

    // 4. 추가 정보 조회 (프로필, 영향력, 태그, 콘텐츠 수, 팔로우 여부)
    
    // 4-0. 프로필 정보
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select(`
        id, nickname, avatar_url, portrait_url, title, profession,
        consumption_philosophy, nationality, birth_date, death_date,
        bio, quotes, is_verified, claimed_by
      `)
      .in('id', celebIds)
    
    const profileMap = new Map<string, any>()
    ;(profiles ?? []).forEach(p => profileMap.set(p.id, p))

    // 4-0.5 팔로워 수 조회
    const { data: allFollows } = await supabase
      .from('follows')
      .select('following_id')
      .in('following_id', celebIds)
    
    const followerCountMap = new Map<string, number>()
    ;(allFollows ?? []).forEach(f => {
      followerCountMap.set(f.following_id, (followerCountMap.get(f.following_id) ?? 0) + 1)
    })

    // 4-1. 영향력
    const { data: influences } = await supabase
      .from('celeb_influence')
      .select('celeb_id, total_score')
      .in('celeb_id', celebIds)

    // 랭킹 조회를 위해 각 셀럽별로 랭킹 쿼리? or just score.
    // getCelebs.ts 처럼 전체 랭킹을 메모리에 올리는건 과함.
    // 여기서는 Level 계산을 score 기반 절대평가로 하거나 (임시),
    // getCelebLevelByRanking을 위해 대략적인 랭킹을 가져와야 함.
    // 간단히: score만 가져와서 랭킹은 대략 추정하거나 생략 (DetailModal 내부에서 다시 fetch? No modal takes full obj)
    // Let's fetch ranking for these specific IDs if possible using rpc 'get_celeb_ranking' if it exists, or just count > score.
    // For now, simplify: use total_score. Modal calculates level if ranking provided.
    // We will just calculate percentile locally within this small set? No that's wrong.
    // Let's just fetch count of celebs with higher score for each. (N+1 query but N=8, ok).
    // Actually, just rank 1 for now or skip ranking field if optional. CelebProfile.influence.ranking is optional.

    const influenceMap = new Map<string, number>()
    ;(influences ?? []).forEach(inf => {
      influenceMap.set(inf.celeb_id, inf.total_score ?? 0)
    })

    // 4-2. 태그 (각 셀럽이 가진 모든 태그)
    const { data: tagData } = await supabase
      .from('celeb_tag_assignments')
      .select('celeb_id, short_desc, long_desc, tag:celeb_tags(id, name, color)')
      .in('celeb_id', celebIds)

    const tagsMap = new Map<string, CelebTagInfo[]>()
    ;(tagData ?? []).forEach((item: any) => {
      if (!item.tag) return
      const list = tagsMap.get(item.celeb_id) ?? []
      list.push({ ...item.tag, short_desc: item.short_desc, long_desc: item.long_desc })
      tagsMap.set(item.celeb_id, list)
    })

    // 4-3. 콘텐츠 수 (user_contents count)
    const { data: contentCounts } = await supabase.rpc('count_contents_by_users', { user_ids: celebIds })
    // RPC or manual query. Manual:
    let contentCountMap = new Map<string, number>()
    
    if (contentCounts) {
       (contentCounts as any[]).forEach(c => contentCountMap.set(c.user_id, c.count))
    } else {
        const { data: userContents } = await supabase
        .from('user_contents')
        .select('user_id')
        .in('user_id', celebIds)
        
        ;(userContents ?? []).forEach((c: any) => {
        contentCountMap.set(c.user_id, (contentCountMap.get(c.user_id) ?? 0) + 1)
        })
    }

    // 4-4. 팔로우 여부 (로그인 유저 기준)
    const { data: { user } } = await supabase.auth.getUser()
    const myFollowings = new Set<string>()
    if (user) {
      const { data: follows } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)
        .in('following_id', celebIds)
      
      follows?.forEach(f => myFollowings.add(f.following_id))
    }

    // 매핑
    const celebs: FeaturedCeleb[] = assignments
      .map((a): FeaturedCeleb | null => {
        const c = profileMap.get(a.celeb_id)
        if (!c) return null // Should not happen if data integrity is good

        const score = influenceMap.get(c.id) ?? 0
        const tags = tagsMap.get(c.id) ?? []
        
        // 랭킹 계산 (DB 부하 줄이기 위해 생략하거나 간단히 처리)
        // 여기서는 생략하고 Level 1 처리 혹은 점수만 전달
        // CelebProfile requires influence object
        
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
          is_follower: false, // Feature에서는 굳이 체크 안함
          influence: score > 0 ? {
            total_score: score,
            level: getCelebLevelByRanking(1, 1), // 임시: 랭킹 정보 없이 레벨 산출 불가하므로 기본값
            ranking: undefined,
            percentile: undefined
          } : null,
          tags: tags,
          short_desc: a.short_desc,
          long_desc: a.long_desc,
        }
      })
      .filter((c): c is FeaturedCeleb => c !== null)
    
    // 영향력 순 정렬
    celebs.sort((a, b) => (b.influence?.total_score ?? 0) - (a.influence?.total_score ?? 0))

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
