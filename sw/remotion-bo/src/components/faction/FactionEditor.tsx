'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { FactionScript, FactionGroup, FactionTrack } from '@/lib/faction-types'
import { totalSec, cueCount, formatMmss, imageSrc } from './timing'

/** 음악 파일 길이(초) 측정 — 브라우저 Audio 메타데이터 */
function measureDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const a = new Audio()
    a.preload = 'metadata'
    a.onloadedmetadata = () => resolve(a.duration)
    a.onerror = () => reject(new Error('음악 메타데이터 로드 실패'))
    a.src = url
  })
}
import { Plus, Save, Eye, Upload, Film, ImageIcon, Mic } from './icons'
import { FactionGroupEditor } from './FactionGroupEditor'
import { FactionCopyButton } from './FactionCopyButton'
import { FactionPreview } from './FactionPreview'
import { FactionImagePool } from './FactionImagePool'
import { FactionImagePicker } from './FactionImagePicker'
import { collectUsedImages } from './usedImages'
import { TaskPanel } from '@/components/TaskPanel'
import { UiLabel } from '@/components/ui-label'
import { FactionVoiceProvider, type FactionVoiceMeta } from './FactionVoiceContext'
import { FactionVoiceModal, type FactionVoiceOptions } from './FactionVoiceModal'

const EMPTY_GROUP: FactionGroup = { name: '', tagline: '', color: '#92400e', people: [] }

