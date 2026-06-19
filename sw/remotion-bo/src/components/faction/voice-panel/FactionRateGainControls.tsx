'use client'

import { GAIN_DB_MIN, GAIN_DB_MAX, GAIN_DB_STEP, isUnityGain } from '../../scenario/gain'

/**
 * 세력도 인물 음성 배속·게인 조절 줄.
 *
 * 북리커맨드 FieldAudioControls 의 배속 셔터(0.75/1/1.25/1.5/2…)·gain.ts 의 dB 게인 개념을
 * 인물 데이터(quotePlaybackRate / quoteGainDb)에 영속하는 형태로 이식한다.
 *  - 배속: 칩 선택(0.5~2 — 렌더 clampRate 허용 범위). 1배속이 아니면 강조 표시.
 *  - 게인: 슬라이더 + dB 직접 입력. 0dB 이 아니면 강조 표시.
 *
 * 엔진(GEM/ELE) 공통으로 노출한다 — 렌더(Faction audioEl)가 엔진과 무관하게 적용하는 값이라서다.
 * 톤은 북리커맨드 ELE 옵션 박스와 동일한 슬레이트(헤더 slate-100, 본문 white).
 */

// 배속 선택지 — 북리커맨드 PLAYBACK_RATES 와 같은 결이되, 렌더 허용 범위(0.5~2)로 좁힌다.
const FACTION_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const

type FactionRateGainControlsProps = {
  playbackRate: number
  setPlaybackRate: (rate: number) => void
  gainDb: number
  setGainDb: (db: number) => void
}

export function FactionRateGainControls({
  playbackRate, setPlaybackRate, gainDb, setGainDb,
}: FactionRateGainControlsProps) {
  const rateActive = Math.abs(playbackRate - 1) > 1e-6
  const gainActive = !isUnityGain(gainDb)

  return (
    <div className="space-y-2">
      {/* 배속 — 칩 선택. 1배속이 아니면 강조. */}
      <div className="flex items-stretch rounded border border-border overflow-hidden">
        <span className="px-2 flex items-center text-sm text-text-secondary bg-slate-100 text-slate-800 font-extrabold border-r border-slate-300 shrink-0">배속</span>
        <div className="flex flex-1 flex-wrap items-center gap-1.5 bg-white px-3 py-1.5">
          {FACTION_RATES.map(r => {
            const active = Math.abs(playbackRate - r) < 1e-6
            return (
              <button
                key={r}
                type="button"
                onClick={e => { e.stopPropagation(); setPlaybackRate(r) }}
                className={`px-2 py-0.5 rounded text-xs font-mono tabular-nums border ${
                  active
                    ? 'bg-slate-800 text-white border-slate-800 font-extrabold shadow-sm'
                    : 'bg-white border-slate-300 text-slate-900 font-bold hover:border-slate-600 hover:bg-slate-50'
                }`}
              >×{r}</button>
            )
          })}
          <span className={`ml-auto text-[11px] font-mono font-bold ${rateActive ? 'text-slate-900' : 'text-slate-400'}`}>
            현재 ×{playbackRate.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 음량 — 슬라이더 + dB 입력. 0dB 이 아니면 강조. (게인=소리를 키우거나 줄이는 정도, dB 단위) */}
      <div className="flex items-stretch rounded border border-border overflow-hidden">
        <span className="px-2 flex items-center text-sm text-text-secondary bg-slate-100 text-slate-800 font-extrabold border-r border-slate-300 shrink-0">음량</span>
        <div className="flex flex-1 items-center gap-3 bg-white px-3 py-1.5">
          <input
            type="range"
            min={GAIN_DB_MIN}
            max={GAIN_DB_MAX}
            step={GAIN_DB_STEP}
            value={gainDb}
            onChange={e => setGainDb(Number(e.target.value))}
            onClick={e => e.stopPropagation()}
            className="flex-1 accent-slate-700"
            title="음량 dB 게인 (0dB 이 원음 그대로)"
          />
          <div className="flex items-center gap-1 shrink-0">
            <input
              type="number"
              min={GAIN_DB_MIN}
              max={GAIN_DB_MAX}
              step={GAIN_DB_STEP}
              value={gainDb}
              onChange={e => setGainDb(Number(e.target.value))}
              onClick={e => e.stopPropagation()}
              className={`w-14 text-right text-xs font-mono tabular-nums bg-white border rounded px-1.5 py-0.5 outline-none focus:border-slate-600 ${
                gainActive ? 'text-slate-900 font-extrabold border-slate-400' : 'text-slate-500 font-bold border-slate-300'
              }`}
            />
            <span className="text-[11px] text-slate-500 font-bold">dB</span>
          </div>
        </div>
      </div>
    </div>
  )
}
