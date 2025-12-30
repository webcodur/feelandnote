// Supabase 데이터베이스 타입 정의

// ===== Enums =====
// NOTE: @/constants/categories.ts의 CATEGORIES와 동기화 필요
export type ContentType = 'BOOK' | 'VIDEO' | 'GAME' | 'MUSIC' | 'CERTIFICATE'
export type ContentStatus = 'WISH' | 'EXPERIENCE' | 'COMPLETE'
export type ProgressType = 'PERCENT' | 'PAGE' | 'TIME'
export type RecordType = 'REVIEW' | 'NOTE' | 'QUOTE'
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
  category: string | null
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
  progress: number | null
  progress_type: ProgressType | null
  folder_id: string | null
  contributor_id: string | null
  created_at: string
  updated_at: string
}

export interface ContentRecord {
  id: string
  user_id: string
  content_id: string
  type: RecordType
  content: string
  rating: number | null
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

// ===== Phase 5: Folder & Playlist Tables =====
export interface Folder {
  id: string
  user_id: string
  name: string
  content_type: ContentType
  sort_order: number
  created_at: string
}

export interface FolderWithCount extends Folder {
  content_count: number
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
  folder?: Folder | null
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
