'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import type { FactionScript, FactionGroup } from '@/lib/faction-types'
import { totalSec, cueCount, formatMmss } from './timing'
import { Plus, Save, Eye, Upload } from './icons'
import { FactionGroupEditor } from './FactionGroupEditor'
import { FactionPreview } from './FactionPreview'
import { UiLabel } from '@/components/ui-label'

const EMPTY_GROUP: FactionGroup = { name: '', tagline: '', color: '#92400e', people: [] }

export function FactionEditor({ series, name }: { series: string; name: string }) {
  const [script, setScript] = useState<FactionScript | null>(null)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
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
      {/* 상단 고정 바 */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-border bg-bg-main/95 px-4 py-3 backdrop-blur">
        <div className="mb-2 flex items-center gap-2">
          <Link href={`/${series}`} className="text-sm text-text-secondary hover:text-accent">← 목록</Link>
          <span className="ml-auto text-xs text-text-secondary">
            총 {formatMmss(totalSec(script))} · 컷 {cueCount(script)}개
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="제목"
            value={script.title}
            onChange={e => update({ title: e.target.value })}
            className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-bold focus:border-accent focus:outline-none"
          />
          <input
            type="text"
            placeholder="부제"
            value={script.subtitle ?? ''}
            onChange={e => update({ subtitle: e.target.value })}
            className="min-w-0 flex-1 rounded-md border border-border bg-bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* 음악 선택 */}
          <select
            value={script.music ?? ''}
            onChange={e => update({ music: e.target.value || undefined })}
            className="rounded-md border border-border bg-bg-card px-2 py-2 text-sm"
          >
            <option value="">배경음악 없음</option>
            {musicList.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
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
            <button
              onClick={() => setShowPreview(v => !v)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover"
            >
              <Eye size={15} /> {showPreview ? '편집' : '미리보기'}
            </button>
            <button
              onClick={save}
              disabled={saving || !dirty}
              className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold ${
                dirty ? 'bg-accent text-bg-main hover:bg-accent-hover' : 'border border-border bg-bg-card text-text-dim'
              } disabled:opacity-50`}
            >
              <Save size={15} /> {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>

      {/* 본문 */}
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
        </div>
      )}
    </div>
  )
}
