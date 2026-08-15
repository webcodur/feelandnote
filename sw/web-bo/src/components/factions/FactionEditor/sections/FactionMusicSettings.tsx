'use client'

import { ChevronDown, ChevronUp, FolderOpen, Trash2 } from '@feelandnote/shared/bo/icons'
import { formatMmss } from '@feelandnote/shared/bo/editor'
import type { FactionScript, FactionTrack } from '@/lib/faction-types'

type Props = {
  script: FactionScript
  tracks: FactionTrack[]
  musicList: string[]
  videoDurationSec: number
  musicLabel: (file: string) => string
  onChange: (patch: Partial<FactionScript>) => void
  onAddTrack: (file: string) => void
  onMoveTrack: (index: number, direction: -1 | 1) => void
  onRemoveTrack: (index: number) => void
  onTrackVolume: (index: number, volume: number) => void
  onOpenFolder: () => void
}

export function FactionMusicSettings({
  script, tracks, musicList, videoDurationSec, musicLabel, onChange,
  onAddTrack, onMoveTrack, onRemoveTrack, onTrackVolume, onOpenFolder,
}: Props) {
  const tracksDuration = tracks.reduce((sum, track) => sum + (track.durationSec ?? 0), 0)

  return (
    <details className="group border border-border bg-bg-card open:xl:col-span-2">
      <summary className="flex h-12 cursor-pointer list-none items-center gap-3 px-3 hover:bg-bg-hover">
        <span className="shrink-0 text-xs font-black text-accent">음악</span>
        <strong className="min-w-0 flex-1 truncate text-sm text-text-primary">
          {tracks[0]?.file ?? '연결된 곡 없음'}{tracks.length > 1 ? ` 외 ${tracks.length - 1}곡` : ''}
        </strong>
        <span className="text-xs font-mono text-text-tertiary">{formatMmss(tracksDuration)} / {formatMmss(videoDurationSec)}</span>
        <span className="rounded bg-bg-main px-2 py-1 text-[11px] font-semibold text-text-secondary">대사 중 {Math.round((script.musicDuckVolume ?? 1) * 100)}%</span>
        <span aria-hidden="true" className="text-text-tertiary group-open:rotate-180">⌄</span>
      </summary>

      <div className="space-y-2 border-t border-border p-3">
        <div className="space-y-2">
          {tracks.map((track, index) => (
            <div key={`${track.file}-${index}`} className="grid min-h-12 items-center gap-2 border-b border-border/70 px-1 py-1.5 last:border-b-0 sm:grid-cols-[2rem_minmax(0,1fr)_auto_auto]">
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-bg-secondary font-mono text-xs font-bold text-text-secondary">{index + 1}</span>
              <div className="flex min-w-0 items-center gap-3">
                <p className="truncate text-sm font-semibold text-text-primary" title={track.file}>{track.file}</p>
                <span className="shrink-0 font-mono text-xs text-text-tertiary">{Number.isFinite(track.durationSec) && (track.durationSec ?? 0) > 0 ? formatMmss(track.durationSec!) : '측정 중'}</span>
              </div>
              <label className="flex items-center gap-2 text-xs text-text-secondary" title="이 곡 자체의 재생 음량">
                <input type="range" min={0} max={1} step={0.05} value={track.volume ?? 1} onChange={event => onTrackVolume(index, Number(event.target.value))} className="w-24 accent-accent" />
                <span className="w-10 text-right font-mono">{Math.round((track.volume ?? 1) * 100)}%</span>
              </label>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => onMoveTrack(index, -1)} disabled={index === 0} className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" title="앞으로" aria-label={`${track.file} 앞으로 이동`}><ChevronUp size={14} /></button>
                <button type="button" onClick={() => onMoveTrack(index, 1)} disabled={index === tracks.length - 1} className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-text-secondary hover:bg-bg-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent" title="뒤로" aria-label={`${track.file} 뒤로 이동`}><ChevronDown size={14} /></button>
                <span className="mx-0.5 h-5 w-px bg-border" aria-hidden="true" />
                <button type="button" onClick={() => onRemoveTrack(index)} className="flex h-8 w-8 items-center justify-center rounded-md border border-danger/40 text-danger-text hover:border-danger/70 hover:bg-danger/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger" title="목록에서 제거" aria-label={`${track.file} 목록에서 제거`}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}

          {tracks.length === 0 && <p className="py-2 text-xs text-text-tertiary">연결된 공통 곡이 없습니다.</p>}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-2">
          <select value="" onChange={event => { if (event.target.value) onAddTrack(event.target.value); event.target.value = '' }} className="h-9 min-w-64 flex-1 rounded-md border border-dashed border-border bg-bg-main px-3 text-xs font-semibold text-text-secondary hover:border-accent focus:border-accent focus:outline-none"><option value="">+ 공통 곡 추가</option>{musicList.map(file => <option key={file} value={file}>{musicLabel(file)}</option>)}</select>
          <label className="flex items-center gap-2 text-xs text-text-secondary"><span>대사 중</span><input type="range" min={0} max={1} step={0.05} value={script.musicDuckVolume ?? 1} onChange={event => { const volume = Number(event.target.value); onChange({ musicDuckVolume: volume === 1 ? undefined : volume }) }} className="w-28 accent-accent" /><strong className="w-10 text-right font-mono text-text-primary">{Math.round((script.musicDuckVolume ?? 1) * 100)}%</strong></label>
          <button type="button" onClick={onOpenFolder} className="flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-text-primary"><FolderOpen size={14} /> 폴더 열기</button>
        </div>
      </div>
    </details>
  )
}
