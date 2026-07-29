'use client'

import { useEffect, useState } from 'react'
import { useEpisode } from '@/features/book-recommend/lib/episode-context'
import type { BgmTrack, BookEntry, EpisodeData } from './EpisodeEditor'

type MusicFile = { name: string; duration: number | null }

function BgmRow({ label, track, onChange, options, basePath }: {
  label: 'summary' | 'context'
  track: BgmTrack | undefined
  onChange: (t: BgmTrack | undefined) => void
  options: MusicFile[]
  basePath: string
}) {
  const currentFile = track ? track.file.split('/').pop() ?? '' : ''
  const handleFileChange = (name: string) => {
    if (!name) return onChange(undefined)
    const meta = options.find(o => o.name === name)
    const trackDuration = meta?.duration ?? undefined
    onChange({
      ...(track ?? {}),
      file: `${basePath}/${name}`,
      volume: track?.volume ?? 0.3,
      loop: track?.loop ?? true,
      ...(trackDuration != null ? { trackDuration: Math.round(trackDuration * 100) / 100 } : {}),
    })
  }
  const patch = (k: keyof BgmTrack, v: unknown) => {
    if (!track) return
    const next = { ...track, [k]: v }
    if (v === undefined || v === '' || (typeof v === 'number' && !Number.isFinite(v))) delete (next as Record<string, unknown>)[k]
    onChange(next)
  }
  const num = (v: number | undefined, fallback: string = '') => v != null ? String(v) : fallback
  return (
    <div className="grid grid-cols-[60px_1fr_60px_60px_60px_50px] gap-1.5 items-center text-xs">
      <span className="text-slate-900 font-extrabold font-mono">{label}</span>
      <select value={currentFile} onChange={e => handleFileChange(e.target.value)}
        className="bg-white border border-slate-300 text-slate-950 font-bold rounded px-2.5 py-1 text-xs focus:outline-none focus:border-accent focus:bg-slate-50 cursor-pointer shadow-sm">
        <option value="">— 없음 —</option>
        {options.map(f => (
          <option key={f.name} value={f.name}>
            {f.name}{f.duration != null ? ` (${Math.round(f.duration)}s)` : ''}
          </option>
        ))}
      </select>
      <input type="number" step={0.05} min={0} max={1}
        value={num(track?.volume, '0.3')}
        onChange={e => patch('volume', parseFloat(e.target.value))}
        disabled={!track}
        placeholder="vol"
        className="bg-white border border-slate-300 text-slate-950 font-bold rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:border-accent disabled:opacity-40 shadow-sm" />
      <input type="number" step={0.5} min={0}
        value={num(track?.fadeIn)}
        onChange={e => patch('fadeIn', parseFloat(e.target.value))}
        disabled={!track}
        placeholder="in"
        title="fadeIn (초)"
        className="bg-white border border-slate-300 text-slate-950 font-bold rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:border-accent disabled:opacity-40 shadow-sm" />
      <input type="number" step={0.5} min={0}
        value={num(track?.fadeOut)}
        onChange={e => patch('fadeOut', parseFloat(e.target.value))}
        disabled={!track}
        placeholder="out"
        title="fadeOut (초)"
        className="bg-white border border-slate-300 text-slate-950 font-bold rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:border-accent disabled:opacity-40 shadow-sm" />
      <label className="flex items-center justify-center gap-1.5 text-xs text-slate-900 font-extrabold select-none cursor-pointer" title="루프 재생">
        <input type="checkbox"
          className="w-4 h-4 cursor-pointer accent-accent"
          checked={track ? (track.loop !== false) : false}
          onChange={e => patch('loop', e.target.checked)}
          disabled={!track} />
        loop
      </label>
    </div>
  )
}

export function BgmEditor({ episode, onChange }: {
  episode: EpisodeData
  onChange: (ep: EpisodeData) => void
}) {
  const { series, name } = useEpisode()
  const [options, setOptions] = useState<MusicFile[]>([])
  const [basePath, setBasePath] = useState<string>('')
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/${series}/music/${name}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        if (data.error) { setErr(data.error); return }
        setOptions(data.files ?? [])
        setBasePath(data.basePath ?? '')
      })
      .catch(e => { if (!cancelled) setErr(String(e)) })
    return () => { cancelled = true }
  }, [series, name])

  const books = episode.books ?? []

  const setBookBgm = (idx: number, bgm: BookEntry['bgm']) => {
    const nextBooks = [...books]
    const next = { ...nextBooks[idx] }
    if (bgm) next.bgm = bgm
    else delete next.bgm
    nextBooks[idx] = next
    onChange({ ...episode, books: nextBooks })
  }

  const updateTrack = (bookIdx: number, field: 'summary' | 'context', next: BgmTrack | undefined) => {
    const current = books[bookIdx].bgm ?? {}
    const updated: BookEntry['bgm'] = { ...current, [field]: next }
    if (!updated.summary) delete updated.summary
    if (!updated.context) delete updated.context
    setBookBgm(bookIdx, Object.keys(updated).length > 0 ? updated : undefined)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-slate-800 font-extrabold">
        <span>music/ 폴더 파일: <b className="text-slate-950 font-black">{options.length}개</b></span>
        {err && <span className="text-red-600 font-black">{err}</span>}
      </div>
      {/* 컬럼 헤더 */}
      <div className="grid grid-cols-[60px_1fr_60px_60px_60px_50px] gap-1.5 items-center text-xs font-black text-slate-700 uppercase tracking-wide border-b-2 border-slate-300 pb-1.5">
        <span>구간</span>
        <span>파일</span>
        <span className="text-center">volume</span>
        <span className="text-center">fadeIn</span>
        <span className="text-center">fadeOut</span>
        <span className="text-center">loop</span>
      </div>
      <div className="space-y-3">
        {books.map((book, i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm font-bold">
              <span className="font-mono text-slate-900 font-extrabold w-5">#{i + 1}</span>
              <span className="font-black text-slate-950">{book.title || '(제목 없음)'}</span>
              <span className="text-slate-600 font-bold truncate max-w-40">{book.creator}</span>
            </div>
            <div className="space-y-1 pl-6">
              <BgmRow
                label="summary"
                track={book.bgm?.summary}
                onChange={t => updateTrack(i, 'summary', t)}
                options={options}
                basePath={basePath}
              />
              <BgmRow
                label="context"
                track={book.bgm?.context}
                onChange={t => updateTrack(i, 'context', t)}
                options={options}
                basePath={basePath}
              />
            </div>
          </div>
        ))}
        {books.length === 0 && <div className="text-sm font-black text-slate-500">책이 없다.</div>}
      </div>
    </div>
  )
}
