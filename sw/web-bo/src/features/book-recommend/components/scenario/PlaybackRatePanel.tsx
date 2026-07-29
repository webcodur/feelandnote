'use client'

import { PLAYBACK_RATES, usePlaybackRate } from './usePlaybackRate'

/**
 * 시나리오 페이지의 오디오 배속 컨트롤(인라인).
 *
 * 외곽 박스 없이 한 줄로 들어간다 — 다른 도구들과 같은 줄에 묶기 위해.
 * 1배 외에는 accent 강조로 "배속 적용 중"을 명시. 시나리오 행 미리듣기, 파형 플레이어,
 * 확장 보이스 패널 등 모든 audio 경로가 이 값을 따른다.
 */
export function PlaybackRateControl() {
  const [rate, setRate] = usePlaybackRate()
  const isOff = rate === 1

  return (
    <div className="flex items-center gap-1 text-sm font-bold text-text-secondary ml-2 pl-3 border-l border-border/50">
      <span className="font-bold text-text-primary mr-1">재생속도</span>
      {PLAYBACK_RATES.map(r => {
        const active = r === rate
        return (
          <button
            key={r}
            type="button"
            onClick={() => setRate(r)}
            className={`px-1.5 py-0.5 rounded text-sm font-bold tabular-nums border cursor-pointer ${
              active
                ? 'border-accent text-accent bg-accent/10 font-semibold'
                : 'border-border/40 text-text-secondary hover:border-accent/40 hover:text-accent'
            }`}
            title={`재생 배속 ${r}배`}
          >×{r}</button>
        )
      })}
    </div>
  )
}
