'use client'

import { useUiLabel } from './UiLabelContext'

/**
 * 주요 화면·패널의 이름표 배지. 이름표 토글이 켜졌을 때만 보인다.
 * 배치한 요소의 좌상단 모서리에 절대배치로 뜬다 — 부모 요소에 `relative`가 있어야 그 패널 기준으로 anchor된다.
 * pointer-events-none 이라 아래 UI 클릭을 방해하지 않는다.
 *
 * @param ko   화면에서 바로 알아볼 한국어 이름 (예: "음성 편집 패널")
 * @param code 코드에서 지칭할 컴포넌트명 (예: "ExpandedVoicePanel")
 */
export function UiLabel({ ko, code }: { ko: string; code: string }) {
  const { enabled } = useUiLabel()
  if (!enabled) return null
  return (
    <div className="absolute top-0 left-0 z-[100] pointer-events-none flex items-baseline gap-1.5 rounded-br-md rounded-tl-md bg-indigo-600/95 px-2 py-0.5 shadow-md ring-1 ring-white/25">
      <span className="text-[11px] font-bold leading-tight text-white whitespace-nowrap">{ko}</span>
      <span className="text-[9px] font-mono leading-tight text-indigo-200 whitespace-nowrap">{code}</span>
    </div>
  )
}
