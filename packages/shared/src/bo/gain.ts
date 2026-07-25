/**
 * 음원 토막별 dB 게인 헬퍼.
 *
 * JSON 키 규약: 각 토막 본문 필드의 형제 자리에 `*GainDb` 한 자리.
 * 예) seg.gainDb, narrator.serviceGreetingGainDb, book.summaryGainDb, pair.quoteGainDb
 *
 * 0(또는 빈 값)이 기본 음량 그대로. +/-는 ffmpeg `volume=NdB`와 동일한 의미.
 * 범위는 UI에서 -20 ~ +12 사이로 제한. 그 이상도 저장은 가능하지만 권장 영역만 슬라이더로 노출.
 */

export const GAIN_DB_MIN = -20
export const GAIN_DB_MAX = 12
export const GAIN_DB_STEP = 0.5

/** dB → 곱셈 인자 (Remotion Audio volume에 그대로 사용 가능). 0dB은 1, +6dB는 약 2, -6dB는 약 0.5. */
export function dbToLinear(db: number | undefined | null): number {
  if (db === undefined || db === null || !Number.isFinite(db) || db === 0) return 1
  return Math.pow(10, db / 20)
}

/** 0dB 또는 비어 있으면 true. 값이 있으면 화면에서 강조 표시. */
export function isUnityGain(db: number | undefined | null): boolean {
  return db === undefined || db === null || !Number.isFinite(db) || db === 0
}
