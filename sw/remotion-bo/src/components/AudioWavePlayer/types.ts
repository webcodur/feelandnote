import React from 'react'

export type Props = {
  audioUrl: string
  duration: number
  /** 눈금자 위 경계선 시각 표시 */
  boundaries?: number[]
  /** 파형 위에 겹칠 children (경계선, 구간 배경 등) */
  children?: React.ReactNode
  /** 클릭 시 콜백 (시간) — 기본: 해당 위치부터 재생 */
  onClick?: (time: number) => void
  /** 클릭 시 추가 콜백 — 기본 재생/onClick과 별도로 항상 호출 */
  onTimeClick?: (time: number) => void
  /** 더블클릭 시 콜백 (시간, 보조키 상태). Shift 동시 입력 여부 등을 전달한다. */
  onDoubleClick?: (time: number, modifiers?: { shiftKey: boolean }) => void
  /** 높이 클래스 */
  heightClass?: string
  /** 눈금자 표시 */
  showRuler?: boolean
  /** trim 시작/끝 (초) — 설정 시 오버레이 표시 */
  trimStart?: number
  trimEnd?: number
  /** trim 시작 변경 콜백 — 전달 시 좌측 드래그 핸들 표시 */
  onTrimStart?: (time: number) => void
  /** trim 끝 변경 콜백 — 전달 시 우측 드래그 핸들 표시 */
  onTrimEnd?: (time: number) => void
  /** 재생성 콜백 — 전달 시 정지 버튼 우측에 재생성 버튼 표시 */
  onRegenerate?: () => void
  /** 재생성 진행 중 — 버튼 비활성·라벨 변경 */
  regenerating?: boolean
  /** 초당 픽셀 수 — 지정 시 "화면 꽉차기" 대신 절대 가로폭으로 렌더, 가로 스크롤 발생.
   *  지정 없으면 부모 너비 꽉 채움(기존 동작). 긴 오디오에서 시간 감각 유지용. */
  pxPerSec?: number
  /** 마운트·오디오 변경 시 자동 재생 (예: 미리듣기 생성 직후) */
  autoPlay?: boolean
  /** 파형 위 마우스 시간(초)을 보고 — children(경계선 등)의 hover 안내용. 영역을 벗어나면 null. */
  onHoverTime?: (t: number | null) => void
  /** 재생 배속 — 지정 시 audio.playbackRate 에 반영. 미지정이면 1배속(기존 동작). */
  playbackRate?: number
  /** 음량 dB 게인 — 지정 시 audio.volume = dbToLinear(gainDb) 로 반영. 미지정이면 0dB(기존 동작). */
  gainDb?: number
}
