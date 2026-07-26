/**
 * 세력도 출간 계약 타입 — 진단(diagnose)·출간(publish) 요청/응답.
 *
 * 설계 단일원천: docs/project/remotion/faction-unification.md §4(경계)·§9(개조 방향)
 *
 * 제작 데이터(faction_* 5테이블)를 서비스 세력도감(celeb_tags·celeb_tag_assignments + R2 이미지)으로
 * **단방향·채움 전용** 투영할 때 주고받는 형태만 담는다. fs·supabase 를 부르지 않아
 * 클라이언트(출간 패널)에서도 그대로 읽는다.
 *
 * ## 옛 계약과 달라진 점
 *
 * 제작과 서비스가 **같은 DB 안에** 있게 되면서 텍스트 대조 진단이 사라졌다. 예전에는 로컬 JSON 과
 * DB 를 견주어 "소개문을 채울 수 있는가"를 세었지만, 지금은 한 집이라 견줄 상대가 없다.
 * 남는 진단은 여섯이다 — ① 셀럽 미해소 인물 ② 태그 미지정 세력 ③ 사진 저장소 동기 상태
 * ④ 아바타 유무 ⑤ 신화 표시와 셀럽 등급(fiction) 어긋남 ⑥ 대사 목소리 ↔ 셀럽 국문 목소리 대조.
 */

/* ── 진단 ── */

/**
 * 인물의 셀럽 연결 상태.
 * - linked: `faction_people.celeb_id` 가 채워져 있다(출간 가능)
 * - unresolved: 연결 키(slug)는 있는데 그 셀럽이 DB 에 없다 → celeb 파이프라인으로 먼저 등록
 * - unkeyed: 연결 키조차 없다 → 데이터 보완 필요
 */
export type FactionSyncLinkState = 'linked' | 'unresolved' | 'unkeyed'

/**
 * 개인샷 저장소 동기 상태.
 * - synced: 로컬 파일 해시가 매니페스트 기록과 같고 서비스에도 주소가 있다
 * - stale: 로컬 파일이 바뀌었다(또는 아직 올린 기록이 없다)
 * - local-only: 로컬 파일만 있고 서비스에 주소가 없다
 * - db-only: 서비스에 주소만 있고 올릴 로컬 파일이 없다(외부 주소 지정분 포함)
 * - none: 양쪽 다 없다
 */
export type FactionSyncSoloShotState = 'synced' | 'stale' | 'local-only' | 'db-only' | 'none'

/**
 * 목소리 언어 — 셀럽 프로필이 국문·영문 목소리를 따로 들고 있어(`voice_id_ko`·`voice_id_en`)
 * 제작 데이터도 언어마다 따로 지정한다.
 */
export type FactionVoiceLocale = 'ko' | 'en'

/** 언어별 제작 데이터 ↔ 셀럽 프로필 칸 대응 — 진단·상속이 같은 표를 본다 */
export const FACTION_VOICE_FIELDS: Record<FactionVoiceLocale, { person: string; personEngine: string; profile: string; label: string }> = {
  ko: { person: 'quoteElevenlabsVoiceId', personEngine: 'quoteEngine', profile: 'voice_id_ko', label: '국문' },
  en: { person: 'quoteElevenlabsVoiceIdEn', personEngine: 'quoteEngineEn', profile: 'voice_id_en', label: '영문' },
}

/**
 * 대사 목소리 대조 상태 — 제작 데이터의 대사 목소리와 셀럽 프로필의 같은 언어 목소리를 견준 결과.
 * **셀럽이 이어진 인물만** 값이 있다.
 *
 * - same: 두 쪽이 같은 목소리다
 * - different: 서로 다른 목소리다 — 어느 쪽이 맞는지는 사람이 정한다
 * - person-only: 제작 데이터에만 있다(셀럽 프로필이 비었다 — 인물 화면의 「DB에 저장」으로 올릴 수 있다)
 * - profile-only: 셀럽 프로필에만 있다 — 일괄 상속의 대상이다
 * - both-empty: 양쪽 다 비었다
 *
 * 어느 상태든 **출간을 막지 않는다.** 알리기만 한다.
 */
export type FactionSyncVoiceState = 'same' | 'different' | 'person-only' | 'profile-only' | 'both-empty'

/** 한 인물의 언어별 목소리 대조 결과 */
export type FactionSyncVoicePair = Record<FactionVoiceLocale, FactionSyncVoiceState>

