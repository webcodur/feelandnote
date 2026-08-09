// 메인페이지(홈) 관련 타입 정의

import type { ContentType } from './database'
import type { CelebLevel } from '@/constants/materials'
import type { CelebTier } from '@feelandnote/shared/constants/celeb-tiers'

export type { CelebTier }

// region: 셀럽 관련 타입

export interface CelebInfluence {
  total_score: number
  level: CelebLevel
  /** 전체 중 순위 (1부터 시작) */
  ranking?: number
  /** 상위 몇 % (0~100) */
  percentile?: number
}

export interface CelebTagInfo {
  id: string
  name: string
  name_en: string | null
  color: string
  short_desc: string | null  // 태그 부여 사유 (짧은 문구)
  short_desc_en: string | null
  long_desc: string | null   // 태그 부여 상세 설명
  long_desc_en: string | null
}

export interface CelebProfile {
  id: string
  slug: string | null
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  profession: string | null
  title: string | null  // 수식어 (예: 테슬라 창립자, 철의 여인)
  title_en: string | null
  nationality: string | null  // 국적
  birth_date: string | null   // 출생연일
  death_date: string | null   // 사망연일
  bio: string | null
  bio_en: string | null
  quotes: string | null  // 명언/대사
  quotes_en: string | null
  is_verified: boolean
  is_platform_managed: boolean  // claimed_by_member_id가 null이면 true (플랫폼에서 관리)
  follower_count: number
  content_count: number  // 보유 콘텐츠 수
  is_following: boolean  // 현재 유저가 팔로우 중인지
  is_follower: boolean   // 상대방이 나를 팔로우 중인지 (맞팔 = 친구)
  influence: CelebInfluence | null  // 영향력 평가 (없을 수 있음)
  tags: CelebTagInfo[]  // 태그 목록
  greeting?: string[] | null  // 인사 대사 (3변형)
  greeting_en?: string[] | null  // 인사 대사 영문 (3변형)
  speech_tone?: string | null  // 말투 톤 (loyal, composed, bold, humble, gentle, free)
  has_voice?: boolean  // R2 음성 파일 보유 여부
  voice_v?: number  // 음성 버전 (CDN 캐시 키)
  voice_speed?: number  // 음성 재생 속도 (기본 1.0)
  celeb_tier?: CelebTier  // full: 감상 기록 보유, light: 실존 인물, fiction: 허구 인물
  /* 아래 4종은 trending 정렬로 받은 목록에만 담긴다 (조회수 안내 모달용) */
  /** 최근 기간(기본 30일) 조회수 */
  recent_views?: number | null
  /** 기록 시작부터의 누적 조회수 */
  view_count?: number | null
  /** 최근 기간 창의 첫 날짜 (YYYY-MM-DD) */
  views_window_start?: string | null
  /** 최근 기간 창의 마지막 날짜 (YYYY-MM-DD) */
  views_window_end?: string | null
}

export interface CelebReview {
  id: string
  rating: number | null
  review: string
  review_en: string | null
  is_spoiler: boolean
  source_url: string | null
  updated_at: string
  content: {
    id: string
    title: string
    creator: string | null
    thumbnail_url: string | null
    type: ContentType
    celeb_count: number
    user_count: number
    title_ko: string | null
    title_en: string | null
    creator_en: string | null
    isbn_en: string | null
    thumbnail_en: string | null
    has_en_edition: boolean | null
  }
  celeb: {
    id: string
    slug: string | null
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
