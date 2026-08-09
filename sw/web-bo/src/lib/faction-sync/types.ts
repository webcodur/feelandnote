/**
 * 세력도감 출간 계약 타입 — 진단(diagnose)·출간(publish) 요청/응답.
 *
 * 설계 단일원천: docs/project/remotion/faction-unification.md §4(경계)·§9(개조 방향)
 *
 * 제작 데이터(faction_* 5테이블)의 **사진·영상·음악·태그**를 서비스 세력도감(celeb_tags + R2 이미지)에
 * 반영할 때 주고받는 형태만 담는다. fs·supabase 를 부르지 않아 클라이언트(출간 패널)에서도 그대로 읽는다.
 *
 * ## 옛 계약과 달라진 점
 *
 * 인물 텍스트(대사·직함·소개)의 배정 복사가 사라졌다(26.08.03 단일화). 웹·BO 모두 DB 뷰
 * `faction_atlas_members` 로 faction_people 을 직접 읽으므로 복사할 것이 없다. 도감 한줄 직함은
 * lines[0]을 그대로 쓰고, 상세 소개·개인샷·숨김만 같은 행의 web_* 칸에서 손질한다. 개인샷 주소도 배정이 아니라
 * faction_people.web_image_url 에 기록한다.
 *
 * 진단은 일곱이다 — ① DB 인물 연결 무결성 ② 태그 미지정 세력 ③ 사진 저장소 동기 상태
 * ④ 아바타 유무 ⑤ 신화 표시와 셀럽 등급(fiction) 어긋남 ⑥ 대사 목소리 ↔ 셀럽 국문 목소리 대조
 * ⑦ 테마 간판(이름) ↔ 제작 표기 어긋남.
 */

/* ── 진단 ── */

/**
 * 인물의 셀럽 연결 상태.
 * - linked: `faction_people.celeb_id` 가 유효한 DB CELEB를 가리킨다(정상)
 * - unresolved/unkeyed: 26.08.03 이후 DB 제약상 생길 수 없는 무결성 오류. 옛 데이터 진단 방어값으로만 남긴다.
 */
export type FactionSyncLinkState = 'linked' | 'unresolved' | 'unkeyed'

/**
 * 개인샷 저장소 동기 상태.
 * - synced: 기본·전환 화보와 팩션 대사 음성 해시가 매니페스트와 같고 웹 타임라인도 일치한다
 * - stale: 화보·음성·전환 시각 중 하나가 바뀌었다(또는 아직 올린 기록이 없다)
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
  /** 해소된 셀럽 id — null이면 저장 제약을 우회한 무결성 오류 */
  celebId: string | null
  /** 신화·전설·허구 인물 표시 */
  mythical: boolean
  link: FactionSyncLinkState
  soloShot: FactionSyncSoloShotState
  /** celebs.avatar_url 존재 여부 */
  avatar: boolean
  /** celebs.celeb_tier */
  tier?: string
  /**
   * 신화 표시와 셀럽 등급이 어긋남 — 제작 데이터는 신화라는데 셀럽 등급이 fiction 이 아니거나 그 반대.
   * 어느 쪽이 맞는지는 사람이 판단한다(출간을 막지는 않는다).
   */
  tierMismatch: boolean
  /** 대사 목소리 대조(국문·영문 각각) — 무결성 오류 행은 견줄 상대가 없어 값이 없다 */
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

/**
 * 테마 간판 어긋남 — 테마(celeb_tags) 이름과 제작 쪽 표기가 다르다는 알림.
 *
 * 테마 이름·색은 매체별 표기라 세력과 테마에 각각 존재하는데, 소속 재편 등으로 간판이
 * 낡아도 시스템이 모른다(뉴럴링크 사건). 그래서 진단이 상설 감시한다.
 *
 * 판정은 **영문(name_en) 기준**이다 — 한글은 매체별 표기 차이(도감용 의역 등)가 잦아
 * 오탐이 되므로 견주지 않는다. 정규화(공백·대소문자·구분 부호 무시) 후에도 다를 때만 싣는다.
 * 어느 쪽이 맞는지는 사람이 정한다 — **오류가 아니라 확인 요망(warning)이고 출간을 막지 않는다.**
 */
export interface FactionSyncSignboardMismatch {
  /** celeb_tags.id */
  tagId: string
  /** 테마 이름(국문) — 화면에서 태그명 ↔ 세력명을 나란히 보이는 재료 */
  tagName: string
  /** 테마 영문 이름 — 판정에 쓴 값 */
  tagNameEn: string
  /**
   * 견준 상대 — 이 편에서 태그에 연결된 세력이 하나면 그 세력명(group),
   * 여러 세력이 한 태그를 나눠 쓰면 편 제목(episode)과 견준다.
   */
  source: 'group' | 'episode'
  /** 상대의 국문 표기(세력명 또는 편 제목) */
  sourceName: string
  /** 상대의 영문 표기 — 판정에 쓴 값 */
  sourceNameEn: string
  /** 이 편에서 태그에 연결된 세력 이름들 — 공유 태그일 때 어느 세력들인지 보이는 용도 */
  groupNames: string[]
}

