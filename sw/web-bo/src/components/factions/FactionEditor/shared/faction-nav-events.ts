export type FactionJumpDetail = {
  groupIndex: number
  clusterIndex?: number
  targetId?: string
}

export const FACTION_JUMP_EVENT = 'faction:jump'

/**
 * 특정 세력 또는 장면으로 점프 이벤트를 발생시킵니다.
 */
export function emitFactionJump(detail: FactionJumpDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(FACTION_JUMP_EVENT, { detail }))
}

/**
 * 스크롤 컨테이너(<main>) 내 특정 요소로 정확하게 스크롤합니다.
 * 아코디언 펼침 등으로 인한 레이아웃 지연 팽창(동적 높이 변화)을 완벽히 보정하기 위해 다단계 위치 보정을 수행합니다.
 */
export function scrollToElement(
  target: HTMLElement | string,
  options: { offset?: number; behavior?: ScrollBehavior; retry?: boolean } = {}
) {
  if (typeof window === 'undefined') return
  const { offset = 16, behavior = 'smooth', retry = true } = options
  const getEl = () => typeof target === 'string' ? document.getElementById(target) : target
  const container = document.querySelector('main') || document.documentElement

  const doScroll = (smooth: boolean) => {
    const el = getEl()
    if (!el || !container) return false

    const containerRect = container.getBoundingClientRect()
    const targetRect = el.getBoundingClientRect()
    const currentScrollTop = container.scrollTop

    // 정확한 타겟 scrollTop 계산 (상단 오프셋 여백 적용)
    const targetScrollTop = Math.max(0, targetRect.top - containerRect.top + currentScrollTop - offset)

    container.scrollTo({
      top: targetScrollTop,
      behavior: smooth ? behavior : 'auto',
    })
    return true
  }

  // 1차 패스: 즉시/다음 프레임에 스크롤 시작
  requestAnimationFrame(() => {
    const success = doScroll(true)

    // 만약 요소가 방금 마운트되는 중이라 아직 DOM에 없을 경우 50ms 후 재시도
    if (!success && retry) {
      setTimeout(() => {
        doScroll(true)
      }, 50)
    }

    // 2차 패스 (150ms 후): React 렌더링 및 텍스트/이미지 등 하위 레이아웃 확장 후 위치 오차 미세 보정
    if (retry) {
      setTimeout(() => {
        const el = getEl()
        if (el) {
          const containerRect = container.getBoundingClientRect()
          const targetRect = el.getBoundingClientRect()
          const currentOffset = targetRect.top - containerRect.top
          // 오차가 15px 이상 발생한 경우 보정 스크롤 수행
          if (Math.abs(currentOffset - offset) > 15) {
            doScroll(true)
          }
        }
      }, 150)

      // 3차 패스 (350ms 후): 복잡한 대규모 장면(클러스터/대사목록) 높이 완전 안정화 확인
      setTimeout(() => {
        const el = getEl()
        if (el) {
          const containerRect = container.getBoundingClientRect()
          const targetRect = el.getBoundingClientRect()
          const currentOffset = targetRect.top - containerRect.top
          if (Math.abs(currentOffset - offset) > 15) {
            doScroll(true)
          }
        }
      }, 350)
    }
  })
}

/**
 * 점프한 대상 DOM 요소를 시각적으로 펄스/하이라이트합니다.
 */
export function highlightTargetElement(element: HTMLElement | null) {
  if (!element) return

  element.classList.add(
    'ring-2',
    'ring-accent',
    'ring-offset-2',
    'ring-offset-bg-main',
    'shadow-lg',
    'shadow-accent/25',
    'transition-all',
    'duration-300',
  )

  const timer = setTimeout(() => {
    element.classList.remove(
      'ring-2',
      'ring-accent',
      'ring-offset-2',
      'ring-offset-bg-main',
      'shadow-lg',
      'shadow-accent/25',
    )
  }, 1400)

  return () => {
    clearTimeout(timer)
    element.classList.remove(
      'ring-2',
      'ring-accent',
      'ring-offset-2',
      'ring-offset-bg-main',
      'shadow-lg',
      'shadow-accent/25',
    )
  }
}
