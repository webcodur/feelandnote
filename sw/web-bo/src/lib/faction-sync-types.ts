/**
 * 팩션 ↔ 본서비스 동기화 계약 타입 — 진단(status)·출간(publish) 요청/응답.
 *
 * 설계 단일원천: docs/project/remotion/faction-db-sync.md
 * 로컬 팩션 데이터(sw/remotion/public/factions/<에피소드>/)를 본서비스 DB
 * (celeb_tags·celeb_tag_assignments)와 R2 이미지에 반영할 때 주고받는 형태만 담는다.
 * 이 파일은 fs·supabase 를 부르지 않아 클라이언트(패널 UI)에서도 그대로 읽는다.
 */

/* ── 진단(status) ── */

/** 인물의 본서비스 프로필 연결 상태 — linked=DB에 있음, missing=키는 있으나 DB에 없음, unkeyed=celebId·slug 둘 다 없음 */
export type FactionSyncProfileState = 'linked' | 'missing' | 'unkeyed'

/** 소개문 상태 — db=DB에 이미 있음(덮지 않음), fillable=로컬 값으로 채울 수 있음, none=양쪽 다 없음 */
export type FactionSyncDescState = 'db' | 'fillable' | 'none'

/**
 * 개인샷 상태.
 * - synced: 로컬 파일 해시가 매니페스트 기록과 같고 DB에도 주소가 있다
 * - stale: 로컬 파일이 바뀌었다(또는 아직 기록이 없다)
 * - local-only: 로컬 파일만 있고 DB 주소가 없다
 * - db-only: DB 주소만 있고 올릴 로컬 파일이 없다(외부 URL 지정분 포함)
 * - none: 양쪽 다 없다
 */
export type FactionSyncSoloShotState = 'synced' | 'stale' | 'local-only' | 'db-only' | 'none'

export interface FactionSyncPerson {
  /** 인물 이름(로컬 데이터 기준) */
  name: string
  celebId?: string
  slug?: string
  /** 신화·전설·허구 인물 */
  mythical?: boolean
  profile: FactionSyncProfileState
  /** 이 태그에 배정된 행이 DB에 있는지 */
  assigned: boolean
  desc: FactionSyncDescState
  soloShot: FactionSyncSoloShotState
  /** profiles.avatar_url 존재 여부 */
  avatar: boolean
  /** profiles.celeb_tier 값 — mythical 대조용 */
  tier?: string
}

export interface FactionSyncGroup {
  /** groups[] 인덱스 — 출간 요청의 groupIndex 와 같은 값 */
  index: number
  /** 세력 명칭 첫 줄 */
  name: string
  /** celeb_tags.slug 연결 키. null 이면 미지정(출간 불가) */
  tagSlug: string | null
  /** 세력 폴더(NN-<slug>)에서 뽑은 제안 슬러그 */
  suggestedSlug: string
  tag: {
    exists: boolean
    id?: string
    name?: string
    isFeatured?: boolean
    teamImagesCount: number
  }
  /**
   * 그룹샷 — local=이 세력의 로컬 파일 수, matched=매니페스트 해시가 일치하는 수,
   * tagTotal=이 태그를 나눠 쓰는 세력들의 로컬 파일 합(태그의 team_images 는 이 수만큼이 된다).
   */
  teamShots: { local: number; matched: number; tagTotal: number }
  people: FactionSyncPerson[]
}

export interface FactionSyncStatus {
  episode: string
  groups: FactionSyncGroup[]
  summary: {
    groups: number
    /** tagSlug 미지정 세력 수 */
    groupsUnlinked: number
    people: number
    /** 프로필이 연결돼 출간 가능한 인물 수 */
    publishable: number
    /** 프로필이 없어 출간 불가인 인물 수 */
    blocked: number
    /** 아직 DB에 배정되지 않은 인물 수 */
    unassigned: number
    /** 로컬 값으로 소개문을 채울 수 있는 인물 수 */
    descFillable: number
    /** 올릴 개인샷 수(stale·local-only) */
    soloShotPending: number
    /** 올릴 그룹샷 수 */
    teamShotPending: number
  }
}

/* ── 출간(publish) ── */

/** 출간 범위 — 켠 항목만 실행한다. 전부 미지정이면 전 항목 실행 */
export interface FactionPublishScope {
  /** celeb_tags 행 생성·채움 */
  tag?: boolean
  /** celeb_tag_assignments 행 생성 + sort_order 재기록 */
  assignments?: boolean
  /** 배정 소개문(short/long_desc·en) 채움 */
  descs?: boolean
  /** 개인샷 업로드 + spotlight_image_url 갱신 */
  personImages?: boolean
  /** 그룹샷 업로드 + team_images 재구성 */
  teamImages?: boolean
}

export interface FactionPublishRequest {
  episode: string
  /** 미지정이면 전체 세력 */
  groupIndex?: number
  scope?: FactionPublishScope
  /** true면 쓰기 직전까지 동일 계산 후 변경 예정 목록만 반환 */
  dryRun?: boolean
  /** true면 채움 전용 텍스트도 덮어쓴다 */
  force?: boolean
}

export type FactionPublishKind = 'tag' | 'assignment' | 'soloShot' | 'teamShots' | 'revalidate'

export type FactionPublishAction = 'created' | 'updated' | 'skipped' | 'blocked'

export interface FactionPublishItem {
  kind: FactionPublishKind
  /** 세력 명칭 첫 줄 (revalidate 는 '-') */
  group: string
  person?: string
  action: FactionPublishAction
  /** skipped·blocked 사유 (예 'profile-missing', 'external-url', 'unchanged') */
  reason?: string
}

export interface FactionPublishResult {
  episode: string
  dryRun: boolean
  force: boolean
  items: FactionPublishItem[]
  summary: { created: number; updated: number; skipped: number; blocked: number }
  /**
   * 새로 만든 태그 슬러그 목록 — web 상수(constants/factionGroups.ts)의 상위 그룹에
   * 손으로 넣어야 화면에 묶여 나온다는 안내용.
   */
  constantHint?: string[]
  /** 캐시 무효화 실패·환경변수 누락 등 조용히 넘기지 않고 알려야 하는 사항 */
  warnings?: string[]
}

/* ── 별칭 ── */
// 출간 패널(components/faction/FactionPublishPanel.tsx)이 FactionSync* 접두사로 부른다.
// 같은 타입을 두 벌 두지 않도록 이름만 잇는다.
export type FactionSyncGroupStatus = FactionSyncGroup
export type FactionSyncPersonStatus = FactionSyncPerson
export type FactionSyncPublishRequest = FactionPublishRequest
export type FactionSyncPublishResponse = FactionPublishResult
export type FactionSyncResultItem = FactionPublishItem
