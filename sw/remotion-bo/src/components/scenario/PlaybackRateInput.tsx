'use client'

import { useAudioPreviewCtx } from './AudioPreviewContext'

/**
 * 토막 단위 영상 재생 배속 한 줄. GainDbInput과 같은 자리(행 footer)에 나란히 둔다.
 *
 * JSON 키 규약은 음량과 동일 — 본문 필드의 형제 자리에 `*PlaybackRate` 한 자리.
 * 1(또는 빈 값)이 원본 속도. 빈 값을 저장하면 부모가 키를 제거하도록 onChange는 undefined도 받는다.
 *
 * 영상(Remotion)에서는 음 높이를 유지한 채 빨라지고, 구간 길이·자막 타이밍·이미지 전환이
 * 자동으로 같이 당겨진다. 음성 파일 자체는 변하지 않으므로 1로 되돌리면 원상복구다.
 *
 * sectionKey가 가리키는 음원이 재생 중일 때 슬라이더를 움직이면 미리듣기에도 즉시 반영된다.
 */
export const RATE_MIN = 0.5
export const RATE_MAX = 2
export const RATE_STEP = 0.05

export function isUnityRate(r: number | undefined | null): boolean {
  return r === undefined || r === null || !Number.isFinite(r) || Math.abs(r - 1) < 1e-6
}

export function PlaybackRateInput({
  value,
  onChange,
  label = '배속',
  sectionKey,
}: {
  value: number | undefined
  onChange: (next: number | undefined) => void
  label?: string
  /** 이 음원의 재생 키. 일치하는 음원이 재생 중이면 슬라이더 조작이 즉시 들린다. */
  sectionKey?: string
}) {
  const ctl = useAudioPreviewCtx()
  const isDefault = isUnityRate(value)
  const display = isDefault ? 1 : (value as number)

  const applyLive = (next: number | undefined) => {
    if (!ctl || !sectionKey || ctl.playingKey !== sectionKey) return
    ctl.setMediaRate(next)
  }

  const commit = (next: number) => {
    const clamped = Math.max(RATE_MIN, Math.min(RATE_MAX, next))
    if (!Number.isFinite(clamped) || Math.abs(clamped - 1) < 1e-6) {
      onChange(undefined)
      applyLive(undefined)
    } else {
      const v = Math.round(clamped * 100) / 100
      onChange(v)
      applyLive(v)
    }
  }

  const reset = () => {
    onChange(undefined)
    applyLive(undefined)
  }

  return (
    <div
      className="flex items-center gap-1.5"
      title="영상 재생 배속. 1이면 원본 속도. 음 높이는 유지되고 자막·이미지 타이밍이 자동으로 따라온다. 음성 파일은 변하지 않는다."
    >
      <span className="text-sm font-bold text-text-secondary w-14 shrink-0 text-center">{label}</span>
      <div className="flex-1 flex items-center gap-2">
        <input
          type="range"
          min={RATE_MIN}
          max={RATE_MAX}
          step={RATE_STEP}
          value={display}
          onChange={e => commit(parseFloat(e.target.value))}
          className="flex-1 max-w-[200px] cursor-pointer accent-sky-500"
        />
        {/* 기본값(×1)도 빈칸이 아니라 1을 그대로 표시한다 — 빈 number input에서 스피너 상향이
            min(0.5)부터 시작하는 브라우저 동작 때문에, 1에서 ▲을 누르면 0.5가 되는 결함 방지. */}
        <input
          type="number"
          step={RATE_STEP}
          min={RATE_MIN}
          max={RATE_MAX}
          value={display}
          onChange={e => {
            const raw = e.target.value
            if (raw === '') { onChange(undefined); applyLive(undefined); return }
            const n = parseFloat(raw)
            if (Number.isFinite(n)) commit(n)
          }}
          className={`w-20 text-center text-base font-bold bg-bg-main border border-border rounded px-1 py-0 h-[26px] font-mono focus:border-accent/60 focus:outline-none ${isDefault ? 'text-text-dim' : 'text-sky-400 font-black'}`}
        />
        <button
          type="button"
          onClick={reset}
          disabled={isDefault}
          title={isDefault ? '이미 원본 속도' : '원본 속도로 되돌리기'}
          className="text-sm font-bold text-text-dim hover:text-red-400 px-1 disabled:opacity-30 disabled:hover:text-text-dim disabled:cursor-default"
        >×</button>
      </div>
    </div>
  )
}
