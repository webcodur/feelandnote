// Supabase 데이터베이스 타입 정의

// ===== Enums (공유 패키지에서 import 후 re-export) =====
import type { ContentType, ContentStatus } from '@feelandnote/shared/types'
export type { ContentType, ContentStatus }
export type RecordType = 'NOTE' | 'QUOTE'
export type VisibilityType = 'public' | 'followers' | 'private'
type ProfileType = 'USER' | 'CELEB'

// ===== Phase 1: Core Tables =====
export interface Profile {
  id: string
  email: string | null
  nickname: string | null
  avatar_url: string | null
  profile_type: ProfileType
  claimed_by: string | null
  is_verified: boolean
  bio: string | null
  profession: string | null
  title: string | null  // 셀럽 수식어 (예: 테슬라 창립자, 철의 여인)
  created_at: string
}

export interface Content {
  id: string
  external_id: string | null
  type: ContentType
  subtype: string | null
  genre: string | null
  release_date: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  // content_locales에서 resolve된 필드 (DB contents 테이블에는 없음)
  title: string
  creator: string | null
  thumbnail_url: string | null
  description: string | null
  publisher: string | null
}

// ===== Flow 시스템 (3단 위계: Flow > Stage > Node) =====
export interface Flow {
  id: string
  user_id: string
  name: string
  description: string | null
  cover_url: string | null
  theme_colors: { primary: string; secondary: string } | null
  difficulty: number | null  // 1~5
  estimated_duration: number | null  // 분 단위
  is_public: boolean
  completion_message: string | null
  has_tiers: boolean
  tiers: Record<string, string[]> | null
  created_at: string
  updated_at: string
}

export interface FlowStage {
  id: string
  flow_id: string
  name: string
  description: string | null
  sort_order: number
  badge_title: string | null
  badge_icon: string | null
  theme_color: string | null
  created_at: string | null
}

export interface FlowNode {
  id: string
  flow_id: string
  stage_id: string | null
  content_id: string
  description: string | null
  sort_order: number
  difficulty: number | null  // 1~5
  is_optional: boolean
  bonus_content_ids: string[] | null
  theme_color: string | null
}

// ===== 조인된 타입들 =====
// Flow 조인 타입들
export interface FlowNodeWithContent extends FlowNode {
  content: Content
}

export interface FlowStageWithNodes extends FlowStage {
  nodes: FlowNodeWithContent[]
}

export interface FlowWithStages extends Flow {
  stages: FlowStageWithNodes[]
  node_count: number
}

export interface FlowSummary extends Flow {
  node_count: number
  stage_count: number
  stages?: { nodes?: { content: { thumbnail_url: string | null } }[] }[]
}

export interface FlowOwner {
  id: string
  nickname: string | null
  avatar_url: string | null
}

export interface SavedFlowWithDetails {
  id: string
  saved_at: string
  flow: FlowSummary & { owner: FlowOwner }
}

// ===== Guestbook =====
interface GuestbookEntry {
  id: string
  profile_id: string
  author_id: string
  content: string
  is_private: boolean
  created_at: string
  updated_at: string
}

export interface GuestbookEntryWithAuthor extends GuestbookEntry {
  author: Profile
}

// ===== Activity Log =====
export type ActivityActionType =
  | 'CONTENT_ADD' | 'CONTENT_REMOVE'
  | 'STATUS_CHANGE' | 'PROGRESS_CHANGE' // PROGRESS_CHANGE는 레거시 (STATUS_CHANGE로 대체됨)
  | 'REVIEW_UPDATE'
  | 'RECORD_CREATE' | 'RECORD_UPDATE' | 'RECORD_DELETE'

export type ActivityTargetType = 'content' | 'record'

// ===== Board: Notices =====
interface Notice {
  id: string
  author_id: string
  title: string
  content: string
  is_pinned: boolean
  view_count: number
  created_at: string
  updated_at: string
}

export interface NoticeWithAuthor extends Notice {
  author: Pick<Profile, 'id' | 'nickname' | 'avatar_url'>
  comment_count?: number
}

// ===== Board: Feedbacks =====
export type FeedbackCategory = 'CELEB_REQUEST' | 'CONTENT_REPORT' | 'FEATURE_SUGGESTION'
export type FeedbackStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'

interface Feedback {
  id: string
  author_id: string
  category: FeedbackCategory
  title: string
  content: string
  status: FeedbackStatus
  admin_comment: string | null
  resolved_by: string | null
  resolved_at: string | null
  view_count: number
  created_at: string
  updated_at: string
}

export interface FeedbackWithAuthor extends Feedback {
  author: Pick<Profile, 'id' | 'nickname' | 'avatar_url'>
  comment_count?: number
}

export interface FeedbackWithDetails extends FeedbackWithAuthor {
  resolver: Pick<Profile, 'id' | 'nickname' | 'avatar_url'> | null
}

// ===== Board: Comments =====
export type BoardType = 'NOTICE' | 'FEEDBACK'

interface BoardComment {
  id: string
  board_type: BoardType
  post_id: string
  author_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface BoardCommentWithAuthor extends BoardComment {
  author: Pick<Profile, 'id' | 'nickname' | 'avatar_url'>
}
