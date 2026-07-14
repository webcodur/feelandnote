'use client'

import { Captions, Check, Clock3, LoaderCircle, Play, Plus, Save, Trash2, Users } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { AudioJob, MediaSegment, SegmentSpeaker } from '@/lib/types'
import { WaveformTimeline } from './WaveformTimeline'

type Selection = { segments: MediaSegment[]; trainingSpeaker: 'A' | 'B' }
type Props = { job: AudioJob; busy: boolean; onSave: (values: Selection) => Promise<void>; onTranscribe: (values: Selection) => Promise<void> }
const SPEAKERS: { value: SegmentSpeaker; label: string }[] = [
  { value: 'A', label: '화자 A' }, { value: 'B', label: '화자 B' }, { value: 'overlap', label: '겹친 음성' },
]

export function MediaSegmentEditor({ job, busy, onSave, onTranscribe }: Props) {
  const mediaRef = useRef<HTMLMediaElement | null>(null)
  const previewEndRef = useRef<number | null>(null)
  const saveRef = useRef(onSave)
  const [segments, setSegments] = useState<MediaSegment[]>(job.segments ?? [])
  const [trainingSpeaker, setTrainingSpeaker] = useState<'A' | 'B'>(job.trainingSpeaker ?? 'A')
  const [duration, setDuration] = useState(job.durationSeconds ?? 0)
  const [current, setCurrent] = useState(0)
  const [markIn, setMarkIn] = useState<number | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!dirty) { setSegments(job.segments ?? []); setTrainingSpeaker(job.trainingSpeaker ?? 'A') }
  }, [job.id, job.updatedAt, dirty])
  useEffect(() => { saveRef.current = onSave }, [onSave])
  useEffect(() => {
    if (!dirty || busy) return
    const timer = window.setTimeout(async () => {
      setSaving(true)
      try { await saveRef.current({ segments, trainingSpeaker }); setDirty(false); setError('') }
      catch { setError('자동 저장하지 못했습니다. 다시 저장해 주세요.') }
      setSaving(false)
    }, 1200)
    return () => window.clearTimeout(timer)
  }, [segments, trainingSpeaker, dirty, busy])

  function setMedia(node: HTMLMediaElement | null) { mediaRef.current = node }
  function seek(time: number) { if (mediaRef.current) mediaRef.current.currentTime = time; setCurrent(time) }
  function timeUpdate(media: HTMLMediaElement) {
    setCurrent(media.currentTime)
    if (previewEndRef.current !== null && media.currentTime >= previewEndRef.current) { media.pause(); previewEndRef.current = null }
  }
  function preview(start: number, end: number) {
    const media = mediaRef.current
    if (!media) return
    media.currentTime = start
    previewEndRef.current = end
    void media.play()
  }
  function addSegment() { if (markIn !== null && current - markIn >= 0.5) { addRange(markIn, current); setMarkIn(null) } }
  function addRange(start: number, end: number) {
    const segment: MediaSegment = { id: crypto.randomUUID(), start: Math.round(start * 100) / 100, end: Math.round(end * 100) / 100, speaker: trainingSpeaker, enabled: true, text: '' }
    setSegments((items) => [...items, segment].toSorted((a, b) => a.start - b.start))
    setDirty(true)
  }
  function update(id: string, values: Partial<MediaSegment>) { setSegments((items) => items.map((item) => item.id === id ? { ...item, ...values } : item)); setDirty(true) }
  function remove(id: string) { setSegments((items) => items.filter((item) => item.id !== id)); setDirty(true) }
  async function saveNow() {
    setSaving(true)
    try { await onSave({ segments, trainingSpeaker }); setDirty(false); setError('') }
    catch { setError('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.') }
    setSaving(false)
  }
  async function transcribeNow() {
    setDirty(false)
    setSaving(true)
    try { await onTranscribe({ segments, trainingSpeaker }); setError('') }
    catch { setDirty(true); setError('받아쓰기를 시작하지 못했습니다. 다시 실행해 주세요.') }
    setSaving(false)
  }

  const usable = segments.filter((item) => item.enabled && item.speaker === trainingSpeaker && item.text.trim() && item.end - item.start >= 3 && item.end - item.start <= 10)
  const longCount = segments.filter((item) => item.enabled && item.end - item.start > 10).length
  return <section className="border border-line bg-ink"><EditorHeader busy={busy} dirty={dirty} saving={saving} segmentCount={segments.length} longCount={longCount} onSave={saveNow} onTranscribe={transcribeNow} />{error && <p role="alert" className="border-b border-danger bg-panel px-4 py-3 text-sm text-danger">{error}</p>}<div className="space-y-5 p-4"><Media job={job} setMedia={setMedia} setDuration={setDuration} timeUpdate={timeUpdate} /><WaveformTimeline jobId={job.id} duration={duration} current={current} segments={segments} onSeek={seek} onCreate={addRange} /><ManualSelection current={current} markIn={markIn} setMarkIn={setMarkIn} onAdd={addSegment} />{longCount > 0 && <p className="border border-signal bg-panel-raised px-4 py-3 text-sm leading-6 text-signal"><Captions className="me-2 inline" size={16} />10초가 넘는 선택 {longCount}개는 받아쓰기할 때 문장 단위로 자동 분리됩니다.</p>}<div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-3 text-sm"><Users size={17} className="text-signal" />학습할 사람<select value={trainingSpeaker} onChange={(event) => { setTrainingSpeaker(event.target.value as 'A' | 'B'); setDirty(true) }} className="border border-line bg-panel px-3 py-2"><option value="A">화자 A</option><option value="B">화자 B</option></select></label><p className="text-sm text-muted"><Check className="me-1 inline text-live" size={15} />학습 가능한 구간 {usable.length}개 · 최소 3개 필요</p></div><div className="space-y-2">{segments.map((segment, index) => <SegmentRow key={segment.id} index={index} segment={segment} onPreview={preview} onUpdate={update} onRemove={remove} />)}{segments.length === 0 && <p className="border border-dashed border-line p-5 text-sm leading-6 text-muted">파형을 드래그할 때마다 새 구간이 추가됩니다. 필요한 만큼 반복하세요.</p>}</div></div></section>
}

