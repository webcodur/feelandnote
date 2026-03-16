'use client'

import { useState, useEffect, useRef, use } from 'react'
import Link from 'next/link'
import { TaskPanel } from '@/components/TaskPanel'

type VoiceFile = { name: string; sizeKB: number; duration: number }

export default function EpisodeDetailPage({ params }: { params: Promise<{ series: string; name: string }> }) {
  const { series, name } = use(params)
  const [episode, setEpisode] = useState<Record<string, unknown> | null>(null)
  const [files, setFiles] = useState<VoiceFile[]>([])
  const [jsonText, setJsonText] = useState('')
  const [engine, setEngine] = useState('gemini')
  const [role, setRole] = useState('')
  const [only, setOnly] = useState('')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    fetch(`/api/${series}/episodes/${name}`).then(r => r.json()).then(ep => {
      setEpisode(ep)
      setJsonText(JSON.stringify(ep, null, 2))
    })
    fetch(`/api/${series}/voice/files/${name}`).then(r => r.json()).then(setFiles)
  }, [series, name])

  const post = (url: string, body: unknown) =>
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

  const playVoice = (fileName: string) => {
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(`/api/${series}/voice/play/${name}/${fileName}`)
    audioRef.current.play()
  }

  const saveJson = async () => {
    try {
      const parsed = JSON.parse(jsonText)
      await fetch(`/api/${series}/episodes/${name}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed),
      })
      setEpisode(parsed)
      alert('저장 완료')
    } catch (e: unknown) { alert('JSON 오류: ' + (e instanceof Error ? e.message : String(e))) }
  }

  if (!episode) return <div className="text-text-dim">로딩...</div>

  const host = episode.host as Record<string, unknown> | undefined
  const books = episode.books as unknown[] | undefined

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">{(host?.nickname as string) ?? name}</h1>
        <div className="flex items-center gap-3 text-sm text-text-secondary">
          <span>{name} · {books?.length ?? 0}권{episode.shorts ? ' · Shorts' : ''}</span>
          <Link href={`/${series}/${name}/scenario`} className="text-accent hover:text-accent-hover">
            시나리오 보기
          </Link>
        </div>
      </div>

      {/* Voice */}
      <section className="bg-bg-secondary border border-border rounded-lg p-4">
        <h3 className="text-xs font-bold text-accent tracking-widest mb-3">VOICE</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <select value={engine} onChange={e => setEngine(e.target.value)}
            className="bg-bg-card border border-border rounded px-2 py-1 text-sm">
            <option value="gemini">Gemini</option>
            <option value="cloud">Cloud TTS</option>
          </select>
          <select value={role} onChange={e => setRole(e.target.value)}
            className="bg-bg-card border border-border rounded px-2 py-1 text-sm">
            <option value="">전체</option>
            <option value="narrator">나레이터</option>
            <option value="summary">요약맨</option>
            <option value="celeb">셀럽</option>
          </select>
          <input placeholder="only (e.g. book-0-title)" value={only} onChange={e => setOnly(e.target.value)}
            className="bg-bg-card border border-border rounded px-2 py-1 text-sm w-48" />
          <button onClick={() => post(`/api/${series}/voice/generate`, { episode: name, engine, role: role || undefined, only: only || undefined })}
            className="bg-accent text-bg-main px-3 py-1 rounded text-sm font-semibold hover:bg-accent-hover">
            TTS 생성
          </button>
          <button onClick={() => post(`/api/${series}/voice/generate`, { episode: name, engine, role: role || undefined, only: only || undefined, upload: true })}
            className="bg-bg-card border border-border px-3 py-1 rounded text-sm hover:bg-bg-hover">
            + R2 업로드
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto font-mono text-xs">
          {files.map(f => (
            <div key={f.name} className="flex items-center py-1 border-b border-bg-main gap-2">
              <button onClick={() => playVoice(f.name)} className="text-accent hover:text-accent-hover shrink-0">▶</button>
              <span className="flex-1 text-text-secondary truncate">{f.name}</span>
              <span className="text-success-text w-12 text-right">{f.duration}s</span>
              <span className="text-text-dim w-14 text-right">{f.sizeKB}KB</span>
            </div>
          ))}
          {files.length === 0 && <div className="text-text-dim py-2">음성 파일 없음</div>}
        </div>
      </section>

      {/* R2 */}
      <section className="bg-bg-secondary border border-border rounded-lg p-4">
        <h3 className="text-xs font-bold text-accent tracking-widest mb-3">R2 STORAGE</h3>
        <div className="flex gap-2">
          <button onClick={() => post(`/api/${series}/voice/upload`, { episode: name })}
            className="bg-accent text-bg-main px-3 py-1 rounded text-sm font-semibold hover:bg-accent-hover">R2 업로드</button>
          <button onClick={() => post(`/api/${series}/voice/pull`, { episode: name })}
            className="bg-bg-card border border-border px-3 py-1 rounded text-sm hover:bg-bg-hover">R2 다운로드</button>
          <button onClick={() => post(`/api/${series}/voice/upload`, { episode: name, force: true })}
            className="bg-bg-card border border-border px-3 py-1 rounded text-sm hover:bg-bg-hover">전체 재업로드</button>
        </div>
      </section>

      {/* Render */}
      <section className="bg-bg-secondary border border-border rounded-lg p-4">
        <h3 className="text-xs font-bold text-accent tracking-widest mb-3">RENDER</h3>
        <div className="flex gap-2">
          <button onClick={() => post(`/api/${series}/render`, { episode: name })}
            className="bg-accent text-bg-main px-3 py-1 rounded text-sm font-semibold hover:bg-accent-hover">전체 렌더</button>
          <button onClick={() => post(`/api/${series}/render`, { episode: name, only: 'longform' })}
            className="bg-bg-card border border-border px-3 py-1 rounded text-sm hover:bg-bg-hover">롱폼만</button>
          <button onClick={() => post(`/api/${series}/render`, { episode: name, only: 'shorts' })}
            className="bg-bg-card border border-border px-3 py-1 rounded text-sm hover:bg-bg-hover">쇼츠만</button>
        </div>
      </section>

      <TaskPanel />

      {/* JSON Editor */}
      <section className="bg-bg-secondary border border-border rounded-lg p-4">
        <h3 className="text-xs font-bold text-accent tracking-widest mb-3">JSON EDITOR</h3>
        <textarea value={jsonText} onChange={e => setJsonText(e.target.value)}
          className="w-full min-h-[300px] bg-bg-main border border-border rounded-md p-3 font-mono text-xs resize-y focus:outline-none focus:border-accent" />
        <div className="flex gap-2 mt-2">
          <button onClick={saveJson}
            className="bg-accent text-bg-main px-3 py-1 rounded text-sm font-semibold hover:bg-accent-hover">저장</button>
          <button onClick={() => setJsonText(JSON.stringify(episode, null, 2))}
            className="bg-bg-card border border-border px-3 py-1 rounded text-sm hover:bg-bg-hover">새로고침</button>
        </div>
      </section>
    </div>
  )
}
