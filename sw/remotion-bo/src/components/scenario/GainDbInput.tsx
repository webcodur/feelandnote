'use client'

import { GAIN_DB_MAX, GAIN_DB_MIN, GAIN_DB_STEP, isUnityGain } from './gain'
import { useAudioPreviewCtx } from './AudioPreviewContext'

/**
 * 토막 단위 음량 조절 한 줄.
 *
 * 0dB 은 기본 음량(원본 그대로). 빈 값을 저장하면 부모가 키 자체를 제거해 JSON 을 깔끔하게 유지하도록
 * onChange 는 undefined 로도 받는다. 값이 0 이면 화면에서 흐릿하게, 값이 들어가면 색을 살려 어디에 손이 갔는지 한눈에.
 *
 * sectionKey 를 함께 받으면 이 슬라이더가 가리키는 음원이 지금 백오피스에서 재생 중일 때
 * 슬라이더 조작이 곧바로 출력 음량에 반영된다(재생을 끊지 않고 GainNode 값만 갱신).
 */
export function GainDbInput({
  value,
  onChange,
  label = '음량',
  sectionKey,
}: {
  value: number | undefined
  onChange: (next: number | undefined) => void
  /** 행 앞에 붙는 짧은 안내. 기본 "음량". */
  label?: string
  /** 이 음원의 재생 키. 일치하는 음원이 현재 재생 중이면 슬라이더 조작이 즉시 들린다. */
  sectionKey?: string
}) {
  const ctl = useAudioPreviewCtx()
  const isDefault = isUnityGain(value)
  const display = isDefault ? 0 : (value as number)

  const applyLive = (next: number | undefined) => {
    if (!ctl || !sectionKey || ctl.playingKey !== sectionKey) return
    ctl.setGainDb(next)
  }

  const commit = (next: number) => {
    const clamped = Math.max(GAIN_DB_MIN - 6, Math.min(GAIN_DB_MAX + 6, next))
    if (!Number.isFinite(clamped) || clamped === 0) {
      onChange(undefined)
      applyLive(undefined)
    } else {
      const v = Math.round(clamped * 10) / 10
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
      title="음량 조절 (dB). 0 이면 원본 그대로. +/- 한 칸은 ffmpeg volume=NdB 과 같다."
    >
      <span className="text-sm font-bold text-text-secondary w-14 shrink-0 text-center">{label}</span>
      <div className="flex-1 flex items-center gap-2">
        <input
          type="range"
          min={GAIN_DB_MIN}
          max={GAIN_DB_MAX}
          step={GAIN_DB_STEP}
          value={display}
          onChange={e => commit(parseFloat(e.target.value))}
          className="flex-1 max-w-[200px] cursor-pointer accent-amber-500"
        />
        {/* 기본값(0dB)도 빈칸이 아니라 0을 그대로 표시한다 — 빈 number input에서 스피너가
            엉뚱한 기준값부터 시작하는 브라우저 동작 방지(PlaybackRateInput과 동일 결함 예방). */}
        <input
          type="number"
          step={GAIN_DB_STEP}
          value={display}
          onChange={e => {
            const raw = e.target.value
            if (raw === '' || raw === '-' || raw === '+') { onChange(undefined); applyLive(undefined); return }
            const n = parseFloat(raw)
            if (Number.isFinite(n)) commit(n)
          }}
          className={`w-20 text-center text-base font-bold bg-bg-main border border-border rounded px-1 py-0 h-[26px] font-mono focus:border-accent/60 focus:outline-none ${isDefault ? 'text-text-dim' : 'text-accent font-black'}`}
        />
        <button
          type="button"
          onClick={reset}
          disabled={isDefault}
          title={isDefault ? '이미 원본 음량' : '원본 음량으로 되돌리기'}
          className="text-sm font-bold text-text-dim hover:text-red-400 px-1 disabled:opacity-30 disabled:hover:text-text-dim disabled:cursor-default"
        >×</button>
      </div>
    </div>
  )
}
