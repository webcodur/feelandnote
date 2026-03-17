'use client'

import { useState, useEffect, useRef, useCallback, use } from 'react'
import Link from 'next/link'
import { TaskPanel } from '@/components/TaskPanel'
import { EpisodeEditor, type EpisodeData } from '@/components/EpisodeEditor'
import { StatusOverview } from '@/components/StatusOverview'
import { VoicePanel } from '@/components/VoicePanel'
import { VoiceTimingEditor } from '@/components/VoiceTimingEditor'
import type { R2FileInfo, R2Summary } from '@/components/R2Status'

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
  const [jsonOpen, setJsonOpen] = useState(false)
  const [timingOpen, setTimingOpen] = useState(false)
  const [selectedTimingKey, setSelectedTimingKey] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

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
    const toSave = data ?? episode
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
            <Link href={`/${series}/${name}/scenario`} className="text-accent hover:text-accent-hover">
              시나리오 보기
            </Link>
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

      {/* Status Overview */}
      <StatusOverview episode={episode} fileNames={r2Files.map(f => f.name)} r2Summary={r2Summary} series={series} name={name} />

      {/* Structured Editor */}
      <EpisodeEditor episode={episode} onChange={handleEditorChange} />

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
        onSave={() => saveEpisode()}
        post={post}
      />

      {/* Voice Timing Editor */}
      {episode.voiceTimings && ((): React.ReactNode => {
        const timingKeys = Object.keys(episode.voiceTimings)

        const getTextForKey = (key: string): string => {
          // narrator
          if (key === 'A1-service-greeting') return episode.narrator.serviceGreeting ?? ''
          if (key === 'A2-service-intro') return episode.narrator.serviceIntro ?? ''
          if (key === 'B1-celeb-intro') return episode.narrator.celebIntro ?? ''
          if (key === 'B2-philosophy') return episode.host.philosophy ?? ''
          if (key === 'E1-outro') return episode.narrator.outro ?? ''
          // books
          const bookMatch = key.match(/^D(\d{2})[a-e]-(.+)$/)
          if (bookMatch) {
            const idx = parseInt(bookMatch[1]) - 1
            const field = bookMatch[2] as string
            const book = episode.books[idx]
            if (!book) return ''
            if (field === 'title') return `${book.title}, ${book.creator}`
            if (field === 'summary') return book.summary
            if (field === 'context') return book.context
            if (field === 'quote') return book.directQuote ?? ''
            if (field === 'context-after') return book.contextAfter ?? ''
          }
          // shorts
          const shortMatch = key.match(/^S\d{2}-(.+)$/)
          if (shortMatch && episode.shorts?.segments) {
            const seg = episode.shorts.segments.find((s: { id: string }) => s.id === shortMatch[1])
            return seg?.text ?? ''
          }
          return ''
        }

        const getDuration = (key: string): number => {
          const timings = (episode.voiceTimings as any)[key]
          if (!timings || timings.length === 0) return 0
          return timings[timings.length - 1].end
        }

        return (
          <section className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 cursor-pointer select-none hover:bg-bg-hover transition-colors"
              onClick={() => setTimingOpen(!timingOpen)}>
              <span className="text-xs font-bold text-accent tracking-widest">VOICE TIMING</span>
              <span className="text-text-dim text-xs">{timingOpen ? '▼' : '▶'} {timingKeys.length}개</span>
            </div>
            {timingOpen && (
              <div className="px-4 pb-4 space-y-3">
                {/* 키 선택 */}
                <div className="flex flex-wrap gap-1">
                  {timingKeys.map(key => (
                    <button key={key} onClick={() => setSelectedTimingKey(selectedTimingKey === key ? null : key)}
                      className={`px-2 py-0.5 rounded text-[10px] ${selectedTimingKey === key ? 'bg-accent text-bg-main' : 'bg-bg-card border border-border hover:bg-bg-hover'}`}>
                      {key}
                    </button>
                  ))}
                </div>

                {/* 선택된 키의 에디터 */}
                {selectedTimingKey && (episode.voiceTimings as any)[selectedTimingKey] && ((): React.ReactNode => {
                  const text = getTextForKey(selectedTimingKey)
                  const sentences = text.split(/(?<=[.?!,])\s+/).filter(Boolean)
                  const timings = (episode.voiceTimings as any)[selectedTimingKey]
                  const dur = getDuration(selectedTimingKey)

                  const audioUrl = `/api/${series}/voice/play/${name}/${selectedTimingKey}.wav`

                  if (sentences.length !== timings.length) {
                    return (
                      <div className="text-xs text-red-400">
                        문장 수({sentences.length})와 타이밍 수({timings.length}) 불일치. /voice-sync 필요.
                      </div>
                    )
                  }

                  return (
                    <VoiceTimingEditor
                      audioUrl={audioUrl}
                      duration={dur}
                      sentences={sentences}
                      timings={timings}
                      onChange={(newTimings) => {
                        const newEp = { ...episode, voiceTimings: { ...(episode.voiceTimings as any), [selectedTimingKey!]: newTimings } }
                        handleEditorChange(newEp)
                      }}
                    />
                  )
                })()}
              </div>
            )}
          </section>
        )
      })()}

      {/* Render */}
      <section className="bg-bg-secondary border border-border rounded-lg p-4 space-y-3">
        <h3 className="text-xs font-bold text-accent tracking-widest">RENDER</h3>
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
      </section>

      {/* Tasks */}
      <TaskPanel />

      {/* Raw JSON (collapsible) */}
      <section className={SECTION_CLS}>
        <div className={HEADER_CLS} onClick={() => setJsonOpen(!jsonOpen)}>
          <span className="text-xs font-bold text-accent tracking-widest">RAW JSON</span>
          <span className="text-text-dim text-xs">{jsonOpen ? '▼' : '▶'}</span>
        </div>
        {jsonOpen && (
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
    </div>
  )
}
