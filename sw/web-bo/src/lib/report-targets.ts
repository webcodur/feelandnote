import {
  ENUM_REPORT_TARGET_TYPE,
  type ReportTargetType,
} from '@/constants/moderation'

// 신고 대상 종류별 원문 저장소 규격.
// 26.07.30 PostgREST 스키마 실측 결과다. 실제로 있는 컬럼만 적었고 없는 컬럼은 가정하지 않는다.
// 한 종류가 여러 표에 걸치는 경우(댓글·감상 기록)는 배열 순서대로 찾아보고 처음 걸린 표를 채택한다.

// #region 타입
export type TargetTextKey = 'title' | 'nickname' | 'content' | 'bio' | 'review' | 'metadata'

export type TargetAuthorKey =
  | 'author_id'
  | 'author_member_id'
  | 'user_id'
  | 'member_id'
  | 'profile_id'
  | 'id'

// 숨김 수단. 'none' 은 그 표에 숨김 컬럼이 없다는 실측 결과다.
export type TargetHideMode = 'is_deleted' | 'visibility' | 'is_private' | 'none'

export interface TargetRow {
  id?: string | null
  title?: string | null
  nickname?: string | null
  content?: string | null
  bio?: string | null
  review?: string | null
  metadata?: { title?: string | null } | null
  author_id?: string | null
  author_member_id?: string | null
  user_id?: string | null
  member_id?: string | null
  profile_id?: string | null
  created_at?: string | null
  is_deleted?: boolean | null
  is_private?: boolean | null
  is_anonymous?: boolean | null
  visibility?: string | null
  status?: string | null
  type?: string | null
}

export interface ReportTargetSpec {
  table: string
  tableLabel: string
  idType: 'uuid' | 'text'
  selectColumns: string
  titleKey?: TargetTextKey
  bodyKey?: TargetTextKey
  authorKey?: TargetAuthorKey
  hideMode: TargetHideMode
  // 숨김 버튼 문구. hideMode 가 'none' 이면 null 이다.
  hideLabel: string | null
  restoreLabel: string | null
  deletable: boolean
  // 삭제를 막았다면 그 이유. 화면에 그대로 띄운다.
  deleteBlockedReason?: string
  adminHref?: (id: string) => string
}
// #endregion

// #region 대상 종류별 규격
const PROFILE_SPEC: ReportTargetSpec = {
  table: 'member_profiles',
  tableLabel: '사용자 프로필',
  idType: 'uuid',
  selectColumns: 'id, nickname, bio, created_at',
  titleKey: 'nickname',
  bodyKey: 'bio',
  authorKey: 'id',
  hideMode: 'none',
  hideLabel: null,
  restoreLabel: null,
  deletable: false,
  deleteBlockedReason: '사용자 계정은 지우지 않는다. 아래 계정 제재로 처리한다.',
  adminHref: (id) => `/users/${id}`,
}

const FREE_POST_SPEC: ReportTargetSpec = {
  table: 'free_posts',
  tableLabel: '자유게시판 글',
  idType: 'uuid',
  selectColumns: 'id, title, content, author_id, nickname, is_anonymous, is_deleted, created_at',
  titleKey: 'title',
  bodyKey: 'content',
  authorKey: 'author_id',
  hideMode: 'is_deleted',
  hideLabel: '글 숨기기',
  restoreLabel: '글 다시 보이기',
  deletable: true,
  adminHref: () => '/free-board?tab=posts',
}

const FREE_COMMENT_SPEC: ReportTargetSpec = {
  table: 'free_post_comments',
  tableLabel: '자유게시판 댓글',
  idType: 'uuid',
  selectColumns: 'id, content, author_id, nickname, is_anonymous, is_deleted, created_at',
  bodyKey: 'content',
  authorKey: 'author_id',
  hideMode: 'is_deleted',
  hideLabel: '댓글 숨기기',
  restoreLabel: '댓글 다시 보이기',
  deletable: true,
  adminHref: () => '/free-board?tab=comments',
}

const RECORD_COMMENT_SPEC: ReportTargetSpec = {
  table: 'record_comments',
  tableLabel: '감상 기록 댓글',
  idType: 'uuid',
  selectColumns: 'id, content, user_id, created_at',
  bodyKey: 'content',
  authorKey: 'user_id',
  hideMode: 'none',
  hideLabel: null,
  restoreLabel: null,
  deletable: true,
}

const BOARD_COMMENT_SPEC: ReportTargetSpec = {
  table: 'board_comments',
  tableLabel: '공지·의견 댓글',
  idType: 'uuid',
  selectColumns: 'id, content, author_id, created_at',
  bodyKey: 'content',
  authorKey: 'author_id',
  hideMode: 'none',
  hideLabel: null,
  restoreLabel: null,
  deletable: true,
}

const MEMBER_GUESTBOOK_SPEC: ReportTargetSpec = {
  table: 'member_guestbook_entries',
  tableLabel: '방명록',
  idType: 'uuid',
  selectColumns: 'id, content, author_member_id, owner_member_id, is_private, created_at',
  bodyKey: 'content',
  authorKey: 'author_member_id',
  hideMode: 'is_private',
  hideLabel: '나에게만 보이게',
  restoreLabel: '다시 공개',
  deletable: true,
  adminHref: () => '/guestbooks',
}

