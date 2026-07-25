'use client'

/**
 * 편집기 뼈대 부품 한 벌 — 세력도(faction)와 가상 담화(discourse) 편집 화면이 함께 쓴다.
 *
 * 두 편집기는 같은 뼈대를 각자 복제해 두고 있었다(언어 전환 어휘·저장 절차·Ctrl+S·저장 단추·
 * 사진 폴더 조작·시간 표시·시리즈 홈의 새 에피소드 만들기). 특히 언어 어휘는 **주소(URL)에 실려**
 * 두 곳의 값이 갈리면 화면이 열리지 않는다. 이 파일이 그 전부의 단일 원천이다.
 * 부품별로 파일을 쪼개지 않는다 — 여기 한 곳만 보면 된다.
 *
 * 시리즈 차이는 값과 콜백으로 흡수한다.
 *  1) 대본 구조가 달라 사진 경로를 훑는 순회는 각 시리즈가 맡는다. 공통은 「경로 갈아끼우기 규칙」뿐이다
 *     (makePathRemapper) — 두 시리즈의 함수 모양도 (대본, 옛 경로, 새 경로) → 대본 으로 맞췄다.
 *  2) 저장 창구는 둘 다 /api/{series}/episodes/{편}에 대본 전체를 통째로 실어 보낸다(부분 저장 없음).
 *
 * 서버 창구: /api/{series}/episodes(목록·만들기), /api/{series}/episodes/{편}(읽기·저장),
 * /api/{series}/media/folder(폴더 만들기·이름바꾸기·지우기·옮기기), /api/{series}/status(진행 상태).
 */

import { useCallback, useEffect, useState, type RefObject } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Save } from './icons'

// ─────────────────────────────────────────────────────────────────────────────
// 편집 언어
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 편집 언어 모드 — 입력칸의 노출 언어를 가린다(한국어만 / 영어만 / 둘 다).
 * 이 값이 그대로 주소에 실린다(/{시리즈}/{편}/{언어}/{탭}) — 어휘를 바꾸면 라우트가 깨진다.
 * 주소 검사 쪽 정본은 lib/faction-edit-route 의 FACTION_EDIT_LANGS 다.
 */
export type EditLang = 'ko' | 'en' | 'both'

export const EDIT_LANGS: [EditLang, string][] = [['ko', '한국어'], ['en', 'English'], ['both', '둘 다']]

