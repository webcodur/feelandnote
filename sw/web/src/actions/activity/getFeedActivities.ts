'use server'

// egress-allow: activity_logs는 본인·팔로잉 RLS — anon 전환 시 빈 결과라 캐시 분리 불가. 페이로드 슬림화로 대응
import { createClient } from '@/lib/db/server'
import { getTitleInfo } from '@/constants/titles'
import type { ActivityActionType, ActivityTargetType, ContentType } from '@/types/database'
import { getLocale } from 'next-intl/server'
import { CL_SELECT_LIST, flattenLocales, type ContentLocaleRow, type TitleBadge } from '@/lib/utils/content-locale'
import { getBlockedUserIds, filterBlocked } from '@/lib/moderation/blockFilter'

/** 유형 필터가 있을 때 한 번 부를 때 활동을 몇 묶음까지 훑는가. 넘으면 채운 만큼 돌려주고 이어 받게 한다 */
const FEED_TYPE_SCAN_ROUNDS = 5

export interface FeedActivity {
  id: string
  user_id: string
  user_nickname: string
  user_avatar_url: string | null
  user_title: { name: string; grade: string } | null
  action_type: ActivityActionType
  target_type: ActivityTargetType
  target_id: string
  content_id: string | null
  content_title: string | null
  content_thumbnail: string | null
  content_type: ContentType | null
  content_title_ko: string | null
  content_title_en: string | null
  content_creator_en: string | null
  content_isbn_en: string | null
  content_thumbnail_en: string | null
  content_has_en_edition: boolean | null
  content_title_badge: TitleBadge | null
  review: string | null
  rating: number | null
  source_url: string | null
  created_at: string
}

interface GetFeedActivitiesParams {
  limit?: number
  cursor?: string
  contentType?: string
}

interface GetFeedActivitiesResult {
  activities: FeedActivity[]
  nextCursor: string | null
}