const CELEB_GUESTBOOK_SPEC: ReportTargetSpec = {
  table: 'celeb_guestbook_entries',
  tableLabel: '인물 방명록',
  idType: 'uuid',
  selectColumns: 'id, content, author_member_id, celeb_id, is_private, created_at',
  bodyKey: 'content',
  authorKey: 'author_member_id',
  hideMode: 'is_private',
  hideLabel: '남에게 안 보이게',
  restoreLabel: '다시 공개',
  deletable: true,
  adminHref: () => '/guestbooks',
}

const FEEDBACK_SPEC: ReportTargetSpec = {
  table: 'feedbacks',
  tableLabel: '의견 게시판 글',
  idType: 'uuid',
  selectColumns: 'id, title, content, author_id, status, created_at',
  titleKey: 'title',
  bodyKey: 'content',
  authorKey: 'author_id',
  hideMode: 'none',
  hideLabel: null,
  restoreLabel: null,
  deletable: true,
}

const RECORD_SPEC: ReportTargetSpec = {
  table: 'records',
  tableLabel: '감상 기록(노트·인용)',
  idType: 'uuid',
  selectColumns: 'id, content, user_id, type, visibility, created_at',
  bodyKey: 'content',
  authorKey: 'user_id',
  hideMode: 'visibility',
  hideLabel: '작성자만 보게',
  restoreLabel: '다시 공개',
  deletable: true,
  adminHref: (id) => `/records/${id}`,
}

const USER_CONTENT_SPEC: ReportTargetSpec = {
  table: 'member_contents',
  tableLabel: '콘텐츠 감상문',
  idType: 'uuid',
  selectColumns: 'id, review, member_id, visibility, status, created_at',
  bodyKey: 'review',
  authorKey: 'member_id',
  hideMode: 'visibility',
  hideLabel: '작성자만 보게',
  restoreLabel: '다시 공개',
  deletable: true,
}

const CONTENT_SPEC: ReportTargetSpec = {
  table: 'contents',
  tableLabel: '서비스 콘텐츠',
  idType: 'text',
  selectColumns: 'id, type, metadata, created_at',
  titleKey: 'metadata',
  hideMode: 'none',
  hideLabel: null,
  restoreLabel: null,
  deletable: false,
  deleteBlockedReason:
    '이 항목은 모든 사용자가 함께 쓰는 목록이라 이 화면에서 지우지 않는다. 콘텐츠 상세에서 판단한다.',
  adminHref: (id) => `/contents/${encodeURIComponent(id)}`,
}

export const REPORT_TARGET_SPECS: Record<ReportTargetType, readonly ReportTargetSpec[]> = {
  [ENUM_REPORT_TARGET_TYPE.USER]: [PROFILE_SPEC],
  [ENUM_REPORT_TARGET_TYPE.POST]: [FREE_POST_SPEC],
  [ENUM_REPORT_TARGET_TYPE.COMMENT]: [FREE_COMMENT_SPEC, RECORD_COMMENT_SPEC, BOARD_COMMENT_SPEC],
  [ENUM_REPORT_TARGET_TYPE.GUESTBOOK]: [MEMBER_GUESTBOOK_SPEC, CELEB_GUESTBOOK_SPEC],
  [ENUM_REPORT_TARGET_TYPE.FEEDBACK]: [FEEDBACK_SPEC],
  [ENUM_REPORT_TARGET_TYPE.RECORD]: [RECORD_SPEC, USER_CONTENT_SPEC],
  [ENUM_REPORT_TARGET_TYPE.CONTENT]: [CONTENT_SPEC],
}
// #endregion

// #region 읽기 도우미
// 같은 번호가 다른 종류에서도 쓰일 수 있으므로 종류까지 묶어 한 대상을 가리키는 열쇠를 만든다.
export function reportTargetKey(targetType: string, targetId: string): string {
  return `${targetType}:${targetId}`
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function matchesIdType(spec: ReportTargetSpec, targetId: string): boolean {
  return spec.idType === 'text' || UUID_PATTERN.test(targetId)
}

export function readTargetText(row: TargetRow, key?: TargetTextKey): string | null {
  if (!key) return null
  if (key === 'metadata') {
    const title = row.metadata?.title
    return typeof title === 'string' && title.length > 0 ? title : null
  }
  const value = row[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function readTargetAuthor(row: TargetRow, key?: TargetAuthorKey): string | null {
  if (!key) return null
  const value = row[key]
  return typeof value === 'string' && value.length > 0 ? value : null
}

// 지금 숨겨져 있는가. 숨김 수단이 없는 표는 항상 false 다.
export function readTargetHidden(row: TargetRow, mode: TargetHideMode): boolean {
  if (mode === 'is_deleted') return row.is_deleted === true
  if (mode === 'is_private') return row.is_private === true
  if (mode === 'visibility') return row.visibility === 'private'
  return false
}
// #endregion
