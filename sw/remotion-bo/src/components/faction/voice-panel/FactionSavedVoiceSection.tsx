import type { VoiceFile } from '../../voice-utils'
import { AudioWavePlayer } from '../../AudioWavePlayer'

/**
 * 북리커맨드 SavedVoiceSection 통째 복제 — 화면(레이아웃·라벨·슬레이트 톤·여백)은 동일.
 * 데이터 연결부만 세력도로 교체:
 *  - 엔진 슬롯이 2개(GEM/ELE)가 아니라 인물 음원 1개 → 슬롯 1로 표기.
 *  - 저장 음원 재생 URL: 북리커맨드 `/voice/play/{name}/{file}` → 세력도 `/faction-voice/{episode}/{file}`.
 *
 * 인물은 한 파일에 한 엔진 결과만 저장되므로(슬롯 폴더 없음) 파형 한 개만 그린다.
 */

type FactionSavedVoiceSectionProps = {
  series: string
  episodeName: string
  /** 저장된 음원(존재 시) — 파일명·길이 */
  activeFile: VoiceFile | undefined
  /** 현재 엔진 라벨 (GEM 2.5 / GEM 3.1 / ELE) — 슬롯 요약 표기용 */
  engineLabel: string
  trimStart: number
  setTrimStart: (t: number) => void
  trimEnd: number
  setTrimEnd: (t: number) => void
  trimSaving: boolean
  reloadTick: number
  saveTrimmed: () => void
  /** 저장 음원 재생에 적용할 배속 — 인물 quotePlaybackRate. 미지정이면 1배속. */
  playbackRate?: number
  /** 저장 음원 재생에 적용할 dB 게인 — 인물 quoteGainDb. 미지정이면 0dB. */
  gainDb?: number
}

export function FactionSavedVoiceSection({
  series, episodeName, activeFile, engineLabel,
  trimStart, setTrimStart, trimEnd, setTrimEnd,
  trimSaving, reloadTick, saveTrimmed, playbackRate, gainDb,
}: FactionSavedVoiceSectionProps) {
  const slotCount = activeFile ? 1 : 0
  const activeDur = activeFile?.duration ?? 0
  const trimmed = !!activeFile && (trimStart > 0.01 || (trimEnd > 0 && trimEnd < activeFile.duration - 0.01))

  return (
    <section className="rounded-md border border-border bg-bg-main/40 p-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-text-primary">저장된 음원</h3>
        <span className="text-xs text-text-secondary">양끝 드래그로 구간 선택</span>
        <div className="ml-auto flex items-center gap-3 text-xs text-text-secondary">
          <span>슬롯 {slotCount}</span>
          <span className="text-border">·</span>
          <span>현재 <span className="text-text-primary font-semibold">{activeFile ? engineLabel : '—'}</span></span>
          <span className="text-border">·</span>
          <span>길이 {activeDur.toFixed(2)}초</span>
          {trimmed && (
            <>
              <span className="text-border">·</span>
              <span className="text-amber-300">선택 {trimStart.toFixed(2)}–{trimEnd.toFixed(2)} ({(trimEnd - trimStart).toFixed(2)}초)</span>
            </>
          )}
          {trimSaving && <span className="text-amber-400 animate-pulse">저장 중…</span>}
        </div>
      </div>

      {/* 트림 액션 — 한 묶음(저장 + 초기화) */}
      {activeFile && (
        <div
          role="group"
          className="inline-flex items-stretch rounded border border-border overflow-hidden"
        >
          <button
            onClick={saveTrimmed}
            disabled={trimSaving || !trimmed}
            className="px-3 py-1.5 bg-accent text-bg-primary text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:bg-bg-card disabled:text-text-secondary"
          >
            {trimSaving ? '저장 중…' : trimmed ? '트림 저장' : '트림 저장 (구간 선택 필요)'}
          </button>
          <button
            onClick={() => { setTrimStart(0); setTrimEnd(activeFile.duration) }}
            disabled={!trimmed}
            className="px-3 py-1.5 text-sm bg-bg-card hover:bg-bg-hover text-text-secondary border-l border-border disabled:opacity-40"
          >
            초기화
          </button>
        </div>
      )}

      {/* Waveform */}
      {!activeFile ? (
        <div className="text-sm text-text-secondary italic px-1 py-2">아직 저장된 음원이 없다. 아래 「새 음원 생성」 에서 만든다.</div>
      ) : (() => {
        const url = `/api/${series}/faction-voice/${encodeURIComponent(episodeName)}/${encodeURIComponent(activeFile.name)}${reloadTick ? `?t=${reloadTick}` : ''}`
        const engDur = activeFile.duration
        const engHasTrim = trimStart > 0.01 || (trimEnd > 0 && trimEnd < engDur - 0.01)
        return (
          <div className="space-y-2">
            <div className="rounded border p-2 bg-bg-card border-border">
              <div className="flex items-center gap-2 mb-1 text-xs">
                <span className="font-semibold text-text-primary">{engineLabel}</span>
                <span className="text-text-secondary">{engDur.toFixed(2)}초</span>
                <span className="ml-auto text-accent font-semibold">사용 중</span>
              </div>
              <AudioWavePlayer
                audioUrl={url}
                duration={engDur}
                heightClass="h-14"
                showRuler
                onTrimStart={(t) => setTrimStart(t)}
                onTrimEnd={(t) => setTrimEnd(t)}
                trimStart={engHasTrim ? trimStart : undefined}
                trimEnd={engHasTrim ? trimEnd : undefined}
                playbackRate={playbackRate}
                gainDb={gainDb}
              />
            </div>
          </div>
        )
      })()}
    </section>
  )
}
