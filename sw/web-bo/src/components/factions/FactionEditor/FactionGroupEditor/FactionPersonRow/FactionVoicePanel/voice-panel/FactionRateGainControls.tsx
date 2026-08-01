'use client'

import { GAIN_DB_MIN, GAIN_DB_MAX, GAIN_DB_STEP, isUnityGain } from '@feelandnote/shared/bo/gain'

/**
 * 세력도감 인물 음성 배속·게인 조절 줄.
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
// 슬라이더·숫자 미세 조정 범위(렌더 clampRate 와 동일) — 칩으로 못 잡는 중간값을 0.05 단위로.
const RATE_MIN = 0.5
const RATE_MAX = 2
const RATE_STEP = 0.05

type FactionRateGainControlsProps = {
  playbackRate: number
  setPlaybackRate: (rate: number) => void
  gainDb: number
  setGainDb: (db: number) => void
  /**
   * 인물에 값이 없어 보이스 도감 값을 빌려 쓰는 중인가.
   * 이때는 **대본에 그 숫자가 없어** 영상 렌더가 원음 그대로 재생한다 — 그 사실을 알려야 한다.
   */
  gainDbInherited?: boolean
}

export function FactionRateGainControls({
  playbackRate, setPlaybackRate, gainDb, setGainDb, gainDbInherited = false,
}: FactionRateGainControlsProps) {
  const rateActive = Math.abs(playbackRate - 1) > 1e-6
  const gainActive = !isUnityGain(gainDb)

  return (
    <div className="space-y-2">
      {/* 배속 — 칩 빠른선택 + 슬라이더·숫자 미세조정. 1배속이 아니면 강조. */}
      <div className="flex items-stretch rounded border border-border overflow-hidden">
        <span className="px-2 flex items-center text-sm text-text-secondary bg-slate-100 text-slate-800 font-extrabold border-r border-slate-300 shrink-0">배속</span>
        <div className="flex flex-1 flex-col gap-1.5 bg-white px-3 py-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
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
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={RATE_MIN}
              max={RATE_MAX}
              step={RATE_STEP}
              value={playbackRate}
              onChange={e => setPlaybackRate(Number(e.target.value))}
              onClick={e => e.stopPropagation()}
              className="flex-1 accent-slate-700"
              title="대사 재생 배속 (×1 이 원속)"
            />
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[11px] text-slate-500 font-bold">×</span>
              <input
                type="number"
                min={RATE_MIN}
                max={RATE_MAX}
                step={RATE_STEP}
                value={playbackRate}
                onChange={e => setPlaybackRate(Number(e.target.value))}
                onClick={e => e.stopPropagation()}
                className={`w-14 text-right text-xs font-mono tabular-nums bg-white border rounded px-1.5 py-0.5 outline-none focus:border-slate-600 ${
                  rateActive ? 'text-slate-900 font-extrabold border-slate-400' : 'text-slate-500 font-bold border-slate-300'
                }`}
              />
            </div>
          </div>
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
      {gainDbInherited && (
        <p className="px-1 text-[11px] text-warning-text">
          이 값은 보이스 도감에 적힌 기본 음량이며 이 인물에는 아직 적혀 있지 않습니다 — 여기서 한 번 건드리거나
          보이스 목록의 「인물에 적용」을 눌러야 영상에도 같은 크기로 나갑니다.
        </p>
      )}
    </div>
  )
}
