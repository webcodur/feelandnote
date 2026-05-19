'use client'

import { useState, useEffect } from 'react'
import type { EpisodeData } from '../EpisodeEditor'
import { EditorPanel } from './EditorPanel'

/**
 * 쇼츠 BGM 패널 — shorts[shortsIndex-1].bgm 배열을 편집한다.
 * 음악 파일은 /api/{series}/music/{name} 에서 목록을 가져온다.
 */
export function BgmPanel({ episode, onUpdate, series, name, shortsIndex }: {
  episode: EpisodeData
  onUpdate: (ep: EpisodeData) => void
  series: string
  name: string
  shortsIndex: number
}) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const shortsArr: any[] = Array.isArray(episode.shorts) ? episode.shorts : (episode.shorts ? [episode.shorts] : [])
  const currentShorts = shortsArr[shortsIndex - 1]
  const bgm: any[] = currentShorts?.bgm ?? []
  const setBgm = (next: any[]) => {
    const arr = [...shortsArr]
    arr[shortsIndex - 1] = { ...currentShorts, bgm: next.length ? next : undefined }
    onUpdate({ ...episode, shorts: arr } as any)
  }

  type MusicFile = { name: string; duration: number | null }
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([])
  const [basePath, setBasePath] = useState('')

  useEffect(() => {
    fetch(`/api/${series}/music/${name}`)
      .then(r => r.json())
      .then(d => { setMusicFiles(d.files ?? []); setBasePath(d.basePath ?? '') })
      .catch(() => {})
  }, [series, name])

  const addTrack = (fileName: string) => {
    const file = basePath ? `${basePath}/${fileName}` : fileName
    const meta = musicFiles.find(f => f.name === fileName)
    const trackDuration = meta?.duration != null ? Math.round(meta.duration * 100) / 100 : undefined
    setBgm([...bgm, { file, volume: 0.15, loop: true, ...(trackDuration != null ? { trackDuration } : {}) }])
  }
  const removeTrack = (i: number) => setBgm(bgm.filter((_, j) => j !== i))
  const updateTrack = (i: number, field: string, value: any) => {
    const next = [...bgm]; next[i] = { ...next[i], [field]: value }; setBgm(next)
  }

  const usedFiles = new Set(bgm.map((t: any) => t.file?.split('/').pop()))
  const available = musicFiles.filter(f => !usedFiles.has(f.name))
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <EditorPanel
      title="배경음악 (BgmPanel)"
      icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>}
      collapsible
      summaryNode={
        <>
          {bgm.length > 0 && <span>{bgm.length}트랙</span>}
          {musicFiles.length === 0 && bgm.length === 0 && <span className="text-text-secondary/50 font-normal italic">music/ 파일 없음</span>}
        </>
      }
      contentClassName="p-3 space-y-2"
    >
      {bgm.map((t, i) => (
        <div key={i} className="flex items-center gap-2 text-[11px]">
          <span className="text-text-primary truncate max-w-[200px]" title={t.file}>{t.file?.split('/').pop() ?? '(없음)'}</span>
          <label className="flex items-center gap-1 text-text-secondary shrink-0">
            Vol
            <input type="number" step="0.05" min="0" max="1" className="w-12 bg-black/40 border border-white/10 rounded px-1 text-center"
              value={t.volume ?? 0.15} onChange={e => updateTrack(i, 'volume', parseFloat(e.target.value) || 0.15)} />
          </label>
          <label className="flex items-center gap-1 text-text-secondary shrink-0">
            FadeIn
            <input type="number" step="0.5" min="0" className="w-10 bg-black/40 border border-white/10 rounded px-1 text-center"
              value={t.fadeIn ?? 2} onChange={e => updateTrack(i, 'fadeIn', parseFloat(e.target.value) || 2)} />s
          </label>
          <label className="flex items-center gap-1 text-text-secondary shrink-0">
            FadeOut
            <input type="number" step="0.5" min="0" className="w-10 bg-black/40 border border-white/10 rounded px-1 text-center"
              value={t.fadeOut ?? 3} onChange={e => updateTrack(i, 'fadeOut', parseFloat(e.target.value) || 3)} />s
          </label>
          <button onClick={() => removeTrack(i)} title="이 트랙 삭제" className="text-text-dim hover:text-red-400 text-sm leading-none">×</button>
        </div>
      ))}
      {available.length > 0 ? (
        <div className="flex items-center gap-2">
          <select className="text-[11px] bg-black/40 border border-white/10 rounded px-2 py-1 text-text-primary"
            defaultValue="" onChange={e => { if (e.target.value) { addTrack(e.target.value); e.target.value = '' } }}>
            <option value="" disabled>+ 트랙 선택</option>
            {available.map(f => (
              <option key={f.name} value={f.name}>
                {f.name}{f.duration != null ? ` (${Math.round(f.duration)}s)` : ''}
              </option>
            ))}
          </select>
        </div>
      ) : musicFiles.length > 0 && bgm.length > 0 ? (
        <span className="text-[11px] text-text-secondary/50">모든 음악 파일 사용 중</span>
      ) : null}
    </EditorPanel>
  )
}
