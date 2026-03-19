'use client'

import { useState, useEffect, useRef, useCallback, use } from 'react'
import { TaskPanel } from '@/components/TaskPanel'
import { EpisodeEditor, type EpisodeData } from '@/components/EpisodeEditor'
import { StatusOverview } from '@/components/StatusOverview'
import { VoicePanel } from '@/components/VoicePanel'
import type { R2FileInfo, R2Summary } from '@/components/R2Status'
import { CopyLabel } from '@/components/CopyLabel'
import { ScenarioView } from '@/components/ScenarioView'

const BTN = 'px-3 py-1 rounded text-sm font-semibold'
const BTN_PRIMARY = `bg-accent text-bg-main ${BTN} hover:bg-accent-hover`
const BTN_SECONDARY = `bg-bg-card border border-border ${BTN} hover:bg-bg-hover`

const SECTION_CLS = 'bg-bg-secondary border border-border rounded-lg overflow-hidden'
const HEADER_CLS = 'flex items-center justify-between px-4 py-2.5 cursor-pointer select-none hover:bg-bg-hover transition-colors'

export default function EpisodeDetailPage({ params }: { params: Promise<{ series: string; name: string }> }) {
  const { series, name } = use(params)
  const [episode, setEpisode] = useState<EpisodeData | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [jsonText, setJsonText] = useState('')
  const [openSections, setOpenSections] = useState<Set<string>>(new Set())
  const [viewMode, setViewMode] = useState<'editor' | 'scenario'>('editor')
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const episodeRef = useRef<EpisodeData | null>(null)
  episodeRef.current = episode

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // R2 status
  const [r2Files, setR2Files] = useState<R2FileInfo[]>([])
  const [r2Summary, setR2Summary] = useState<R2Summary>({ total: 0, totalSizeKB: 0, synced: 0, unsynced: 0, localOnly: 0 })

  const fetchEpisode = useCallback(() => {
    fetch(`/api/${series}/episodes/${name}`)
      .then(r => r.json())
      .then(ep => { setEpisode(ep); setJsonText(JSON.stringify(ep, null, 2)); setDirty(false) })
      .catch(() => {})
  }, [series, name])

  const fetchR2 = useCallback(() => {
    fetch(`/api/${series}/voice/r2-files/${name}`)
      .then(r => r.json())
      .then(data => {
        setR2Files(data.files ?? [])
        setR2Summary(data.summary ?? { total: 0, totalSizeKB: 0, synced: 0, unsynced: 0, localOnly: 0 })
      })
      .catch(() => {})
  }, [series, name])

  useEffect(() => {
    fetchEpisode()
    fetchR2()
  }, [fetchEpisode, fetchR2])

  const post = useCallback(async (url: string, body: unknown) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      alert('실패: ' + (err.error ?? res.statusText))
    }
  }, [])

  const playVoice = useCallback((fileName: string) => {
    if (audioRef.current) audioRef.current.pause()
    audioRef.current = new Audio(`/api/${series}/voice/play/${name}/${fileName}`)
    audioRef.current.play()
  }, [series, name])

  const handleEditorChange = useCallback((ep: EpisodeData) => {
    setEpisode(ep)
    setJsonText(JSON.stringify(ep, null, 2))
    setDirty(true)
  }, [])

  const saveEpisode = async (data?: EpisodeData) => {
    const toSave = data ?? episodeRef.current
    if (!toSave) return
    setSaving(true)
    try {
      const res = await fetch(`/api/${series}/episodes/${name}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toSave),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? res.statusText)
      setEpisode(toSave)
      setJsonText(JSON.stringify(toSave, null, 2))
      setDirty(false)
    } catch (e: unknown) {
      alert('저장 실패: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }

  const saveFromJson = async () => {
    try {
      const parsed = JSON.parse(jsonText)
      await saveEpisode(parsed)
    } catch (e: unknown) {
      alert('JSON 오류: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  if (!episode) return <div className="text-text-dim">로딩...</div>

  return (
    <div className="space-y-4">
      {/* Header + Save */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">{episode.host.nickname ?? name}</h1>
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            <span>{name} · {episode.books.length}권{episode.shorts ? ' · Shorts' : ''}</span>
            <div className="flex bg-bg-card border border-border rounded-md overflow-hidden text-xs">
              <button
                onClick={() => setViewMode('editor')}
                className={`px-3 py-1 font-semibold transition-colors ${viewMode === 'editor' ? 'bg-accent text-bg-main' : 'text-text-secondary hover:text-text-primary'}`}
              >에디터</button>
              <button
                onClick={() => setViewMode('scenario')}
                className={`px-3 py-1 font-semibold transition-colors ${viewMode === 'scenario' ? 'bg-accent text-bg-main' : 'text-text-secondary hover:text-text-primary'}`}
              >시나리오</button>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {dirty && <span className="text-xs text-warning-text">미저장</span>}
          <button onClick={() => saveEpisode()} disabled={!dirty || saving}
            className={`${BTN_PRIMARY} ${!dirty ? 'opacity-40 cursor-default' : ''}`}>
            {saving ? '저장 중...' : '저장'}
          </button>
          <button onClick={fetchEpisode} className={BTN_SECONDARY}>새로고침</button>
        </div>
      </div>

      {viewMode === 'scenario' ? (
        <ScenarioView episode={episode} />
      ) : <>

      {/* Status Overview */}
      <section className={SECTION_CLS}>
        <div className={HEADER_CLS} onClick={() => toggleSection('status')}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-accent tracking-widest">STATUS</span>
            <CopyLabel text="STATUS" />
          </div>
          <span className="text-text-dim text-xs">{openSections.has('status') ? '▼' : '▶'}</span>
        </div>
        {openSections.has('status') && (
          <div className="px-4 pb-3">
            <StatusOverview episode={episode} fileNames={r2Files.map(f => f.name)} r2Summary={r2Summary} series={series} name={name} />
          </div>
        )}
      </section>

      {/* Structured Editor */}
      <section className={SECTION_CLS}>
        <div className={HEADER_CLS} onClick={() => toggleSection('editor')}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-accent tracking-widest">EDITOR</span>
            <CopyLabel text="EDITOR" />
          </div>
          <span className="text-text-dim text-xs">{openSections.has('editor') ? '▼' : '▶'}</span>
        </div>
        {openSections.has('editor') && (
          <div className="px-4 pb-4">
            <EpisodeEditor episode={episode} onChange={handleEditorChange} />
          </div>
        )}
      </section>

      {/* Voice & Storage (unified) */}
      <VoicePanel
        episode={episode}
        r2Files={r2Files}
        r2Summary={r2Summary}
        series={series}
        name={name}
        playVoice={playVoice}
        onRefresh={fetchR2}
        onEpisodeChange={handleEditorChange}
        onSave={(data) => saveEpisode(data)}
        post={post}
      />


      {/* Render */}
      <section className={SECTION_CLS}>
        <div className={HEADER_CLS} onClick={() => toggleSection('render')}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-accent tracking-widest">RENDER</span>
            <CopyLabel text="RENDER" />
          </div>
          <span className="text-text-dim text-xs">{openSections.has('render') ? '▼' : '▶'}</span>
        </div>
        {openSections.has('render') && (
          <div className="px-4 pb-4 space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <button onClick={() => post(`/api/${series}/render`, { episode: name })}
                  className={BTN_PRIMARY}>전체 렌더</button>
                <span className="text-[11px] text-text-dim">롱폼 + 쇼츠 모두 렌더링</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => post(`/api/${series}/render`, { episode: name, only: 'longform' })}
                  className={BTN_SECONDARY}>롱폼만</button>
                <span className="text-[11px] text-text-dim">16:9 롱폼 영상만 렌더링</span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => post(`/api/${series}/render`, { episode: name, only: 'shorts' })}
                  className={BTN_SECONDARY}>쇼츠만</button>
                <span className="text-[11px] text-text-dim">9:16 쇼츠 영상만 렌더링</span>
              </div>
            </div>
            <p className="text-[11px] text-text-dim leading-relaxed">
              음성 파일이 모두 준비된 후 실행하세요. 렌더링은 약 5-10분 소요됩니다.
            </p>
          </div>
        )}
      </section>

      {/* Tasks */}
      <section className={SECTION_CLS}>
        <div className={HEADER_CLS} onClick={() => toggleSection('tasks')}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-accent tracking-widest">TASKS</span>
            <CopyLabel text="TASKS" />
          </div>
          <span className="text-text-dim text-xs">{openSections.has('tasks') ? '▼' : '▶'}</span>
        </div>
        {openSections.has('tasks') && (
          <div className="px-4 pb-4">
            <TaskPanel />
          </div>
        )}
      </section>

      {/* Raw JSON */}
      <section className={SECTION_CLS}>
        <div className={HEADER_CLS} onClick={() => toggleSection('rawJson')}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-accent tracking-widest">RAW JSON</span>
            <CopyLabel text="RAW JSON" />
          </div>
          <span className="text-text-dim text-xs">{openSections.has('rawJson') ? '▼' : '▶'}</span>
        </div>
        {openSections.has('rawJson') && (
          <div className="px-4 pb-4">
            <textarea value={jsonText} onChange={e => { setJsonText(e.target.value); setDirty(true) }}
              className="w-full min-h-[300px] bg-bg-main border border-border rounded-md p-3 font-mono text-xs resize-y focus:outline-none focus:border-accent" />
            <div className="flex gap-2 mt-2">
              <button onClick={saveFromJson} className={BTN_PRIMARY}>JSON 저장</button>
              <button onClick={() => { setJsonText(JSON.stringify(episode, null, 2)); setDirty(false) }} className={BTN_SECONDARY}>되돌리기</button>
            </div>
          </div>
        )}
      </section>

      </>}
    </div>
  )
}
