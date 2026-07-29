'use client'

import { useState, useEffect, useMemo } from 'react'
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
  // shortsIndex = 고정 slot. slot으로 배열 위치를 찾아 읽기·쓰기에 동일 위치 사용(없으면 배열 위치 폴백).
  const shortsArrIdx = (() => { const i = shortsArr.findIndex((s) => s?.slot === shortsIndex); return i >= 0 ? i : shortsIndex - 1 })()
  const currentShorts = shortsArr[shortsArrIdx]
  const bgm: any[] = currentShorts?.bgm ?? []
  const setBgm = (next: any[]) => {
    const arr = [...shortsArr]
    arr[shortsArrIdx] = { ...currentShorts, bgm: next.length ? next : undefined }
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

  // 같은 에피소드의 다른 쇼츠 칸에서 이미 쓰는 음원 → 파일명 → 사용 위치 라벨 목록.
  // 현재 보고 있는 칸(shortsArrIdx)은 제외해 "다른 곳" 사용만 모은다.
  const otherUsage = useMemo(() => {
    const books: any[] = Array.isArray(episode.books) ? episode.books : []
    const slotLabel = (s: any) => {
      const fi = s?.featuredBookIndex
      const title = typeof fi === 'number' ? books[fi]?.title : undefined
      return title ? `「${title}」` : `쇼츠 ${s?.slot ?? '?'}`
    }
    const map = new Map<string, string[]>()
    shortsArr.forEach((s, i) => {
      if (i === shortsArrIdx || !s) return
      const label = slotLabel(s)
      for (const t of (Array.isArray(s.bgm) ? s.bgm : [])) {
        const fn = t?.file?.split('/').pop()
        if (!fn) continue
        const arr = map.get(fn) ?? []
        if (!arr.includes(label)) arr.push(label)
        map.set(fn, arr)
      }
    })
    return map
  }, [shortsArr, shortsArrIdx, episode.books])
  /* eslint-enable @typescript-eslint/no-explicit-any */

  return (
    <EditorPanel
      title="배경음악 (BgmPanel)"
      icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/></svg>}
      collapsible
      summaryNode={
        <>
          {bgm.length > 0 && <span className="text-slate-900 font-extrabold">{bgm.length}트랙</span>}
          {musicFiles.length === 0 && bgm.length === 0 && <span className="text-slate-500 font-bold italic">music/ 파일 없음</span>}
        </>
      }
      contentClassName="p-3 space-y-2"
    >
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => { fetch(`/api/${series}/music/${name}`, { method: 'POST' }).catch(() => {}) }}
          title="오디오 폴더를 파일 탐색기로 연다"
          className="flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-extrabold text-slate-700 shadow-sm hover:border-accent hover:text-accent"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>
          오디오 폴더 열기
        </button>
      </div>
      {bgm.map((t, i) => {
        const fn = t.file?.split('/').pop()
        const elsewhere = fn ? otherUsage.get(fn) : undefined
        return (
        <div key={i} className="flex items-center gap-2 text-sm font-bold">
          <span className="text-slate-950 font-black truncate max-w-[200px]" title={t.file}>{fn ?? '(없음)'}</span>
          {elsewhere && (
            <span className="shrink-0 rounded bg-amber-100 border border-amber-300 px-1.5 py-0.5 text-[11px] font-extrabold text-amber-700"
              title={`${elsewhere.join(', ')} 쇼츠에서도 이 음악을 사용 중`}>
              {elsewhere.join(', ')}에도 사용
            </span>
          )}
          <label className="flex items-center gap-1.5 text-slate-800 shrink-0">
            Vol
            <input type="number" step="0.05" min="0" max="1" className="w-14 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-center text-slate-950 font-bold shadow-sm focus:outline-none focus:border-accent"
              value={t.volume ?? 0.15} onChange={e => updateTrack(i, 'volume', parseFloat(e.target.value) || 0.15)} />
          </label>
          <label className="flex items-center gap-1.5 text-slate-800 shrink-0">
            FadeIn
            <input type="number" step="0.5" min="0" className="w-12 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-center text-slate-950 font-bold shadow-sm focus:outline-none focus:border-accent"
              value={t.fadeIn ?? 2} onChange={e => updateTrack(i, 'fadeIn', parseFloat(e.target.value) || 2)} />s
          </label>
          <label className="flex items-center gap-1.5 text-slate-800 shrink-0">
            FadeOut
            <input type="number" step="0.5" min="0" className="w-12 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-center text-slate-950 font-bold shadow-sm focus:outline-none focus:border-accent"
              value={t.fadeOut ?? 3} onChange={e => updateTrack(i, 'fadeOut', parseFloat(e.target.value) || 3)} />s
          </label>
          <button onClick={() => removeTrack(i)} title="이 트랙 삭제" className="text-slate-600 hover:text-red-600 font-extrabold text-sm leading-none">✕</button>
        </div>
      )})}
      {available.length > 0 ? (
        <div className="flex items-center gap-2">
          <select className="text-sm font-black bg-white border border-slate-300 rounded px-2.5 py-1.5 text-slate-950 shadow-sm cursor-pointer focus:border-accent focus:bg-slate-50 focus:outline-none"
            defaultValue="" onChange={e => { if (e.target.value) { addTrack(e.target.value); e.target.value = '' } }}>
            <option value="" disabled>+ 배경음악 트랙 선택</option>
            {available.map(f => {
              const elsewhere = otherUsage.get(f.name)
              return (
                <option key={f.name} value={f.name}>
                  {f.name}{f.duration != null ? ` (${Math.round(f.duration)}s)` : ''}{elsewhere ? ` — ${elsewhere.join(', ')} 사용중` : ''}
                </option>
              )
            })}
          </select>
        </div>
      ) : musicFiles.length > 0 && bgm.length > 0 ? (
        <span className="text-sm font-black text-slate-500">모든 음악 파일 사용 중</span>
      ) : null}
    </EditorPanel>
  )
}
