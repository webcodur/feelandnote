'use client'

import type { ReactNode } from 'react'
import { BTN_ELE, BTN_SM } from './types'

const BTN_GEM = `${BTN_SM} bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30`

/**
 * 미리듣기 생성 묶음의 공통 골격. 엔진별 차이(ELE: 감정 태그·페이드 기본 등,
 * Gemini: 캐릭터 보이스·스타일 prefix)는 children 으로 주입한다.
 *
 * 골격: 엔진별 위젯(children) → 합성 송신 텍스트 미리보기 → 생성 버튼 + 안내 문구.
 * 생성 버튼 라벨러는 engine prop 으로 자동 분기.
 */
export function PreviewGenerateSection({
  engine,
  sendText,
  generating,
  onGenerate,
  description,
  children,
}: {
  engine: 'elevenlabs' | 'gemini'
  /** 엔진별 prefix · 감정 태그가 결합된 최종 송신 텍스트 (앞 일부만 표시) */
  sendText: string
  generating: boolean
  onGenerate: () => void
  /** 생성 버튼 옆에 붙는 한 줄 안내 문구 */
  description: string
  /** 엔진별 위젯 영역. 송신 미리보기 위에 그려진다. */
  children: ReactNode
}) {
  const label = engine === 'gemini' ? 'GEM' : 'ELE'
  const btnClass = engine === 'gemini' ? BTN_GEM : BTN_ELE
  return (
    <div className="space-y-2">
      {children}
      <div className="text-[11px] text-text-dim font-mono break-all px-1">
        송신: <span className="text-text-secondary">{sendText.slice(0, 200)}{sendText.length > 200 ? '…' : ''}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={onGenerate} disabled={generating} className={btnClass}>
          {generating ? `${label} 생성 중…` : `${label} 생성`}
        </button>
        <span className="text-[11px] text-text-dim">{description}</span>
      </div>
    </div>
  )
}