export function FactionEditor({ series, name }: { series: string; name: string }) {
  const [script, setScript] = useState<FactionScript | null>(null)
  const [outroPickerOpen, setOutroPickerOpen] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showPool, setShowPool] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [musicList, setMusicList] = useState<string[]>([])
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [voiceFiles, setVoiceFiles] = useState<FactionVoiceMeta[]>([])
  const [regeneratingFile, setRegeneratingFile] = useState<string | null>(null)
  const musicRef = useRef<HTMLInputElement | null>(null)
  const scriptRef = useRef<FactionScript | null>(null)
  scriptRef.current = script

  // 에피소드 로드
  useEffect(() => {
    fetch(`/api/${series}/episodes/${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then((data: FactionScript) => {
        setScript({ ...data, groups: data.groups ?? [] })
        setDirty(false)
      })
      .catch(() => setScript({ title: name, groups: [] }))
  }, [series, name])

  // 음악 목록 로드
  const loadMusic = useCallback(() => {
    fetch(`/api/${series}/faction-music`)
      .then(r => r.json())
      .then(d => setMusicList(Array.isArray(d) ? d : []))
      .catch(() => setMusicList([]))
  }, [series])

  useEffect(() => { loadMusic() }, [loadMusic])

  // 음성 파일 목록 로드 — 인물별 음성 존재 여부·길이 판정용
  const loadVoices = useCallback(() => {
    fetch(`/api/${series}/faction-voice/${encodeURIComponent(name)}`)
      .then(r => r.json())
      .then(d => setVoiceFiles(Array.isArray(d?.files) ? d.files : []))
      .catch(() => setVoiceFiles([]))
  }, [series, name])

  useEffect(() => { loadVoices() }, [loadVoices])

  useEffect(() => {
    if (script) document.title = `${script.title || name} — 세력도`
  }, [script, name])

  // 루트 state 갱신 헬퍼
  const update = useCallback((patch: Partial<FactionScript>) => {
    setScript(prev => (prev ? { ...prev, ...patch } : prev))
    setDirty(true)
  }, [])

  const updateGroups = useCallback((groups: FactionGroup[]) => update({ groups }), [update])

  // 저장
  const save = useCallback(async () => {
    const current = scriptRef.current
    if (!current) return
    setSaving(true)
    try {
      const res = await fetch(`/api/${series}/episodes/${encodeURIComponent(name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(current),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error ?? res.statusText)
      }
      setDirty(false)
    } catch (e) {
      alert('저장 실패: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setSaving(false)
    }
  }, [series, name])

  // Ctrl+S 저장
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (dirty && !saving) save()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dirty, saving, save])

  // 영상 렌더 — 디스크의 최신 데이터로 렌더하므로 변경분은 먼저 저장한다.
  const render = useCallback(async () => {
    if (scriptRef.current && dirty) await save()
    setRendering(true)
    try {
      const res = await fetch(`/api/${series}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode: name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) alert('렌더 시작 실패: ' + (data.error ?? res.statusText))
    } catch (e) {
      alert('렌더 시작 실패: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setRendering(false)
    }
  }, [series, name, dirty, save])

  // 음성 생성 트리거 — 디스크 최신 데이터 기준이므로 변경분을 먼저 저장한다.
  // only 지정 시 그 인물(파일명)만 재생성, 미지정이면 에피소드 전체.
  // engine·normalize·force 는 모달 옵션. 미지정 시 기본(gemini·normalize on·force on).
  type TriggerOpts = { only?: string; engine?: string; normalize?: boolean; force?: boolean }
  const triggerVoice = useCallback(async (opts: TriggerOpts = {}) => {
    if (scriptRef.current && dirty) await save()
    try {
      const body: Record<string, unknown> = { episode: name }
      if (opts.only) body.only = opts.only
      if (opts.engine) body.engine = opts.engine
      if (opts.normalize !== undefined) body.normalize = opts.normalize
      if (opts.force !== undefined) body.force = opts.force
      const res = await fetch(`/api/${series}/faction-voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) alert('음성 생성 시작 실패: ' + (data.error ?? res.statusText))
    } catch (e) {
      alert('음성 생성 시작 실패: ' + (e instanceof Error ? e.message : String(e)))
    }
  }, [series, name, dirty, save])

  // 헤더 버튼 모달의 생성 콜백 — 옵션을 담아 전체/누락분 생성.
  const generateVoice = useCallback(
    (o: FactionVoiceOptions) => triggerVoice({ only: o.only, engine: o.engine, normalize: o.normalize, force: o.force }),
    [triggerVoice],
  )

  // 인물 한 명 음성 재생성 (행 버튼). 생성 후 잠시 뒤 목록 갱신해 길이·존재 반영.
  const regenerateVoice = useCallback(async (file: string) => {
    setRegeneratingFile(file)
    try {
      await triggerVoice({ only: file.replace(/\.wav$/i, '') })
      // 백그라운드 task라 완료 시점을 알 수 없다 — 잠시 뒤 목록만 갱신.
      setTimeout(loadVoices, 4000)
    } finally {
      setRegeneratingFile(null)
    }
  }, [triggerVoice, loadVoices])

  // 음성 재생 URL — 인물 파일명 기준
  const voiceUrl = useCallback(
    (file: string) => `/api/${series}/faction-voice/${encodeURIComponent(name)}/${encodeURIComponent(file)}`,
    [series, name],
  )

  // 파일명 → 메타 맵 (rows에서 존재·길이 조회)
  const voiceByFile = (() => {
    const m = new Map<string, FactionVoiceMeta>()
    for (const v of voiceFiles) m.set(v.file, v)
    return m
  })()

  // 배경음악 트랙 — script.tracks 우선, 없으면 legacy music 한 곡을 트랙으로 본다
  const tracks: FactionTrack[] = script?.tracks?.length
    ? script.tracks
    : script?.music
      ? [{ file: script.music }]
      : []
  const musicUrl = useCallback(
    (file: string) => `/api/${series}/faction-music/${encodeURIComponent(file)}`,
    [series],
  )
  // 트랙 목록 갱신 — 항상 tracks로 일원화하고 legacy music은 비운다
  const setTracks = useCallback(
    (next: FactionTrack[]) => update({ tracks: next.length ? next : undefined, music: undefined }),
    [update],
  )
  // 곡 추가 — 길이를 측정해 함께 저장 (최신 script 기준으로 누적)
  const addTrack = useCallback(async (file: string) => {
    if (!file) return
    let durationSec: number | undefined
    try { durationSec = Math.round(await measureDuration(musicUrl(file))) } catch { /* 측정 실패 시 길이 없이 추가 */ }
    const cur = scriptRef.current
    const curTracks: FactionTrack[] = cur?.tracks?.length
      ? cur.tracks
      : cur?.music ? [{ file: cur.music }] : []
    update({ tracks: [...curTracks, { file, durationSec }], music: undefined })
  }, [musicUrl, update])
  const moveTrack = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= tracks.length) return
    const next = [...tracks]
    ;[next[i], next[j]] = [next[j], next[i]]
    setTracks(next)
  }
  const removeTrack = (i: number) => setTracks(tracks.filter((_, idx) => idx !== i))

  // 길이 미측정 트랙 자동 보정 — 곡 길이가 없으면 영상에서 순차 재생이 안 되므로 채워둔다
  useEffect(() => {
    const missing = (script?.tracks ?? []).filter(t => t.file && (t.durationSec == null || t.durationSec <= 0))
    if (!missing.length) return
    let cancelled = false
    ;(async () => {
      const measured: Record<string, number> = {}
      for (const t of missing) {
        try { measured[t.file] = Math.round(await measureDuration(musicUrl(t.file))) } catch { /* skip */ }
      }
      if (cancelled || !Object.keys(measured).length) return
      const cur = scriptRef.current
      if (!cur?.tracks) return
      update({
        tracks: cur.tracks.map(t =>
          t.durationSec == null && measured[t.file] != null ? { ...t, durationSec: measured[t.file] } : t,
        ),
      })
    })()
    return () => { cancelled = true }
  }, [script?.tracks, musicUrl, update])

  // 음악 업로드 — 저장 후 트랙으로 추가(길이 측정 포함)
  const uploadMusic = async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/${series}/faction-music`, { method: 'POST', body: form })
    const data = await res.json()
    if (res.ok && data.file) {
      loadMusic()
      await addTrack(data.file)
    } else {
      alert('음악 업로드 실패: ' + (data.error ?? ''))
    }
  }

  if (!script) return <div className="p-6 text-text-dim">불러오는 중...</div>

  const groups = script.groups ?? []
  const usedImages = collectUsedImages(script)

  // 세력 조작
  const setGroup = (i: number, g: FactionGroup) => updateGroups(groups.map((x, idx) => (idx === i ? g : x)))
  const deleteGroup = (i: number) => {
    if (!confirm('이 세력을 삭제하시겠습니까?')) return
    updateGroups(groups.filter((_, idx) => idx !== i))
  }
  const moveGroup = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= groups.length) return
    const next = [...groups]
    ;[next[i], next[j]] = [next[j], next[i]]
    updateGroups(next)
  }
  const addGroup = () => updateGroups([...groups, { ...EMPTY_GROUP, people: [] }])

  return (
    <FactionVoiceProvider value={{ byFile: voiceByFile, voiceUrl, regenerate: regenerateVoice, regeneratingFile, reload: loadVoices, episodeName: name, series }}>
    <div className="relative pb-12">
      <UiLabel ko="Faction 편집" code="FactionEditor" />
      {/* 상단 바 */}
      <div className="mb-4 py-3">
        <div className="mb-2 flex items-center gap-2">
          <Link href={`/${series}`} className="text-sm text-text-secondary hover:text-accent">← 목록</Link>
          <span className="ml-auto text-xs text-text-secondary">
            총 {formatMmss(totalSec(script))} · 컷 {cueCount(script)}개
          </span>
        </div>

        <div className="flex flex-col gap-2">
          {/* 제목 + 제목(영문) — 한 줄 나란히 */}
          <div className="flex items-center gap-2">
            <label className="w-20 shrink-0 text-xs text-text-dim">제목 -</label>
            <input
              type="text"
              placeholder="제목"
              value={script.title}
              onChange={e => update({ title: e.target.value })}
              className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-bold focus:border-accent focus:outline-none"
            />
            <label className="w-12 shrink-0 text-xs text-text-dim">(영문) -</label>
            <input
              type="text"
              placeholder="EN 제목 (영문)"
              value={script.titleEn ?? ''}
              onChange={e => update({ titleEn: e.target.value })}
              className="min-w-0 flex-1 rounded-md border border-border/60 bg-bg-card/50 px-3 py-2 text-xs text-text-secondary focus:border-accent focus:outline-none"
            />
          </div>
          {/* 부제 + 부제(영문) — 한 줄 나란히 */}
          <div className="flex items-center gap-2">
            <label className="w-20 shrink-0 text-xs text-text-dim">부제 -</label>
            <input
              type="text"
              placeholder="부제"
              value={script.subtitle ?? ''}
              onChange={e => update({ subtitle: e.target.value })}
              className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
            />
            <label className="w-12 shrink-0 text-xs text-text-dim">(영문) -</label>
            <input
              type="text"
              placeholder="EN 부제 (영문)"
              value={script.subtitleEn ?? ''}
              onChange={e => update({ subtitleEn: e.target.value })}
              className="min-w-0 flex-1 rounded-md border border-border/60 bg-bg-card/50 px-3 py-2 text-xs text-text-secondary focus:border-accent focus:outline-none"
            />
          </div>
          {/* 인물 전환효과 — 세로 쇼츠 인물 사진 모션 */}
          <div className="flex items-center gap-2">
            <label className="w-20 shrink-0 text-xs text-text-dim">전환효과 -</label>
            <select
              value={script.transition ?? 'zoomout'}
              onChange={e => update({ transition: e.target.value as FactionScript['transition'] })}
              className="rounded-md border border-border bg-bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
            >
              <option value="auto">자동 (인물마다 번갈아)</option>
              <option value="zoomout">줌 아웃</option>
              <option value="zoomin">줌 인</option>
              <option value="kenburns">켄번스 (확대+이동)</option>
              <option value="slide">슬라이드</option>
            </select>
            <span className="text-xs text-text-dim">세로 쇼츠 인물 사진 움직임</span>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* 배경음악 — 여러 곡 순서대로 재생, 영상이 더 길면 처음부터 순환 */}
          <div className="flex flex-wrap items-center gap-1.5">
            <label className="shrink-0 text-xs text-text-dim">배경음악 -</label>
            {tracks.map((t, i) => (
              <span key={i} className="flex items-center gap-1 rounded-md border border-border bg-bg-card px-2 py-1 text-xs">
                <span className="text-text-dim">{i + 1}.</span>
                <span className="max-w-[11rem] truncate" title={t.file}>{t.file}</span>
                <span className="text-text-dim">{t.durationSec ? formatMmss(t.durationSec) : '측정중…'}</span>
                <button onClick={() => moveTrack(i, -1)} disabled={i === 0} className="px-0.5 text-text-secondary hover:text-accent disabled:opacity-30" title="앞으로">↑</button>
                <button onClick={() => moveTrack(i, 1)} disabled={i === tracks.length - 1} className="px-0.5 text-text-secondary hover:text-accent disabled:opacity-30" title="뒤로">↓</button>
                <button onClick={() => removeTrack(i)} className="px-0.5 text-danger-text hover:underline" title="제거">×</button>
              </span>
            ))}
            {tracks.length === 0 && <span className="text-xs text-text-dim">없음</span>}
            <select
              value=""
              onChange={e => { addTrack(e.target.value); e.target.value = '' }}
              className="rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm"
            >
              <option value="">+ 곡 추가</option>
              {musicList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            {tracks.length > 1 && (
              <span className="text-xs text-text-dim">음악 합 {formatMmss(tracks.reduce((s, t) => s + (t.durationSec ?? 0), 0))} · 영상 {formatMmss(totalSec(script))}</span>
            )}
          </div>
          <input
            ref={musicRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadMusic(f); e.target.value = '' }}
          />
          <button
            onClick={() => musicRef.current?.click()}
            className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
          >
            <Upload size={15} /> 음악 업로드
          </button>

          <div className="ml-auto flex items-center gap-2">
            <FactionCopyButton script={script} />
            <button
              onClick={() => setShowPool(v => !v)}
              className={`flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm font-semibold ${
                showPool
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border bg-bg-card text-text-secondary hover:bg-bg-hover'
              }`}
              title="이미지 풀 — 폴더별 이미지 조망 (사용/미사용)"
            >
              <ImageIcon size={15} /> 이미지 풀
            </button>
            <button
              onClick={() => setShowPreview(v => !v)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
            >
              <Eye size={15} /> {showPreview ? '편집' : '미리보기'}
            </button>
            <button
              onClick={() => setVoiceModalOpen(true)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
              title="인물 대사 음성 생성 옵션 (엔진·대상·생성 모드)"
            >
              <Mic size={15} /> 음성 생성
            </button>
            <button
              onClick={render}
              disabled={rendering}
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
              title="세로 영상 1편 렌더 (out/Faction/)"
            >
              <Film size={15} /> {rendering ? '시작 중...' : '렌더'}
            </button>
            <button
              onClick={save}
              disabled={saving || !dirty}
              className={`fixed bottom-6 right-6 z-50 flex items-center gap-1.5 rounded-full px-5 py-3 text-sm font-semibold shadow-lg ${
                dirty ? 'bg-accent text-bg-main hover:bg-accent-hover' : 'border border-border bg-bg-card text-text-dim'
              } disabled:opacity-50`}
            >
              <Save size={16} /> {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>

      {/* 본문 — 편집 화면일 때만 이미지 풀 사이드바를 곁들인다 */}
      <div className={!showPreview && showPool ? 'flex items-start gap-4' : ''}>
        <div className="min-w-0 flex-1">
      {showPreview ? (
        <FactionPreview
          script={script}
          series={series}
          episodeName={name}
          onToggleDisabled={gi => setGroup(gi, { ...groups[gi], disabled: groups[gi].disabled ? undefined : true })}
        />
      ) : (
        <div className="space-y-3">
          {groups.map((g, i) => (
            <FactionGroupEditor
              key={i}
              groupIndex={i}
              group={g}
              onChange={next => setGroup(i, next)}
              onDelete={() => deleteGroup(i)}
              onMoveUp={() => moveGroup(i, -1)}
              onMoveDown={() => moveGroup(i, 1)}
              series={series}
              episodeName={name}
              musicList={musicList}
            />
          ))}
          {groups.length === 0 && <p className="text-sm text-text-dim">아직 세력이 없습니다. 아래에서 추가하세요.</p>}

          <button
            onClick={addGroup}
            className="flex items-center gap-1.5 rounded-md border border-dashed border-border bg-bg-card px-4 py-2.5 text-sm font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover"
          >
            <Plus size={16} /> 세력 추가
          </button>

          {/* 마무리 화면 (outro) — 비우면 제목을 그대로 사용 */}
          <div className="mt-6 space-y-2 rounded-md border border-border bg-bg-secondary p-3">
            <p className="text-xs font-semibold text-text-secondary">마무리 화면 (비우면 제목 사용)</p>
            {/* 마무리 제목 + 마무리 제목(영문) — 한 줄 나란히 */}
            <div className="flex items-center gap-2">
              <label className="w-20 shrink-0 text-xs text-text-dim">마무리 제목 -</label>
              <input
                type="text"
                placeholder="마무리 큰 제목"
                value={script.outroTitle ?? ''}
                onChange={e => update({ outroTitle: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-bold focus:border-accent focus:outline-none"
              />
              <label className="w-12 shrink-0 text-xs text-text-dim">(영문) -</label>
              <input
                type="text"
                placeholder="EN 마무리 큰 제목 (영문)"
                value={script.outroTitleEn ?? ''}
                onChange={e => update({ outroTitleEn: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-border/60 bg-bg-card/50 px-3 py-2 text-xs text-text-secondary focus:border-accent focus:outline-none"
              />
            </div>
            {/* 마무리 안내 + 마무리 안내(영문) — 한 줄 나란히 */}
            <div className="flex items-center gap-2">
              <label className="w-20 shrink-0 text-xs text-text-dim">마무리 안내 -</label>
              <input
                type="text"
                placeholder="마무리 한 줄 안내 (회차·분야 등)"
                value={script.outroNote ?? ''}
                onChange={e => update({ outroNote: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
              <label className="w-12 shrink-0 text-xs text-text-dim">(영문) -</label>
              <input
                type="text"
                placeholder="EN 마무리 한 줄 안내 (영문)"
                value={script.outroNoteEn ?? ''}
                onChange={e => update({ outroNoteEn: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-border/60 bg-bg-card/50 px-3 py-2 text-xs text-text-secondary focus:border-accent focus:outline-none"
              />
            </div>
            {/* 엔딩 이미지 — 마무리 화면 풀스크린 배경 한 장 */}
            <div className="flex items-center gap-2">
              <label className="w-20 shrink-0 text-xs text-text-dim">엔딩 이미지 -</label>
              <button
                onClick={() => setOutroPickerOpen(true)}
                className="flex items-center gap-2 rounded-md border border-border bg-bg-card px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover"
              >
                {script.outroImage ? (
                  <img src={imageSrc(series, name, script.outroImage)} alt="" className="h-10 w-16 rounded object-cover" />
                ) : (
                  <ImageIcon size={15} />
                )}
                <span>{script.outroImage ? '엔딩 이미지 변경' : '엔딩 이미지 선택'}</span>
              </button>
              {script.outroImage && (
                <button onClick={() => update({ outroImage: undefined })} className="text-xs text-danger-text hover:underline">
                  제거
                </button>
              )}
            </div>
          </div>
          {outroPickerOpen && (
            <FactionImagePicker
              value={script.outroImage}
              onChange={next => update({ outroImage: next })}
              series={series}
              episodeName={name}
              onClose={() => setOutroPickerOpen(false)}
            />
          )}

          {/* 렌더 진행 상황 */}
          <div className="mt-6 border-t border-border pt-4">
            <TaskPanel />
          </div>
        </div>
      )}
        </div>

        {/* 이미지 풀 사이드바 — 편집 화면에서만 */}
        {!showPreview && showPool && (
          <aside className="sticky top-32 hidden max-h-[calc(100vh-9rem)] w-[34rem] shrink-0 overflow-y-auto rounded-md border border-border bg-bg-main/40 p-3 lg:block">
            <FactionImagePool
              series={series}
              episodeName={name}
              usedImages={usedImages}
            />
          </aside>
        )}
      </div>

      {/* 좁은 화면: 풀을 본문 아래에 펼침 */}
      {!showPreview && showPool && (
        <div className="mt-6 rounded-md border border-border bg-bg-main/40 p-3 lg:hidden">
          <FactionImagePool series={series} episodeName={name} usedImages={usedImages} />
        </div>
      )}

      {/* 음성 생성 옵션 모달 — 헤더 버튼으로 연다 */}
      {voiceModalOpen && (
        <FactionVoiceModal onClose={() => setVoiceModalOpen(false)} onGenerate={generateVoice} />
      )}
    </div>
    </FactionVoiceProvider>
  )
}
