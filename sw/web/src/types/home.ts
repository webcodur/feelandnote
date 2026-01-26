// 메인페이지(홈) 관련 타입 정의

import type { ContentType } from './database'
import type { CelebLevel } from '@/constants/materials'

// region: 셀럽 관련 타입

export interface CelebInfluence {
  total_score: number
  level: CelebLevel
  /** 전체 중 순위 (1부터 시작) */
  ranking?: number
  /** 상위 몇 % (0~100) */
  percentile?: number
}

export interface CelebProfile {
  id: string
  nickname: string
  avatar_url: string | null
  portrait_url: string | null  // 초상화 이미지 (세로형)
  profession: string | null
  title: string | null  // 수식어 (예: 테슬라 창립자, 철의 여인)
  consumption_philosophy: string | null  // 감상 철학 (3~4 문단)
  nationality: string | null  // 국적
  birth_date: string | null   // 출생연일
  death_date: string | null   // 사망연일
  bio: string | null
  quotes: string | null  // 명언/대사
  is_verified: boolean
  is_platform_managed: boolean  // claimed_by가 null이면 true (플랫폼에서 관리)
  follower_count: number
  content_count: number  // 보유 콘텐츠 수
  is_following: boolean  // 현재 유저가 팔로우 중인지
  is_follower: boolean   // 상대방이 나를 팔로우 중인지 (맞팔 = 친구)
  influence: CelebInfluence | null  // 영향력 평가 (없을 수 있음)
}

export interface CelebReview {
  id: string
  rating: number | null
  review: string
  is_spoiler: boolean
  source_url: string | null
  updated_at: string
  content: {
    id: string
    title: string
    creator: string | null
    thumbnail_url: string | null
    type: ContentType
  }
  celeb: {
    id: string
    nickname: string
    avatar_url: string | null
    profession: string | null
    is_verified: boolean
    is_platform_managed: boolean
  }
}

export interface CelebFeedResponse {
  reviews: CelebReview[]
  nextCursor: string | null
  hasMore: boolean
}

// endregion

// region: 친구 활동 관련 타입

export interface FriendActivity {
  id: string
  user: {
    id: string
    nickname: string
    avatar_url: string | null
  }
  action_type: string
  content: {
    id: string
    title: string
    thumbnail_url: string | null
    type: ContentType
  } | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface FriendActivityResponse {
  activities: FriendActivity[]
  error: string | null
}

// endregion
