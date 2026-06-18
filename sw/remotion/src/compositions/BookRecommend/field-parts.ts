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
 *  파이프라인이 기록한 partDurations가 온전하면 그대로, 아니면 전체 길이에서
 *  토막 사이 간격을 빼고 글자 수 비율로 추정한다(프리뷰·미생성 폴백). */
export function resolvePartDurations(
  parts: string[],
  partDurations: number[] | undefined,
  totalDuration: number,
): number[] {
  if (parts.length <= 1) return [totalDuration]
  if (
    partDurations
    && partDurations.length >= parts.length
    && parts.every((_, i) => typeof partDurations[i] === 'number' && partDurations[i] > 0)
  ) {
    return partDurations.slice(0, parts.length)
  }
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
