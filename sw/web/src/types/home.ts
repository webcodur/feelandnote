// 메인페이지(홈) 관련 타입 정의

import type { ContentType } from './database'

// region: 셀럽 관련 타입

export interface CelebProfile {
  id: string
  nickname: string
  avatar_url: string | null
  category: string | null
  bio: string | null
  is_verified: boolean
  follower_count: number
}

export interface CelebReview {
  id: string
  rating: number | null
  review: string
  is_spoiler: boolean
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
    is_verified: boolean
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