export interface FactionSyncStatus {
  /** 에피소드 폴더명 */
  folder: string
  groups: FactionSyncGroup[]
  /** 테마 간판 어긋남 목록 — 확인 요망(출간을 막지 않는다) */
  signboardMismatches: FactionSyncSignboardMismatch[]
  summary: {
    groups: number
    /** 태그가 해소되지 않은 세력 수 */
    groupsUnlinked: number
    people: number
    /** 셀럽이 연결돼 출간 가능한 인물 수 */
    publishable: number
    /** 셀럽 미해소로 출간 불가인 인물 수 */
    blocked: number
    /** 올릴 개인 화보·대사 음성 묶음 수(stale·local-only) */
    soloShotPending: number
    /** 올릴 그룹샷 수 */
    teamShotPending: number
    /** 얼굴 사진(아바타)이 없는 연결 인물 수 */
    avatarMissing: number
    /** 신화 표시와 셀럽 등급이 어긋난 인물 수 */
    tierMismatch: number
    /** 테마 간판(영문 이름)이 제작 표기와 어긋난 태그 수 — 확인 요망 */
    signboardMismatch: number
    /** 대사 목소리가 셀럽 목소리와 다른 인물 수 — 언어별 */
    voiceDifferent: Record<FactionVoiceLocale, number>
    /** 대사 목소리가 비었고 셀럽 목소리는 있는 인물 수 — 언어별. 일괄 상속으로 채울 수 있는 인원 */
    voiceFillable: Record<FactionVoiceLocale, number>
  }
}

/**
 * 사진 동기 집계 — 편 편집기 헤더의 상시 배지가 쓰는 가벼운 요약.
 *
 * 전체 진단(`FactionSyncStatus`)에서 **사진 저장소 동기(진단 ③)만** 떼어 센 것이다.
 * 판정 규칙은 같다(매니페스트 해시 대조) — 셀럽·아바타·목소리·간판 대조는 하지 않는다.
 * 미반영 수는 **로컬 파일이 실재하는 것 기준**이고, 데이터에 적혔는데 파일이 없는 것은
 * 따로 센다(올릴 수 없는 것을 미반영으로 섞으면 출간해도 배지가 안 꺼진다).
 */
export interface FactionImageSyncSummary {
  /** 올릴 개인 화보·대사 음성 묶음 수 — 로컬 파일·타임라인이 바뀌었거나 아직 안 올라간 것 */
  solo: number
  /** 올릴 그룹샷 수 */
  team: number
  /** 올릴 세력 로고 수 */
  logo: number
  /** 데이터에 적혔는데 로컬 파일이 없는 수 — 별도 집계(출간으로 해소되지 않는다) */
  fileMissing: number
}

/* ── 출간 ── */

/**
 * 출간 범위 — 켠 항목만 실행한다. 전부 미지정이면 전 항목 실행.
 *
 * 인물 텍스트(대사·직함·소개)는 범위에 없다 — 뷰(faction_atlas_members)가 faction_people 을
 * 직접 읽는 단일 원천이라 출간이 복사할 것이 없다.
 */
export interface FactionPublishScope {
  /** celeb_tags 행 생성·채움 + faction_groups.tag_id 연결 */
  tag?: boolean
  /** @deprecated no-op(26.08.03 단일화) — 배정 복사가 사라졌다. 받은 값은 무시된다(옛 스크립트 호환용) */
  assignments?: boolean
  /** @deprecated no-op(26.08.03 단일화) — 소개·대사 복사가 사라졌다. 받은 값은 무시된다(옛 스크립트 호환용) */
  descs?: boolean
  /** 개인 화보 전체·팩션 대사 음성 업로드 + faction_people.web_image_url/web_quote_media 갱신 */
  personImages?: boolean
  /** 세력 로고(data.logoImg) 업로드 + faction_groups.web_logo_url 갱신 */
  logos?: boolean
  /** 그룹샷 업로드 + team_images 재구성 */
  teamImages?: boolean
  /**
   * 테마에 걸린 유튜브 영상(celeb_tags.youtube_videos) 되쓰기.
   * 원천은 제작·업로드 기록이라 대사와 같은 규칙 — 채움 전용이 아니라 항상 되쓴다.
   */
  videos?: boolean
  /**
   * 테마 배경음악(celeb_tags.theme_music) 되쓰기 + 곡 파일 저장소 업로드.
   * 어느 곡이 흐르는지는 렌더 엔진의 선곡이 정한다 — 영상과 같은 되쓰기 규칙이다.
   */
  music?: boolean
}

export interface FactionPublishRequest {
  /** 에피소드 폴더명 */
  folder: string
  /** 미지정이면 전체 세력 */
  groupIndex?: number
  scope?: FactionPublishScope
  /** true면 쓰기 직전까지 동일 계산 후 변경 예정 목록만 반환 */
  dryRun?: boolean
  /** true면 채움 전용인 태그 이름·색도 덮어쓴다 (인물 텍스트는 출간 범위 밖) */
  force?: boolean
}

export type FactionPublishKind = 'tag' | 'soloShot' | 'logo' | 'teamShots' | 'videos' | 'music' | 'revalidate'

export type FactionPublishAction = 'created' | 'updated' | 'skipped' | 'blocked'

export interface FactionPublishItem {
  kind: FactionPublishKind
  /** 세력 명칭 첫 줄 (웹 캐시 항목은 '-') */
  group: string
  person?: string
  action: FactionPublishAction
  /** skipped·blocked 사유 (예 'celeb-unresolved'(무결성 오류), 'external-url', 'unchanged') */
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
