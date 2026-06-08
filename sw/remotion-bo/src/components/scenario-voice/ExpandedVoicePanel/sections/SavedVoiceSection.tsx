import type { VoiceFile, VoiceSection } from '../../../voice-utils'
import { AudioWavePlayer } from '../../../AudioWavePlayer'

type SavedVoiceSectionProps = {
  section: VoiceSection
  series: string
  name: string
  activeEngine: string
  activeFile: VoiceFile | undefined
  trimStart: number
  setTrimStart: (t: number) => void
  trimEnd: number
  setTrimEnd: (t: number) => void
  trimSaving: boolean
  reloadTick: number
  saveTrimmed: () => void
}

export function SavedVoiceSection({
  section, series, name, activeEngine, activeFile,
  trimStart, setTrimStart, trimEnd, setTrimEnd,
  trimSaving, reloadTick, saveTrimmed,
}: SavedVoiceSectionProps) {
  const engines: { label: string; color: string; borderActive: string; slot: string; file?: VoiceFile }[] = [
    { label: 'GEM', color: 'text-blue-400', borderActive: 'border-blue-400/40', slot: 'gemini', file: section.gemini },
    { label: 'ELE', color: 'text-purple-400', borderActive: 'border-purple-400/40', slot: 'elevenlabs', file: section.elevenlabs },
  ].filter(e => e.file)
  const activeLabel = engines.find(e => e.slot === activeEngine)?.label ?? '—'
  const activeDur = activeFile?.duration ?? 0
  const trimmed = !!activeFile && (trimStart > 0.01 || (trimEnd > 0 && trimEnd < activeFile.duration - 0.01))

  return (
    <section className="rounded-md border border-border bg-bg-main/40 p-4 space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-text-primary">저장된 음원</h3>
        <span className="text-xs text-text-secondary">양끝 드래그로 구간 선택</span>
        <div className="ml-auto flex items-center gap-3 text-xs text-text-secondary">
          <span>슬롯 {engines.length}</span>
          <span className="text-border">·</span>
          <span>현재 <span className="text-text-primary font-semibold">{activeLabel}</span></span>
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

      {/* Waveforms per engine */}
      {engines.length === 0 ? (
        <div className="text-sm text-text-secondary italic px-1 py-2">아직 저장된 음원이 없다. 아래 「새 음원 생성」 에서 만든다.</div>
      ) : (
        <div className="space-y-2">
          {engines.map(eng => {
          const url = `/api/${series}/voice/play/${name}/${eng.file!.name}${reloadTick ? `?t=${reloadTick}` : ''}`
          const isActive = activeEngine === eng.slot
          const engDur = eng.file!.duration
          const engHasTrim = trimStart > 0.01 || (trimEnd > 0 && trimEnd < engDur - 0.01)
          return (
            <div
              key={eng.label}
              className={`rounded border p-2 ${isActive ? 'bg-bg-card border-border' : 'bg-bg-card/40 border-border/40 opacity-70 hover:opacity-100'}`}
            >
              <div className="flex items-center gap-2 mb-1 text-xs">
                <span className="font-semibold text-text-primary">{eng.label}</span>
                <span className="text-text-secondary">{engDur.toFixed(2)}초</span>
                {isActive && <span className="ml-auto text-accent font-semibold">사용 중</span>}
              </div>
              <AudioWavePlayer
                audioUrl={url}
                duration={engDur}
                heightClass="h-14"
                showRuler={isActive}
                onTrimStart={(t) => setTrimStart(t)}
                onTrimEnd={(t) => setTrimEnd(t)}
                trimStart={engHasTrim ? trimStart : undefined}
                trimEnd={engHasTrim ? trimEnd : undefined}
              />
            </div>
          )
        })}
        </div>
      )}
    </section>
  )
}
