'use client'

import { useState, useRef, useEffect } from 'react'
import type { EpisodeData } from '../EpisodeEditor'
import { VoiceTimingEditor } from '../VoiceTimingEditor'
import { getTextsForSection, setTextForSection } from './utils'

/** SYNC mode panel */
export function SyncModeContent({ secKey, episode, episodeData, series, name, onEpisodeChange, onSave, onRefresh }: {
  secKey: string; episode: EpisodeData; episodeData: EpisodeData; series: string; name: string
  onEpisodeChange: (ep: EpisodeData) => void
  onSave: (data: EpisodeData) => Promise<unknown>
  onRefresh: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [autoSaved, setAutoSaved] = useState(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 디바운스 대기 중인 마지막 변경분 — unmount 시 cleanup 에서 즉시 발사해 편집창 닫는 순간의 변경 유실을 막는다.
  const pendingSaveRef = useRef<EpisodeData | null>(null)
  const onSaveRef = useRef(onSave)
  useEffect(() => { onSaveRef.current = onSave }, [onSave])
  const segmentsRef = useRef<string[]>([])
  useEffect(() => () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
      // 대기 중인 변경이 있으면 즉시 fire — cleanup 은 동기라 await 불가하나, fetch 는
      // 백그라운드로 진행되므로 호출만 하면 디스크에는 들어간다.
      if (pendingSaveRef.current) {
        void onSaveRef.current(pendingSaveRef.current)
        pendingSaveRef.current = null
      }
    }
  }, [])
  const timings = (episodeData.voiceTimings as any)?.[secKey] as Array<{ start: number; end: number }> | undefined
  const txts = getTextsForSection(secKey, episodeData)
  const text = txts.original
  const sentences = text.split(/(?<=[.?!,])\s+/).filter(Boolean)
  const audioUrl = `/api/${series}/voice/play/${name}/${secKey}.wav`

  if (!timings || timings.length === 0) {
    return <div className="text-xs text-text-dim">voiceTimings 없음. Voice Sync를 먼저 실행하세요.</div>
  }

  const dur = timings[timings.length - 1]?.end ?? 0

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const segs = segmentsRef.current
    const ep = JSON.parse(JSON.stringify(episodeData)) as EpisodeData
    if (timings.length === segs.length && segs.length > 0) {
      const withText = timings.map((t, i) => ({ ...t, text: segs[i] }))
      ;(ep as any).voiceTimings = { ...((ep as any).voiceTimings ?? {}), [secKey]: withText }
    }
    // 원문(seg.text/summary 등) 은 절대 토막 join 으로 덮어쓰지 않는다.
    // /\s+/ 분할 후 ' ' join 라운드트립이 \n·\n\n 줄바꿈을 모두 파괴한다.
    // 원문 수정은 위쪽 "원문 텍스트" textarea 에서 직접 편집.
    setSaving(true)
    await onSave(ep)
    setSaving(false)
  }

  const handleTimingChange = (newTimings: Array<{ start: number; end: number; text?: string; sub?: string[]; subTimings?: number[] }>) => {
    const newEp = { ...episodeData, voiceTimings: { ...(episodeData.voiceTimings as any), [secKey]: newTimings } }
    onEpisodeChange(newEp)
    // Debounced auto-save — 드래그 멈춘 뒤 500ms 후 저장. 편집창이 그 사이 닫히면
    // cleanup 이 pendingSaveRef 로 즉시 발사한다.
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    pendingSaveRef.current = newEp
    setAutoSaved(false)
    autoSaveTimerRef.current = setTimeout(async () => {
      autoSaveTimerRef.current = null
      pendingSaveRef.current = null
      setAutoSaving(true)
      try { await onSave(newEp); setAutoSaved(true) }
      finally { setAutoSaving(false) }
    }, 500)
  }

  return (
    <div className="space-y-3">
      {/* 상태 표시줄 */}
      <div className="flex items-center gap-3 text-[11px] text-text-secondary">
        <span>Stich {timings.length}개 / {dur.toFixed(2)}초</span>
        {autoSaving && <span className="text-amber-400">저장 중...</span>}
        {!autoSaving && autoSaved && <span className="text-emerald-500">저장됨</span>}
        {sentences.length !== timings.length && (
          <span className="text-amber-400">문장 {sentences.length} / Stich {timings.length}</span>
        )}
      </div>

      {/* 원문 텍스트 */}
      {txts.original && (
        <div className="space-y-1">
          <div className="text-[11px] text-text-dim">원문 텍스트</div>
          <textarea
            value={txts.original}
            onChange={e => onEpisodeChange(setTextForSection(secKey, e.target.value, episodeData))}
            onKeyDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            rows={Math.min(6, Math.max(2, Math.ceil(txts.original.length / 90)))}
            className="w-full bg-bg-main border border-border rounded px-3 py-2 text-sm text-text-secondary resize-y focus:outline-none focus:border-accent select-text"
          />
        </div>
      )}

      {/* 저장 / Voice Sync */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={handleSave} disabled={saving}
          className="px-3 py-1 rounded bg-green-600 text-white text-xs font-semibold hover:bg-green-500 disabled:opacity-50">
          {saving ? '저장 중...' : '타이밍 저장 (텍스트 포함)'}
        </button>
        <button
          onClick={async (e) => {
            e.stopPropagation()
            if (!confirm('Voice Sync를 실행하면 현재 수동 교정값이 모두 Whisper 계산값으로 덮어써집니다. 진행할까요?')) return
            setSaving(true)
            try {
              const res = await fetch(`/api/${series}/voice/analyze`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ episode: name, only: secKey + '.wav' }),
              })
              const data = await res.json()
              if (data.ok) onRefresh()
              else alert('Voice Sync 실패: ' + (data.error ?? 'unknown'))
            } catch (err) { alert('Voice Sync 에러: ' + String(err)) }
            finally { setSaving(false) }
          }}
          disabled={saving}
          className="px-3 py-1 rounded text-xs bg-bg-card border border-border hover:bg-bg-hover text-text-secondary disabled:opacity-50"
        >
          {saving ? 'Sync 중...' : 'Voice Sync (⚠ 수동 교정 덮어씀)'}
        </button>
      </div>

      {/* VoiceTimingEditor — 상위 모달이 큰 화면을 제공하므로 여기선 그냥 full width 렌더 */}
      <div className="bg-bg-main rounded p-3">
        <VoiceTimingEditor
          audioUrl={audioUrl}
          duration={dur}
          sentences={sentences}
          timings={timings}
          segmentsRef={segmentsRef}
          onChange={handleTimingChange}
        />
      </div>
    </div>
  )
}
