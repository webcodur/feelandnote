// User types
export interface User {
  id: string;
  email: string;
}

// ============================================================================
// POINT SYSTEM TYPES
// ============================================================================

export interface Point {
  id: string;
  user_id: string;
  content_id: string;
  label: string;
  location: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export type CreatePointDto = Omit<Point, 'id' | 'created_at' | 'updated_at'>;
export type UpdatePointDto = Partial<CreatePointDto>;

// ============================================================================
// RECORD TYPES
// ============================================================================

// Record part: PART1 (in-progress notes) or PART2 (completed reviews)
export type RecordPart = 'PART1' | 'PART2';

// Part 1 subtypes (기록 관리 - 진행 중)
export type Part1Subtype = 
  | 'MOMENT_NOTE'       // 순간 포착
  | 'PROGRESS_NOTE'     // 진행 노트
  | 'PERSONAL_REACTION'; // 개인 반응

// Part 2 subtypes (리뷰 - 완료 후)  
export type Part2Subtype = 
  | 'EXPERIENCE_SNAPSHOT'    // 경험 스냅샷
  | 'KEY_CAPTURE'            // 핵심 포착
  | 'CREATIVE_PLAYGROUND';   // 재창작 playground

export type RecordSubtype = Part1Subtype | Part2Subtype;

// Experience Snapshot metadata (경험 스냅샷)
export interface ExperienceSnapshot {
  when_where?: string;      // 언제 어디서
  with_whom?: string;       // 누구와 함께
  reason?: string;          // 계기
  emotion_curve?: string;   // 감정 곡선 (시작-중반-끝)
  summary_3lines?: string;  // 3줄 요약
}

// Creative Playground metadata (재창작 playground)
export interface CreativePlayground {
  if_scenarios?: string[];        // IF 시나리오 (다른 결말/선택지)
  virtual_casting?: string[];     // 가상 캐스팅 (다른 배우/감독)
  spin_off_ideas?: string[];      // 외전/프리퀄/속편 아이디어
  media_conversion?: string[];    // 다른 매체 전환 (소설→영화 등)
  ost_replacement?: string[];     // OST 교체/삽입
  perspective_change?: string[];  // 캐릭터 시점 바꾸기
  setting_change?: string[];      // 시대/배경 변경
  other_creative?: string[];      // 기타 창작적 상상
}

// Key Capture metadata (핵심 포착)
export interface KeyCapture {
  key_moment?: string;      // 가장 강렬했던 순간
  key_question?: string;    // 작품의 질문 vs 내 질문
  quotes?: string[];        // 선택한 인용구들
}

// Record metadata (JSONB field)
export interface RecordMetadata {
  experience_snapshot?: ExperienceSnapshot;
  creative_playground?: CreativePlayground;
  key_capture?: KeyCapture;
  [key: string]: any;  // Allow additional custom fields
}

// Main Record interface
export interface Record {
  id: string;
  user_id: string;
  content_id: string;
  
  // Legacy field (deprecated, use subtype instead)
  type: 'REVIEW' | 'NOTE' | 'QUOTE';
  
  // New structure
  part?: RecordPart;
  subtype?: RecordSubtype;
  
  // Content and metadata
  content: string;
  rating?: number;  // 0.5 - 5.0
  location?: string;  // Page number or timestamp
  is_public: boolean;
  metadata?: RecordMetadata;
  
  // Relationships
  points?: Point[];  // Related points
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// ============================================================================
// DTO TYPES
// ============================================================================

export interface CreateRecordDto {
  content_id: string;
  part: RecordPart;
  subtype: RecordSubtype;
  content: string;
  rating?: number;
  location?: string;
  is_public?: boolean;
  metadata?: RecordMetadata;
  point_ids?: string[];  // IDs of points to associate
}

export interface UpdateRecordDto {
  content?: string;
  rating?: number;
  location?: string;
  is_public?: boolean;
  metadata?: RecordMetadata;
  point_ids?: string[];
}

// ============================================================================
// CONTENT TYPES
// ============================================================================

export type ContentType = 'BOOK' | 'MOVIE' | 'GAME' | 'PERFORMANCE' | 'ART';

export interface Content {
  id: string;
  type: ContentType;
  title: string;
  creator?: string;
  thumbnail_url?: string;
  metadata?: { [key: string]: any };
  created_at: string;
}

// ============================================================================
// USER CONTENT TYPES
// ============================================================================

export type UserContentStatus = 'WISH' | 'EXPERIENCE';
export type ProgressType = 'PERCENT' | 'PAGE' | 'TIME' | 'EPISODE';

export interface UserContent {
  id: string;
  user_id: string;
  content_id: string;
  status: UserContentStatus;
  progress: number;
  progress_type: ProgressType;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ApiError {
  error: string;
  details?: any;
}
