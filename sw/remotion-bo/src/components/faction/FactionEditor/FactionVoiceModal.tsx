'use client'

import { useState } from 'react'
import { Mic, Loader } from '@feelandnote/shared/bo/icons'

// 세력도 음성 생성 옵션 — 엔진·대상·정규화·생성 모드를 고른 뒤 생성한다.
export type FactionVoiceOptions = {
  engine: string
  only?: string
  normalize: boolean
  force: boolean
  thenAlign?: boolean
}

type Props = {
  onClose: () => void
  // 옵션을 담아 실제 생성을 트리거. force=true(전체 재생성) / false(누락분만).
  onGenerate: (opts: FactionVoiceOptions) => Promise<void>
}

export function FactionVoiceModal({ onClose, onGenerate }: Props) {
  const [engine, setEngine] = useState('gemini')
  const [only, setOnly] = useState('')
  const [normalize, setNormalize] = useState(true)
  const [thenAlign, setThenAlign] = useState(false)
  const [busy, setBusy] = useState(false)

  // 정렬 이어 실행은 특정 인물(only) 지정 시에만 의미가 있다 (정렬은 인물 단위 스코프)
  const alignEnabled = !!only.trim()
  const align = alignEnabled && thenAlign

  // force = true 전체 재생성, false 누락분만
  const run = async (force: boolean) => {
    if (busy) return
    setBusy(true)
    try {
      await onGenerate({ engine, only: only.trim() || undefined, normalize, force, thenAlign: align })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-20" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg border border-border bg-bg-card shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-3">
          <span className="flex items-center gap-2 font-semibold text-text-primary">
            <Mic size={16} /> 음성 생성 옵션
          </span>
          <button onClick={onClose} className="rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover">
            닫기
          </button>
        </div>

        <div className="space-y-4 p-4">
          {/* 엔진 — 일괄 생성 기본 엔진. 인물별 설정(quoteEngine)이 우선한다.
              ElevenLabs 인물은 자동 생성에서 제외되고, 인물 패널에서 사용자가 직접 미리듣기·저장한다. */}
          <div className="flex items-center gap-2">
            <label className="w-24 shrink-0 text-xs text-text-dim">기본 엔진 -</label>
            <select
              value={engine}
              onChange={e => setEngine(e.target.value)}
              title="일괄 생성 기본 엔진. 인물별 설정이 있으면 그 엔진을 따른다. Gemini 3.1은 audio tag 지원·단가 2배"
              className="flex-1 rounded-md border border-border bg-bg-main px-3 py-2 text-sm focus:border-accent focus:outline-none"
            >
              <option value="gemini">Gemini 2.5</option>
              <option value="gemini-v3">Gemini 3.1</option>
              <option value="elevenlabs">ElevenLabs</option>
            </select>
          </div>

          <p className="rounded-md border border-border bg-bg-main px-3 py-2 text-[11px] leading-relaxed text-text-dim">
            인물마다 음성 패널에서 엔진·보이스를 따로 지정할 수 있습니다. 지정한 인물은 그 설정대로 생성되고,
            ElevenLabs로 지정한 인물은 자동 생성에서 빠집니다. ElevenLabs 음원은 인물 패널의 미리듣기로 만들어 저장하세요.
          </p>

          {/* 대상 — 특정 인물 파일 접두만 생성. 비우면 전체 */}
          <div className="flex items-center gap-2">
            <label className="w-24 shrink-0 text-xs text-text-dim">대상 -</label>
            <input
              type="text"
              placeholder="특정 인물 (예: F01P01) · 비우면 전체"
              value={only}
              onChange={e => setOnly(e.target.value)}
              className="flex-1 rounded-md border border-border bg-bg-main px-3 py-2 text-sm placeholder:text-text-dim focus:border-accent focus:outline-none"
            />
          </div>

          {/* 라우드니스 정규화 — 기본 ON */}
          <div className="flex items-center gap-2">
            <label className="w-24 shrink-0 text-xs text-text-dim">음량 정규화 -</label>
            <label className="flex flex-1 cursor-pointer items-center gap-2 text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={normalize}
                onChange={e => setNormalize(e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
              라우드니스 균일화 (권장)
            </label>
          </div>

          {/* 정렬까지 수행 — 특정 인물 지정 시에만 활성. 생성 직후 받아쓰기·발화시각(ko)까지 이어 실행 */}
          <div className="flex items-center gap-2">
            <label className="w-24 shrink-0 text-xs text-text-dim">정렬까지 -</label>
            <label
              title={alignEnabled
                ? '생성 직후 받아쓰기·발화시각 정렬(한국어)을 같은 작업으로 이어 실행합니다. 자막 타이밍이 새 음원에 맞춰집니다.'
                : '특정 인물을 지정해야 정렬을 이어 실행할 수 있습니다 (정렬은 인물 단위로 처리).'}
              className={`flex flex-1 items-center gap-2 text-sm ${alignEnabled ? 'cursor-pointer text-text-secondary' : 'cursor-not-allowed text-text-dim'}`}>
              <input
                type="checkbox"
                checked={align}
                disabled={!alignEnabled}
                onChange={e => setThenAlign(e.target.checked)}
                className="h-4 w-4 accent-accent disabled:cursor-not-allowed"
              />
              발화시각 정렬 이어 실행 (한국어)
            </label>
          </div>

          {/* 생성 모드 — 전체 재생성 / 누락분만 */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => run(true)}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2.5 text-sm font-semibold text-bg-main hover:bg-accent-hover disabled:opacity-50"
            >
              {busy ? <Loader size={15} /> : <Mic size={15} />} 전체 생성
            </button>
            <button
              onClick={() => run(false)}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2.5 text-sm font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
            >
              누락분만 생성
            </button>
          </div>

          <p className="text-xs leading-relaxed text-text-dim">
            유료 생성입니다. 시작하면 백그라운드 작업으로 진행되며, 진행 상황은 하단의 작업 패널에서 확인할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  )
}
