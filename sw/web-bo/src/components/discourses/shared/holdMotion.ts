import type { DiscourseHoldMotion } from '@/lib/discourse-types'

/**
 * 지속 효과(holdMotion) 선택지 — 컷이 떠 있는 동안의 카메라 움직임.
 * 발언별/전역 드롭다운과 전역 일괄 적용에서 공유한다(중복 정의 방지).
 */
export const HOLD_MOTION_OPTIONS: { value: DiscourseHoldMotion; label: string }[] = [
  { value: 'none', label: '정지' },
  { value: 'zoomin', label: '줌인 (확대)' },
  { value: 'zoomout', label: '줌아웃 (축소)' },
  { value: 'kenburns', label: '켄번스 (확대+상하)' },
  { value: 'panLeft', label: '패닝 왼쪽' },
  { value: 'panRight', label: '패닝 오른쪽' },
  { value: 'zoomPulse', label: '줌 펄스' },
]