/** 언어 전환 단추 세 개 — 두 편집기 상단 바에 같은 모양으로 놓인다 */
export function EditLangSwitch({ value, onChange }: { value: EditLang; onChange: (next: EditLang) => void }) {
  return (
    <div className="flex items-center gap-0.5 rounded-md border border-border bg-bg-card p-0.5">
      {EDIT_LANGS.map(([v, lbl]) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`rounded px-2 py-1 text-xs ${value === v ? 'bg-accent text-white' : 'text-text-secondary hover:bg-bg-hover'}`}
        >
          {lbl}
        </button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// 시간 표시
// ─────────────────────────────────────────────────────────────────────────────

/** 초 → 분:초 */
export function formatMmss(sec: number): string {
  const total = Math.max(0, Math.round(sec))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

// ─────────────────────────────────────────────────────────────────────────────
// 사진 경로 갈아끼우기 규칙
// ─────────────────────────────────────────────────────────────────────────────

/** 바깥 주소(http…)는 이 편 폴더의 파일이 아니므로 손대지 않는다 */
export const isLocalPath = (v?: string): v is string => !!v && !/^https?:\/\//.test(v)

/**
 * 경로 갈아끼우기 — 파일 하나를 옮겼거나(from=파일 경로) 폴더 이름을 바꿨을 때(from=폴더 경로) 쓴다.
 * 정확히 같은 경로를 바꾸고, 폴더인 경우 그 아래 모든 경로의 앞부분도 새 폴더로 바꾼다.
 * 바깥 주소는 그대로 돌려준다.
 */
export function makePathRemapper(from: string, to: string) {
  return <T extends string | undefined>(v: T): T => {
    if (!isLocalPath(v)) return v
    if (v === from) return to as T
    if (v.startsWith(from + '/')) return (to + v.slice(from.length)) as T
    return v
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 대본 저장 + 사진 폴더 조작
// ─────────────────────────────────────────────────────────────────────────────

/** 화면 우하단에 떠 있는 동그란 저장 단추 — 손댄 곳이 있을 때만 색이 들어온다 */
export function FloatingSaveButton({ dirty, saving, onSave }: { dirty: boolean; saving: boolean; onSave: () => void }) {
  return (
    <button
      onClick={onSave}
      disabled={saving || !dirty}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-1.5 rounded-full px-5 py-3 text-sm font-semibold shadow-lg ${
        dirty ? 'bg-accent text-bg-main hover:bg-accent-hover' : 'border border-border bg-bg-card text-text-dim'
      } disabled:opacity-50`}
    >
      <Save size={16} /> {saving ? '저장 중...' : '저장'}
    </button>
  )
}

/**
 * 편집기 뼈대 — 대본 전체 저장, 손댐·저장 중 표시, Ctrl+S, 사진 폴더 조작 네 가지.
 *
 * 저장은 언제나 scriptRef 의 최신값을 통째로 보낸다(부분 저장 없음). 폴더를 정리하면 디스크의
 * 파일이 먼저 움직이므로, 대본이 가리키던 경로를 새 자리로 따라가게 한 뒤 **그 자리에서 바로 저장한다** —
 * 저장 전에 새로고침하면 사진 연결이 통째로 끊긴 채 남는다.
 */
export function useEpisodeEditor<T>({ series, episodeName, scriptRef, setScript, remapImages, persist }: {
  series: string
  episodeName: string
  /** 편집 중인 대본 — 저장은 항상 이 참조의 최신값을 기록한다 */
  scriptRef: RefObject<T | null>
  setScript: (next: T) => void
  /**
   * 사진 경로 따라가기 — 대본 구조가 시리즈마다 달라 순회는 각자 맡는다.
   * 바뀐 곳이 없으면 받은 대본을 그대로(같은 객체로) 돌려준다.
   */
  remapImages: (script: T, from: string, to: string) => T
  /**
   * 저장 실행부 갈아끼우기(선택). 주지 않으면 예전처럼 `/api/{시리즈}/episodes/{편}` 에 대본을 PUT 한다.
   *
   * 글의 원본이 파일이 아니라 DB 인 시리즈(세력도)는 이 자리에 자기 저장 절차를 넘긴다.
   * 대본만 보내면 안 되기 때문이다 — 그 사이 다른 곳에서 먼저 저장했는지 대조할 기준 시각을
   * 함께 실어 보내야 하고, 저장 뒤에는 새 기준 시각을 받아 들고 있어야 한다.
   * 실패는 **던져야** 한다. 그래야 편집기가 손댐 표시를 지우지 않고 다시 저장하게 남겨 둔다.
   */
  persist?: (script: T) => Promise<void>
}) {
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  /** 대본 전체 저장. 성공하면 true */
  const save = useCallback(async (): Promise<boolean> => {
    const current = scriptRef.current
    if (!current) return false
    setSaving(true)
    try {
      if (persist) {
        await persist(current)
      } else {
        const res = await fetch(`/api/${series}/episodes/${encodeURIComponent(episodeName)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(current),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error ?? res.statusText)
        }
      }
      setDirty(false)
      return true
    } catch (e) {
      alert('저장 실패: ' + (e instanceof Error ? e.message : String(e)))
      return false
    } finally {
      setSaving(false)
    }
  }, [series, episodeName, scriptRef, persist])

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

  /** 폴더 창구 공통 호출 — 옮긴 결과({from, to})를 돌려준다 */
  const folderOp = useCallback(async (
    body: Record<string, unknown>,
  ): Promise<{ from?: string; to?: string; folder?: string } | null> => {
    try {
      const res = await fetch(`/api/${series}/media/folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ep: episodeName, ...body }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.ok) {
        alert('폴더 작업 실패: ' + (data.error ?? res.statusText))
        return null
      }
      return data
    } catch (e) {
      alert('폴더 작업 실패: ' + (e instanceof Error ? e.message : String(e)))
      return null
    }
  }, [series, episodeName])

  /** 옮겨진 경로를 대본이 따라가게 하고 즉시 저장한다. 저장이 실패하면 손댄 상태로 남겨 다시 저장하게 한다 */
  const remapAndPersist = useCallback(async (from?: string, to?: string) => {
    const cur = scriptRef.current
    if (!cur || !from || !to || from === to) return
    const next = remapImages(cur, from, to)
    if (next === cur) return
    scriptRef.current = next
    setScript(next)
    if (!(await save())) setDirty(true)
  }, [scriptRef, setScript, remapImages, save])

  const createFolder = useCallback(
    async (folder: string) => !!(await folderOp({ action: 'create', folder })),
    [folderOp],
  )
  const deleteFolder = useCallback(
    async (folder: string) => !!(await folderOp({ action: 'delete', folder })),
    [folderOp],
  )
  const deleteFile = useCallback(
    async (file: string) => {
      try {
        const res = await fetch(`/api/${series}/media?ep=${encodeURIComponent(episodeName)}&file=${encodeURIComponent(file)}`, { method: 'DELETE' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.ok) {
          alert('파일 삭제 실패: ' + (data.error ?? res.statusText))
          return false
        }
        return true
      } catch (e) {
        alert('파일 삭제 실패: ' + (e instanceof Error ? e.message : String(e)))
        return false
      }
    },
    [series, episodeName],
  )
  const moveFile = useCallback(async (from: string, toFolder: string) => {
    const r = await folderOp({ action: 'move', from, toFolder })
    if (!r) return false
    await remapAndPersist(r.from, r.to)
    return true
  }, [folderOp, remapAndPersist])
  const renameFolder = useCallback(async (folder: string, newName: string) => {
    const r = await folderOp({ action: 'rename', folder, name: newName })
    if (!r) return false
    await remapAndPersist(r.from, r.to)
    return true
  }, [folderOp, remapAndPersist])

  return { dirty, setDirty, saving, save, createFolder, deleteFolder, moveFile, renameFolder, deleteFile }
}

// ─────────────────────────────────────────────────────────────────────────────
// 시리즈 홈 — 진행 상태 · 새 에피소드 만들기
// ─────────────────────────────────────────────────────────────────────────────

/** 진행 상태 — 할 일 / 공개 / 완료. 세력도·담화가 같은 어휘를 쓴다 */
export type EpisodeStatus = 'todo' | 'live' | 'done'

export const EPISODE_STATUS_OPTIONS: { value: EpisodeStatus; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'live', label: 'Live' },
  { value: 'done', label: 'Done' },
]

/** 상태 점 색 */
export const EPISODE_STATUS_DOT: Record<EpisodeStatus, string> = {
  todo: 'bg-amber-500',
  live: 'bg-blue-500',
  done: 'bg-green-500',
}

/** 상태 점 하나 */
export function EpisodeStatusDot({ status }: { status: EpisodeStatus }) {
  return <span className={`h-2 w-2 shrink-0 rounded-full ${EPISODE_STATUS_DOT[status]}`} title={status} />
}

/**
 * 새 에피소드 만들기 폼 — 폴더명과 영상 명칭을 받아 만들고 그 편으로 넘어간다.
 *
 * 폴더명이 그대로 영상 조각의 이름이 되므로 영문 소문자·숫자·하이픈만 받는다.
 * 같은 이름이 이미 있으면 서버가 409 로 알려 준다.
 */
export function EpisodeCreateForm({ series, heading, slugPlaceholder, submitLabel }: {
  series: string
  /** 폼 위에 적히는 이름 (예: 새 세력도) */
  heading: string
  /** 폴더명 칸의 예시 문구 */
  slugPlaceholder: string
  submitLabel: string
}) {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)

  const create = async () => {
    const folder = slug.trim().toLowerCase()
    if (!folder) { alert('폴더명을 입력하세요.'); return }
    if (!/^[a-z0-9-]+$/.test(folder)) { alert('폴더명은 영문 소문자, 숫자, 하이픈만 가능합니다.'); return }
    setCreating(true)
    try {
      const res = await fetch(`/api/${series}/episodes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: folder, title: title.trim() || folder }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 409) { alert('이미 존재하는 이름입니다.'); return }
      if (!res.ok) { alert('생성 실패: ' + (data.error ?? '')); return }
      router.push(`/${series}/${data.name ?? folder}`)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mb-6 rounded-lg border border-border bg-bg-secondary p-4">
      <p className="mb-3 text-sm font-semibold text-text-secondary">{heading}</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder={slugPlaceholder}
          value={slug}
          onChange={e => setSlug(e.target.value)}
          className="w-56 rounded-md border border-border bg-bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <input
          type="text"
          placeholder="영상 명칭"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-48 rounded-md border border-border bg-bg-card px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <button
          onClick={create}
          disabled={creating}
          className="flex items-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-bg-main hover:bg-accent-hover disabled:opacity-50"
        >
          <Plus size={15} /> {creating ? '생성 중...' : submitLabel}
        </button>
      </div>
    </div>
  )
}
