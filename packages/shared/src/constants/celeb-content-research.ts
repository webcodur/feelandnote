// 셀럽 콘텐츠 조사 규약의 단일 원천(SSoT).
//
// 표시값·조사 대상 범위를 이 파일 하나가 정한다. 화면·서버 액션·스크립트는
// 여기서 가져다 쓰고, 문서는 이 파일을 가리키기만 한다(규약을 다시 서술하지 않는다).
// 사람이 읽을 배경 설명은 `docs/project/celeb/celeb-pipeline.md`「콘텐츠 수 표시」.

/**
 * 콘텐츠 수 표시값.
 *
 * `RESEARCHED_EMPTY`(-1)와 `UNRESEARCHED`(0)를 화면에서 매직넘버로 쓰지 마라.
 */
export const CELEB_CONTENT_COUNT = {
  /** 조사를 마쳤고 0건으로 확정했다. 다시 조사하지 않는다. */
  RESEARCHED_EMPTY: -1,
  /** 아직 조사하지 않았다. 조사 대상이다. */
  UNRESEARCHED: 0,
} as const

/**
 * 셀럽 콘텐츠 수의 표시 규약.
 *
 * - 양수: 실제 celeb_contents 개수
 * - 0: 콘텐츠가 0건이고 아직 "없음"으로 확정하지 않은 상태 (= 조사 대상)
 * - -1: 조사를 마쳤고 0건으로 확정한 상태 (`content_research_confirmed_empty_at` 존재. 더 조사하지 않는다)
 *
 * 실제 콘텐츠가 하나라도 있으면 확정 시각보다 실측 개수를 항상 우선한다.
 *
 * **노출 상태(`celebs.publication_status`)는 이 값에 영향을 주지 않는다.** 비활성 상태는
 * 서비스에 안 띄운다는 뜻일 뿐 조사를 마쳤다는 뜻이 아니다. 26.07.30~26.08.07
 * 사이에는 비활성이면 조사 여부와 무관하게 -1을 돌려줬는데, 그 탓에 팩션용으로
 * 비공개 등록한 신규 인물이 조사도 하기 전에 "조사 완료"로 보여 조사 대상에서
 * 통째로 빠졌다. -1의 뜻은 하나뿐이다 — 사람이 조사를 끝냈다.
 */
export function resolveCelebContentCount(
  actualCount: number | null | undefined,
  confirmedEmptyAt: string | null | undefined
): number {
  const normalizedCount = Number.isFinite(actualCount)
    ? Math.max(0, Math.trunc(actualCount as number))
    : 0

  if (normalizedCount > 0) return normalizedCount
  return confirmedEmptyAt
    ? CELEB_CONTENT_COUNT.RESEARCHED_EMPTY
    : CELEB_CONTENT_COUNT.UNRESEARCHED
}

/**
 * 콘텐츠 조사 목록에 오르는 모집단.
 *
 * 조사 대상 목록을 뽑는 쿼리는 이 상수를 써서 조건을 건다. 값을 하드코딩하면
 * 문서·화면·스크립트가 제각기 갈라진다.
 *
 * 제외되는 쪽과 그 이유:
 * - `full`  — 이미 조사를 마쳤다. 조사에서 콘텐츠를 찾았기에 올라간 등급이다.
 * - `fiction` — 허구 인물이라 일반 콘텐츠 조사 개수를 쓰지 않는다.
 * - `suspended`·`deleted` — 서비스에서 내린 인물이라 조사 큐에 올리지 않는다.
 *
 * 조사를 마친 인물은 결과가 둘로 갈릴 뿐 둘 다 재조사 대상이 아니다.
 * 콘텐츠를 찾았으면 `full`(표시값 양수), 없었으면 확정 시각을 기록한다(표시값 -1).
 */
export const CELEB_CONTENT_RESEARCH_TARGET_TIERS = ['light'] as const

export const CELEB_CONTENT_RESEARCH_TARGET_PROFILE_STATUSES = [
  'active',
  'inactive',
] as const

/** 이 인물이 콘텐츠 조사 목록에 드는가. 등급·노출 상태만 본다. */
export function isCelebContentResearchTarget(
  celebTier: string | null | undefined,
  profileStatus: string | null | undefined
): boolean {
  return (
    (CELEB_CONTENT_RESEARCH_TARGET_TIERS as readonly string[]).includes(celebTier ?? '') &&
    (CELEB_CONTENT_RESEARCH_TARGET_PROFILE_STATUSES as readonly string[]).includes(
      profileStatus ?? ''
    )
  )
}

/**
 * 표시값이 조사 대상을 뜻하는가.
 *
 * ⚠️ 이 함수만으로 조사 규모를 세지 마라. 모집단 밖(fiction·정지)에도 표시값 0이
 * 널려 있어 실제보다 부풀려진다. 규모를 셀 때는 `isCelebContentResearchTarget`을
 * 함께 건다. 26.08.07 실측으로 표시값 0은 1,146명이었으나 모집단은 667명이었다.
 */
export function isUnresearchedContentCount(displayCount: number): boolean {
  return displayCount === CELEB_CONTENT_COUNT.UNRESEARCHED
}
