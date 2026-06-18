'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { FactionScript, FactionGroup } from '@/lib/faction-types'
import { totalSec, cueCount, formatMmss } from './timing'
import { Plus, Save, Eye, Upload, Film, ImageIcon } from './icons'
import { FactionGroupEditor } from './FactionGroupEditor'
import { FactionCopyButton } from './FactionCopyButton'
import { FactionPreview } from './FactionPreview'
import { FactionImagePool } from './FactionImagePool'
import { collectUsedImages } from './usedImages'
import { TaskPanel } from '@/components/TaskPanel'
import { UiLabel } from '@/components/ui-label'

const EMPTY_GROUP: FactionGroup = { name: '', tagline: '', color: '#92400e', people: [] }

export function FactionEditor({ series, name }: { series: string; name: string }) {
  const [script, setScript] = useState<FactionScript | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showPool, setShowPool] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [musicList, setMusicList] = useState<string[]>([])
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

  // 음악 업로드
  const uploadMusic = async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`/api/${series}/faction-music`, { method: 'POST', body: form })
    const data = await res.json()
    if (res.ok && data.file) {
      loadMusic()
      update({ music: data.file })
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

        <div className="flex flex-wrap items-start gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <label className="w-24 shrink-0 text-xs text-text-dim">제목 -</label>
              <input
                type="text"
                placeholder="제목"
                value={script.title}
                onChange={e => update({ title: e.target.value })}
                className="w-full rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-bold focus:border-accent focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-24 shrink-0 text-xs text-text-dim">제목(영문) -</label>
              <input
                type="text"
                placeholder="EN 제목 (영문)"
                value={script.titleEn ?? ''}
                onChange={e => update({ titleEn: e.target.value })}
                className="w-full rounded-md border border-border/60 bg-bg-card/50 px-3 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none"
              />
            </div>
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <label className="w-24 shrink-0 text-xs text-text-dim">부제 -</label>
              <input
                type="text"
                placeholder="부제"
                value={script.subtitle ?? ''}
                onChange={e => update({ subtitle: e.target.value })}
                className="w-full rounded-md border border-border bg-bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="w-24 shrink-0 text-xs text-text-dim">부제(영문) -</label>
              <input
                type="text"
                placeholder="EN 부제 (영문)"
                value={script.subtitleEn ?? ''}
                onChange={e => update({ subtitleEn: e.target.value })}
                className="w-full rounded-md border border-border/60 bg-bg-card/50 px-3 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* 음악 선택 */}
          <div className="flex items-center gap-2">
            <label className="shrink-0 text-xs text-text-dim">배경음악 -</label>
            <select
              value={script.music ?? ''}
              onChange={e => update({ music: e.target.value || undefined })}
              className="rounded-md border border-border bg-bg-card px-2 py-2 text-sm"
            >
              <option value="">배경음악 없음</option>
              {musicList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
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
            <Upload size={15} /> 음악 추가
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
        <FactionPreview script={script} series={series} episodeName={name} />
      ) : (
        <div className="space-y-3">
          {groups.map((g, i) => (
            <FactionGroupEditor
              key={i}
              group={g}
              onChange={next => setGroup(i, next)}
              onDelete={() => deleteGroup(i)}
              onMoveUp={() => moveGroup(i, -1)}
              onMoveDown={() => moveGroup(i, 1)}
              series={series}
              episodeName={name}
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
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-center gap-2">
                <label className="w-24 shrink-0 text-xs text-text-dim">마무리 제목 -</label>
                <input
                  type="text"
                  placeholder="마무리 큰 제목"
                  value={script.outroTitle ?? ''}
                  onChange={e => update({ outroTitle: e.target.value })}
                  className="w-full rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-bold focus:border-accent focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-24 shrink-0 text-xs text-text-dim">마무리 제목(영문) -</label>
                <input
                  type="text"
                  placeholder="EN 마무리 큰 제목 (영문)"
                  value={script.outroTitleEn ?? ''}
                  onChange={e => update({ outroTitleEn: e.target.value })}
                  className="w-full rounded-md border border-border/60 bg-bg-card/50 px-3 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none"
                />
              </div>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex items-center gap-2">
                <label className="w-24 shrink-0 text-xs text-text-dim">마무리 안내 -</label>
                <input
                  type="text"
                  placeholder="마무리 한 줄 안내 (회차·분야 등)"
                  value={script.outroNote ?? ''}
                  onChange={e => update({ outroNote: e.target.value })}
                  className="w-full rounded-md border border-border bg-bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="w-24 shrink-0 text-xs text-text-dim">마무리 안내(영문) -</label>
                <input
                  type="text"
                  placeholder="EN 마무리 한 줄 안내 (영문)"
                  value={script.outroNoteEn ?? ''}
                  onChange={e => update({ outroNoteEn: e.target.value })}
                  className="w-full rounded-md border border-border/60 bg-bg-card/50 px-3 py-1.5 text-xs text-text-secondary focus:border-accent focus:outline-none"
                />
              </div>
            </div>
          </div>

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
    </div>
  )
}
