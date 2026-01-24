// Supabase 데이터베이스 타입 정의

// ===== Enums (공유 패키지에서 import 후 re-export) =====
import type { ContentType, ContentStatus } from '@feelnnote/shared/types'
export type { ContentType, ContentStatus }
export type RecordType = 'NOTE' | 'QUOTE'
export type VisibilityType = 'public' | 'followers' | 'private'
export type ScoreType = 'activity' | 'title'
export type TitleCategory = 'volume' | 'diversity' | 'consistency' | 'depth' | 'social' | 'special'
export type TitleGrade = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
export type TierListType = 'all' | 'category' | 'genre' | 'year' | 'custom'
export type ProfileType = 'USER' | 'CELEB'

// ===== Phase 1: Core Tables =====
export interface Profile {
  id: string
  email: string | null
  nickname: string | null
  avatar_url: string | null
  gemini_api_key: string | null
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
  type: ContentType
  subtype: string | null
  genre: string | null
  title: string
  creator: string | null
  thumbnail_url: string | null
  description: string | null
  publisher: string | null
  release_date: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface UserContent {
  id: string
  user_id: string
  content_id: string
  status: ContentStatus
  contributor_id: string | null
  is_recommended: boolean | null
  rating: number | null
  review: string | null
  visibility: VisibilityType | null
  created_at: string
  updated_at: string
  completed_at: string | null
  is_pinned: boolean | null
  pinned_at: string | null
}

export interface ContentRecord {
  id: string
  user_id: string
  content_id: string
  type: RecordType
  content: string
  location: string | null
  visibility: VisibilityType | null
  contributor_id: string | null
  source_url: string | null
  created_at: string
  updated_at: string
}

// ===== Phase 3: Social Tables =====
export interface Follow {
  id: string
  follower_id: string
  following_id: string
  created_at: string | null
}

export interface Block {
  id: string
  blocker_id: string
  blocked_id: string
  created_at: string | null
}

export interface UserSocial {
  user_id: string
  follower_count: number | null
  following_count: number | null
  friend_count: number | null
  influence: number | null
  updated_at: string | null
}

export interface RecordLike {
  id: string
  record_id: string
  user_id: string
  created_at: string | null
}

export interface RecordComment {
  id: string
  record_id: string
  user_id: string
  content: string
  created_at: string | null
  updated_at: string | null
}

// ===== Phase 4: Gamification Tables =====
export interface UserScore {
  user_id: string
  activity_score: number | null
  title_bonus: number | null
  total_score: number | null
  updated_at: string | null
}

export interface ScoreLog {
  id: string
  user_id: string
  type: ScoreType
  action: string
  amount: number
  reference_id: string | null
  created_at: string | null
}

export interface Title {
  id: string
  name: string
  description: string
  category: TitleCategory
  grade: TitleGrade
  bonus_score: number
  condition: Record<string, unknown>
  sort_order: number | null
}

export interface UserTitle {
  id: string
  user_id: string
  title_id: string
  unlocked_at: string | null
}

export interface TierList {
  id: string
  user_id: string
  name: string
  type: TierListType
  filter_value: string | null
  tiers: Record<string, string[]>
  unranked: string[] | null
  is_public: boolean | null
  created_at: string | null
  updated_at: string | null
}

export interface BlindGameScore {
  id: string
  user_id: string
  score: number
  streak: number
  played_at: string | null
}


export interface Playlist {
  id: string
  user_id: string
  name: string
  description: string | null
  cover_url: string | null
  content_type: ContentType | null  // null = 혼합
  is_public: boolean
  has_tiers: boolean
  tiers: Record<string, string[]>  // { "S": ["id1"], "A": [...] }
  created_at: string
  updated_at: string
}

export interface PlaylistItem {
  id: string
  playlist_id: string
  content_id: string
  sort_order: number
  added_at: string
}

// ===== 조인된 타입들 =====
export interface UserContentWithContent extends UserContent {
  content: Content
}

export interface ContributorInfo {
  id: string
  nickname: string | null
  avatar_url: string | null
}

export interface RecordWithContent extends Omit<ContentRecord, 'content'> {
  text: string // records.content를 text로 재명명
  contentData: Content | null // 조인된 contents 테이블 데이터
  contributor: ContributorInfo | null // 기여자 정보 (셀럽 기록인 경우)
}

export interface RecordWithUser extends ContentRecord {
  user: Profile
  contentData: Content
}

export interface FollowWithProfile extends Follow {
  follower: Profile
  following: Profile
}

export interface TitleWithUnlock extends Title {
  user_titles: UserTitle[] | null
}

export interface PlaylistItemWithContent extends PlaylistItem {
  content: Content
}

export interface PlaylistWithItems extends Playlist {
  items: PlaylistItemWithContent[]
  item_count: number
}

export interface PlaylistSummary extends Playlist {
  item_count: number
}

export interface SavedPlaylist {
  id: string
  user_id: string
  playlist_id: string
  saved_at: string
}

export interface PlaylistOwner {
  id: string
  nickname: string | null
  avatar_url: string | null
}

export interface SavedPlaylistWithDetails {
  id: string
  saved_at: string
  playlist: PlaylistSummary & { owner: PlaylistOwner }
}

export interface RecordCommentWithUser extends RecordComment {
  user: Profile
}

// ===== API 응답 타입 =====
export interface PaginatedResponse<T> {
  items: T[]
  nextCursor: string | null
  total?: number
}

// ===== 메타데이터 타입 =====
export interface BookMetadata {
  isbn?: string
  pageCount?: number
  categoryName?: string
}

export interface MovieMetadata {
  runtime?: number
  genres?: string[]
  cast?: string[]
  overview?: string
}

// ===== 칭호 조건 타입 =====
export interface TitleCondition {
  type: 'content_count' | 'record_count' | 'follower_count' | 'following_count' | 'friend_count'
  value: number
}

// ===== Guestbook =====
export interface GuestbookEntry {
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

export interface ActivityLog {
  id: string
  user_id: string
  action_type: ActivityActionType
  target_type: ActivityTargetType
  target_id: string
  content_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface ActivityLogWithContent extends ActivityLog {
  content: Pick<Content, 'id' | 'title' | 'thumbnail_url' | 'type'> | null
}

// ===== Board: Notices =====
export interface Notice {
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
}

// ===== Board: Feedbacks =====
export type FeedbackCategory = 'CELEB_REQUEST' | 'CONTENT_REPORT' | 'FEATURE_SUGGESTION'
export type FeedbackStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'

export interface Feedback {
  id: string
  author_id: string
  category: FeedbackCategory
  title: string
  content: string
  status: FeedbackStatus
  admin_comment: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface FeedbackWithAuthor extends Feedback {
  author: Pick<Profile, 'id' | 'nickname' | 'avatar_url'>
}

export interface FeedbackWithDetails extends FeedbackWithAuthor {
  resolver: Pick<Profile, 'id' | 'nickname' | 'avatar_url'> | null
}