export async function getFeedActivities(
  params: GetFeedActivitiesParams = {}
): Promise<GetFeedActivitiesResult> {
  const { limit = 20, cursor, contentType } = params

  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()

  if (!user) {
    return { activities: [], nextCursor: null }
  }

  // 내가 팔로우하는 사람들 ID 조회
  const { data: following } = await db
    .from('member_member_follows')
    .select('followed_member_id')
    .eq('follower_member_id', user.id)

  if (!following || following.length === 0) {
    return { activities: [], nextCursor: null }
  }

  // 팔로우 중이라도 차단한 사람의 활동은 빼고 조회한다.
  // 조회 전에 걸러야 걸러낸 만큼 빈자리가 생기지 않는다.
  const blockedIds = await getBlockedUserIds()
  const followingIds = filterBlocked(
    following.map(f => f.followed_member_id),
    (id) => id,
    blockedIds
  )

  if (followingIds.length === 0) {
    return { activities: [], nextCursor: null }
  }

  // 유형 필터는 활동을 먼저 받고, 그 활동의 작품만 유형을 확인해 거른다.
  // 전에는 그 유형의 작품 id를 전부(1만 건대) 뽑아 .in()에 넣었다. 1,000행 상한에 잘리고 주소 길이로 요청이
  // 실패해, 필터를 켜면 피드가 비었다(26.09.14). activity_logs에는 작품 외래키가 없어 조인으로는 거르지 못한다
  type ActivityRow = {
    id: string
    user_id: string
    action_type: string
    target_type: string
    target_id: string
    content_id: string | null
    created_at: string
  }
  const wantType = contentType && contentType !== 'all' ? contentType : null
  const pageSize = limit + 1
  const scanSize = wantType ? pageSize * 3 : pageSize
  const collected: ActivityRow[] = []
  let scanCursor = cursor
  let scannedAll = false

  // 팔로우한 사람들의 활동 로그 조회 (콘텐츠 추가, 리뷰 작성만). 유형 필터가 있으면 몇 묶음까지 더 훑는다
  for (let round = 0; round < FEED_TYPE_SCAN_ROUNDS && collected.length < pageSize; round++) {
    let query = db
      .from('activity_logs')
      .select('id, user_id, action_type, target_type, target_id, content_id, created_at')
      .in('user_id', followingIds)
      .in('action_type', ['CONTENT_ADD', 'REVIEW_UPDATE'])
      .order('created_at', { ascending: false })
      .limit(scanSize)
    if (scanCursor) query = query.lt('created_at', scanCursor)

    const { data, error } = await query
    if (error || !data) {
      console.error('피드 활동 조회 에러:', error)
      return { activities: [], nextCursor: null }
    }
    const batch = data as ActivityRow[]
    if (batch.length < scanSize) scannedAll = true

    if (!wantType) {
      collected.push(...batch)
      break
    }
    const batchContentIds = [...new Set(batch.map((row) => row.content_id).filter((id): id is string => Boolean(id)))]
    const { data: typedContents } = batchContentIds.length
      ? await db.from('contents').select('id').in('id', batchContentIds).eq('type', wantType)
      : { data: [] as { id: string }[] }
    const matching = new Set((typedContents ?? []).map((row) => row.id))
    collected.push(...batch.filter((row) => row.content_id !== null && matching.has(row.content_id)))

    if (scannedAll || batch.length === 0) break
    scanCursor = batch[batch.length - 1].created_at
  }

  const hasMore = collected.length > limit
  const sliced = hasMore ? collected.slice(0, limit) : collected
  // 유형 필터로 훑기 상한에 닿았는데 아직 남은 활동이 있으면, 채운 만큼만 돌려주고 훑은 자리부터 이어 받게 한다
  const nextCursor = hasMore
    ? sliced[sliced.length - 1].created_at
    : wantType && !scannedAll && scanCursor
      ? scanCursor
      : null
  const activityMemberIds = [...new Set(sliced.map(item => item.user_id))]

  const { data: memberProfiles } = activityMemberIds.length
    ? await db
        .from('member_profiles')
        .select('id, nickname, avatar_url, selected_title')
        .in('id', activityMemberIds)
    : { data: [] }

  // content_id 목록 추출해서 별도 조회
  const contentIds = [...new Set(sliced.map(item => item.content_id).filter(Boolean))] as string[]

  let contentsMap: Record<string, { title: string; thumbnail_url: string | null; type: ContentType; title_ko: string | null; title_en: string | null; creator_en: string | null; isbn_en: string | null; thumbnail_en: string | null; has_en_edition: boolean | null; title_badge: TitleBadge | null }> = {}
  let userContentsMap: Record<string, { review: string | null; rating: number | null; source_url: string | null }> = {}

  if (contentIds.length > 0) {
    // 콘텐츠 메타와 회원 감상 기록을 병렬 조회
    const [{ data: contents }, { data: userContents }] = await Promise.all([
      db
        .from('contents')
        .select(`id, type, content_locales(${CL_SELECT_LIST})`)
        .in('id', contentIds),
      db
        .from('member_contents')
        .select('user_id:member_id, content_id, review, rating, source_url')
        .in('member_id', activityMemberIds)
        .in('content_id', contentIds),
    ])

    // contents select 문자열과 동일한 조회 행
    interface FeedContentRow {
      id: string
      type: string
      content_locales: ContentLocaleRow[] | null
    }

    const locale = await getLocale()
    if (contents) {
      contentsMap = Object.fromEntries(
        contents.map((c: FeedContentRow) => {
          const flat = flattenLocales(c.content_locales, locale)
          return [c.id, { title: flat.title, thumbnail_url: flat.thumbnail_url, type: c.type as ContentType, title_ko: flat.title_ko, title_en: flat.title_en, creator_en: flat.creator_en, isbn_en: flat.isbn_en, thumbnail_en: flat.thumbnail_en, has_en_edition: flat.has_en_edition, title_badge: flat.title_badge }]
        })
      )
    }

    if (userContents) {
      userContentsMap = Object.fromEntries(
        userContents.map(uc => [
          `${uc.user_id}:${uc.content_id}`,
          { review: uc.review, rating: uc.rating, source_url: uc.source_url }
        ])
      )
    }
  }

  type RawUserProfile = { nickname: string; avatar_url: string | null; selected_title: string | null }
  const profileMap = new Map((memberProfiles || []).map(profile => [profile.id, profile as RawUserProfile]))

  const activities: FeedActivity[] = sliced.map((item) => {
    const rawProfile = profileMap.get(item.user_id)
    const contentInfo = item.content_id ? contentsMap[item.content_id] : null
    const userContentKey = item.content_id ? `${item.user_id}:${item.content_id}` : null
    const userContentInfo = userContentKey ? userContentsMap[userContentKey] : null

    return {
      id: item.id,
      user_id: item.user_id,
      user_nickname: rawProfile?.nickname || 'User',
      user_avatar_url: rawProfile?.avatar_url || null,
      user_title: getTitleInfo(rawProfile?.selected_title ?? null),
      action_type: item.action_type as ActivityActionType,
      target_type: item.target_type as ActivityTargetType,
      target_id: item.target_id,
      content_id: item.content_id,
      content_title: contentInfo?.title || null,
      content_thumbnail: contentInfo?.thumbnail_url || null,
      content_type: contentInfo?.type || null,
      content_title_ko: contentInfo?.title_ko || null,
      content_title_en: contentInfo?.title_en || null,
      content_creator_en: contentInfo?.creator_en || null,
      content_isbn_en: contentInfo?.isbn_en || null,
      content_thumbnail_en: contentInfo?.thumbnail_en || null,
      content_has_en_edition: contentInfo?.has_en_edition ?? null,
      content_title_badge: contentInfo?.title_badge ?? null,
      review: userContentInfo?.review || null,
      rating: userContentInfo?.rating || null,
      source_url: userContentInfo?.source_url || null,
      created_at: item.created_at,
    }
  })

  return {
    activities,
    nextCursor,
  }
}