export interface FactionSyncPerson {
  /** faction_people.id — 인물 단위 액션(개인샷 아바타 승격)이 가리키는 대상 */
  id: string
  name: string
  /** 연결 키 */
  slug?: string
  /** 해소된 셀럽 id — null 이면 미해소 */
  celebId: string | null
  /** 신화·전설·허구 인물 표시 */
  mythical: boolean
  link: FactionSyncLinkState
  /** 이 태그에 배정된 행이 이미 있는지 */
  assigned: boolean
  soloShot: FactionSyncSoloShotState
  /** profiles.avatar_url 존재 여부 */
  avatar: boolean
  /** profiles.celeb_tier */
  tier?: string
  /**
   * 신화 표시와 셀럽 등급이 어긋남 — 제작 데이터는 신화라는데 셀럽 등급이 fiction 이 아니거나 그 반대.
   * 어느 쪽이 맞는지는 사람이 판단한다(출간을 막지는 않는다).
   */
  tierMismatch: boolean
  /** 대사 목소리 대조(국문·영문 각각) — 셀럽이 이어진 인물만 값이 있다(미해소 인물은 견줄 상대가 없다) */
  voice?: FactionSyncVoicePair
}

export interface FactionSyncGroup {
  /** groups[] 인덱스(= position - 1). 출간 요청의 groupIndex 와 같은 값 */
  index: number
  /** faction_groups.position — 음성 파일명 F{position:02d} 의 그 번호 */
  position: number
  /** 세력 명칭 첫 줄 */
  name: string
  /** 해소된 태그 id — null 이면 미지정(출간 불가) */
  tagId: string | null
  /** 데이터에 적힌 태그 연결 키(celeb_tags.slug). null 이면 미지정 */
  tagSlug: string | null
  /** 세력 폴더(NN-<slug>)에서 뽑은 제안 연결 키 */
  suggestedSlug: string
  tag: {
    exists: boolean
    id?: string
    name?: string
    /** 도감에 노출 중인지 — 사람이 정하는 값이라 출간이 건드리지 않는다 */
    isFeatured?: boolean
    teamImagesCount: number
  }
  /**
   * 그룹샷 — local=이 세력의 로컬 파일 수, synced=매니페스트 기록이 일치하는 수,
   * tagTotal=같은 태그를 나눠 쓰는 세력들의 로컬 파일 합(도감에 실리는 장수).
   */
  teamShots: { local: number; synced: number; tagTotal: number }
  people: FactionSyncPerson[]
}

export interface FactionSyncStatus {
  /** 에피소드 폴더명 */
  folder: string
  groups: FactionSyncGroup[]
  summary: {
    groups: number
    /** 태그가 해소되지 않은 세력 수 */
    groupsUnlinked: number
    people: number
    /** 셀럽이 연결돼 출간 가능한 인물 수 */
    publishable: number
    /** 셀럽 미해소로 출간 불가인 인물 수 */
    blocked: number
    /** 연결됐으나 아직 배정되지 않은 인물 수 */
    unassigned: number
    /** 올릴 개인샷 수(stale·local-only) */
    soloShotPending: number
    /** 올릴 그룹샷 수 */
    teamShotPending: number
    /** 얼굴 사진(아바타)이 없는 연결 인물 수 */
    avatarMissing: number
    /** 신화 표시와 셀럽 등급이 어긋난 인물 수 */
    tierMismatch: number
    /** 대사 목소리가 셀럽 목소리와 다른 인물 수 — 언어별 */
    voiceDifferent: Record<FactionVoiceLocale, number>
    /** 대사 목소리가 비었고 셀럽 목소리는 있는 인물 수 — 언어별. 일괄 상속으로 채울 수 있는 인원 */
    voiceFillable: Record<FactionVoiceLocale, number>
  }
}

/* ── 출간 ── */

/** 출간 범위 — 켠 항목만 실행한다. 전부 미지정이면 전 항목 실행 */
export interface FactionPublishScope {
  /** celeb_tags 행 생성·채움 + faction_groups.tag_id 연결 */
  tag?: boolean
  /** celeb_tag_assignments 행 생성 + sort_order 재기록 */
  assignments?: boolean
  /**
   * 배정에 딸린 글 — 소개문(short/long_desc·en)은 채움 전용,
   * 인물 대사(quote·quote_en)는 제작 데이터가 유일한 출처라 항상 되쓴다.
   */
  descs?: boolean
  /** 개인샷 업로드 + spotlight_image_url 갱신 */
  personImages?: boolean
  /** 그룹샷 업로드 + team_images 재구성 */
  teamImages?: boolean
}

export interface FactionPublishRequest {
  /** 에피소드 폴더명 */
  folder: string
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
  /** 세력 명칭 첫 줄 (웹 캐시 항목은 '-') */
  group: string
  person?: string
  action: FactionPublishAction
  /** skipped·blocked 사유 (예 'celeb-unresolved', 'external-url', 'unchanged') */
  reason?: string
}

export interface FactionPublishResult {
  folder: string
  dryRun: boolean
  force: boolean
  items: FactionPublishItem[]
  summary: { created: number; updated: number; skipped: number; blocked: number }
  /**
   * 새로 만든 태그 연결 키 — 상위 묶음(celeb_tags.parent_id, 26.07.26 DB 승격)에
   * 손으로 넣어야 도감에서 묶여 나온다는 안내용.
   */
  constantHint?: string[]
  /** 캐시 무효화 실패·환경변수 누락 등 조용히 넘기지 않고 알려야 하는 사항 */
  warnings?: string[]
}
