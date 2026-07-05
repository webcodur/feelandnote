/**
 * field-parts — 긴 서술 필드(핵심 요약·감상 배경)의 토막 분할 헬퍼
 *
 * 토막 목록(summaryParts/contextMainParts)이 있으면 그 목록을,
 * 없으면 전체 텍스트를 1토막으로 본다. 모든 소비자(음성 잡 빌더,
 * 정렬 파이프라인, 렌더 시퀀스, BO 행 구성)가 이 함수 하나를 통과해야
 * 토막 개수 해석이 갈리지 않는다.
 */

/** 토막 사이 재생 간격 (초) — 문단 호흡과 같은 무게 */
export const FIELD_PART_GAP_SEC = 0.5

/** 필드의 토막 목록. parts 우선, 폴백은 전체 텍스트 1토막. 빈 토막은 제외. */
export function bookFieldParts(full: string | undefined, parts?: string[]): string[] {
  if (parts && parts.length > 0) {
    const filtered = parts.filter(p => typeof p === 'string' && p.trim().length > 0)
    if (filtered.length > 0) return filtered
  }
  return full && full.trim().length > 0 ? [full] : []
}

/** 토막별 음성 길이(초) 확정.
 *  파이프라인이 기록한 partDurations가 온전하면 그대로 쓴다. 일부 토막만 비어
 *  있으면 멀쩡한 토막의 평균 발화 속도로 빈 토막만 추정해 복구하고, 길이 정보가
 *  전무하면 전체 길이를 글자 수 비율로 안분한다(프리뷰·미생성 폴백). */
export function resolvePartDurations(
  parts: string[],
  partDurations: number[] | undefined,
  totalDuration: number,
): number[] {
  if (parts.length <= 1) return [totalDuration]

  const valid = (d: unknown): d is number => typeof d === 'number' && d > 0

  // 기록된 토막 길이가 전부 온전하면 그대로 사용
  if (
    partDurations
    && partDurations.length >= parts.length
    && parts.every((_, i) => valid(partDurations[i]))
  ) {
    return partDurations.slice(0, parts.length)
  }

  // 일부 토막만 비어 있으면 — 멀쩡한 토막은 살리고 빈 토막만 추정한다.
  // 빈 토막 길이는 멀쩡한 토막들의 평균 발화 속도(글자/초)로 글자 수에서 환산한다.
  // totalDuration이 함께 어긋나 있을 수 있어(빈 토막을 합산에서 누락한 값) 잔여
  // 안분보다 견고하다. 빈 토막 하나가 전체를 글자 수 비율 폴백으로 떨어뜨리면
  // 멀쩡한 토막들의 시작점까지 압축되어 자막·음성 배치가 서로 포개진다(동시 점등).
  if (
    partDurations
    && partDurations.length >= parts.length
    && parts.some((_, i) => valid(partDurations[i]))
  ) {
    let knownChars = 0
    let knownDur = 0
    for (let i = 0; i < parts.length; i++) {
      if (valid(partDurations[i])) {
        knownChars += parts[i].length
        knownDur += partDurations[i]
      }
    }
    const charsPerSec = knownChars > 0 && knownDur > 0 ? knownChars / knownDur : 0
    if (charsPerSec > 0) {
      if (typeof window !== 'undefined') {
        const missing = parts
          .map((_, i) => (valid(partDurations[i]) ? -1 : i))
          .filter(i => i >= 0)
        console.warn(
          `[resolvePartDurations] 토막 길이 누락(index ${missing.join(',')}) — `
          + '정상 토막 발화 속도로 추정 복구. 음성 재정렬로 정식 값 채우기 권장.',
        )
      }
      return parts.map((p, i) => (valid(partDurations[i]) ? partDurations[i] : p.length / charsPerSec))
    }
  }

  // 토막 길이 정보가 전무 — 전체 길이를 글자 수 비율로 안분(프리뷰·미생성 폴백)
  const speech = Math.max(0, totalDuration - FIELD_PART_GAP_SEC * (parts.length - 1))
  const totalChars = parts.reduce((a, p) => a + p.length, 0) || 1
  return parts.map(p => speech * (p.length / totalChars))
}

/** 토막별 시작 시각(초, 구간 시작 기준). 토막 i 시작 = 앞 토막 길이 합 + i × 간격.
 *  오디오 배치·이미지 앵커·자막이 모두 이 배치를 공유해야 어긋나지 않는다. */
export function bookPartStarts(durations: number[]): number[] {
  const starts: number[] = []
  let cur = 0
  for (const d of durations) {
    starts.push(cur)
    cur += d + FIELD_PART_GAP_SEC
  }
  return starts
}