function EditorHeader({ busy, dirty, saving, segmentCount, longCount, onSave, onTranscribe }: { busy: boolean; dirty: boolean; saving: boolean; segmentCount: number; longCount: number; onSave: () => void; onTranscribe: () => void }) {
  const status = saving ? '변경 내용을 저장하는 중…' : dirty ? '변경됨 · 잠시 후 자동 저장됩니다' : '모든 변경 내용이 저장됨'
  const transcribeLabel = longCount ? '긴 선택 자동 분리·받아쓰기' : segmentCount ? '선택 구간 받아쓰기' : '전체 받아쓰기 후 구간 자동 생성'
  return <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-4"><div><p className="text-sm text-signal">구간 편집</p><h3 className="mt-1 font-display text-lg">필요한 부분을 넓게 골라도 괜찮습니다</h3><p className="mt-2 text-sm text-muted">{status}</p></div><div className="flex flex-wrap gap-2"><button disabled={busy || saving} onClick={onTranscribe} className="flex items-center gap-2 border border-signal px-4 py-2 text-sm font-semibold text-signal disabled:opacity-50"><Captions size={16} />{transcribeLabel}</button><button disabled={busy || saving || !dirty} onClick={onSave} className="flex items-center gap-2 bg-signal px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50">{saving ? <LoaderCircle size={15} /> : <Save size={15} />}지금 저장</button></div></header>
}

function Media({ job, setMedia, setDuration, timeUpdate }: { job: AudioJob; setMedia: (node: HTMLMediaElement | null) => void; setDuration: (value: number) => void; timeUpdate: (media: HTMLMediaElement) => void }) {
  if (job.files.video) return <video ref={setMedia} controls preload="metadata" src={`/api/jobs/${job.id}/audio/video`} className="aspect-video w-full bg-black" onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onTimeUpdate={(event) => timeUpdate(event.currentTarget)} />
  return <audio ref={setMedia} controls preload="metadata" src={`/api/jobs/${job.id}/audio/source`} className="w-full" onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} onTimeUpdate={(event) => timeUpdate(event.currentTarget)} />
}

function ManualSelection({ current, markIn, setMarkIn, onAdd }: { current: number; markIn: number | null; setMarkIn: (value: number) => void; onAdd: () => void }) {
  return <div className="grid gap-3 border border-line bg-panel p-4 md:grid-cols-[1fr_auto_auto]"><div><p className="text-sm text-muted">현재 재생 위치</p><p className="mt-1 font-mono text-xl">{formatTime(current)}</p></div><button onClick={() => setMarkIn(current)} className="border border-line px-4 py-2 text-sm hover:border-signal"><Clock3 className="me-2 inline" size={15} />시작점 지정</button><button onClick={onAdd} disabled={markIn === null || current <= markIn} className="bg-signal px-4 py-2 text-sm font-semibold text-ink disabled:opacity-50"><Plus className="me-2 inline" size={15} />현재 위치까지 추가</button>{markIn !== null && <p className="text-sm text-signal md:col-span-3">시작점 {formatTime(markIn)} 선택됨 · 영상을 더 재생한 뒤 추가하세요.</p>}</div>
}

function SegmentRow({ segment, index, onPreview, onUpdate, onRemove }: { segment: MediaSegment; index: number; onPreview: (start: number, end: number) => void; onUpdate: (id: string, values: Partial<MediaSegment>) => void; onRemove: (id: string) => void }) {
  const length = segment.end - segment.start
  const validDuration = length >= 3 && length <= 10
  return <article className="grid gap-3 border border-line bg-panel p-3 lg:grid-cols-[auto_130px_1fr_auto]"><button onClick={() => onPreview(segment.start, segment.end)} className="flex items-center gap-2 text-sm text-signal"><Play size={15} />{index + 1}. {formatTime(segment.start)}–{formatTime(segment.end)}</button><select aria-label={`${index + 1}번 화자`} value={segment.speaker} onChange={(event) => onUpdate(segment.id, { speaker: event.target.value as SegmentSpeaker })} className="border border-line bg-ink px-2 py-2 text-sm">{SPEAKERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><input aria-label={`${index + 1}번 받아쓰기`} value={segment.text} onChange={(event) => onUpdate(segment.id, { text: event.target.value })} placeholder={length > 10 ? '받아쓰면 문장별로 자동 분리' : '아직 받아쓰기 전'} className="min-w-0 border border-line bg-ink px-3 py-2 text-sm" /><div className="flex items-center justify-end gap-2"><label className="text-sm"><input type="checkbox" checked={segment.enabled} onChange={(event) => onUpdate(segment.id, { enabled: event.target.checked })} className="me-2 accent-signal" />사용</label><span className={`text-sm ${validDuration ? 'text-live' : length > 10 ? 'text-signal' : 'text-danger'}`}>{length.toFixed(1)}초{length > 10 ? ' · 자동 분리' : ''}</span><button aria-label={`${index + 1}번 삭제`} onClick={() => onRemove(segment.id)} className="p-2 text-muted hover:text-danger"><Trash2 size={16} /></button></div></article>
}

function formatTime(seconds: number) { return `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}.${Math.floor(seconds % 1 * 10)}` }
