'use client'

import { useCallback, useEffect, useMemo, useState, type DragEvent, type ReactNode } from 'react'
import type { FactionImageTree, FactionImageTreeFile } from '@/lib/faction-utils'
import { imageSrc } from '../shared/timing'
import { FactionMediaThumb } from '../shared/FactionMediaThumb'
import { FACTION_IMAGE_DND } from '../shared/useFactionImageDrop'
import { ChevronDown, Search, ImageIcon, FolderOpen, Trash2, Plus, Pencil } from '../shared/icons'

const ROOT_LABEL = '(루트)'

/**
 * 세력도 이미지 풀 — 에피소드 폴더 하위 이미지를 폴더 트리 + 그리드로 조망·정리한다.
 * 폴더 만들기·이름변경·삭제, 이미지를 폴더로 끌어 이동(연결 자동 갱신은 부모가 처리),
 * 인물·화보·로고 칸으로 끌어 연결까지 한 곳에서. 빈 폴더도 보인다.
 */
export function FactionImagePool({
  series,
  episodeName,
  usedImages,
  reloadKey = 0,
  onMoveFile,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
}: {
  series: string
  episodeName: string
  /** 영상에 연결된 이미지 경로 집합 (사용/미사용 판정) */
  usedImages: Set<string>
  /** 값이 바뀌면 트리를 다시 불러온다 */
  reloadKey?: number
  /** 파일 이동 — from(파일 상대경로) → toFolder(폴더 상대경로, ''=루트). 성공 시 true */
  onMoveFile?: (from: string, toFolder: string) => Promise<boolean>
  /** 폴더 생성 (a/b 형식 허용) */
  onCreateFolder?: (folder: string) => Promise<boolean>
  /** 폴더 이름변경 */
  onRenameFolder?: (folder: string, newName: string) => Promise<boolean>
  /** 빈 폴더 삭제 */
  onDeleteFolder?: (folder: string) => Promise<boolean>
}) {
  const [tree, setTree] = useState<FactionImageTree | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [opened, setOpened] = useState<Set<string>>(new Set())
  const [preview, setPreview] = useState<FactionImageTreeFile | null>(null)
  const [dragFolder, setDragFolder] = useState<string | null>(null)
  const [editingFolder, setEditingFolder] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/${series}/faction-image?ep=${encodeURIComponent(episodeName)}&tree=1`)
      .then(r => r.json())
      .then((data: FactionImageTree) => setTree(data))
      .catch(() => setTree({ files: [], folders: [] }))
      .finally(() => setLoading(false))
  }, [series, episodeName])

  useEffect(() => { load() }, [load, reloadKey])

  // 에피소드 이미지 폴더를 OS 탐색기로 연다. folder 를 주면 그 하위 폴더를 연다.
  const openFolder = useCallback((folder?: string) => {
    fetch(`/api/${series}/faction-open-folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ep: episodeName, folder }),
    })
      .then(r => r.json())
      .then((data: { ok?: boolean; error?: string }) => {
        if (!data.ok) alert(`폴더를 열 수 없습니다: ${data.error ?? '알 수 없는 오류'}`)
      })
      .catch(() => alert('폴더를 열 수 없습니다.'))
  }, [series, episodeName])

  const q = query.trim().toLowerCase()
  const files = tree?.files ?? []
  const allFolders = tree?.folders ?? []

  // 폴더별 파일 (검색 필터 적용)
  const filesByFolder = useMemo(() => {
    const map = new Map<string, FactionImageTreeFile[]>()
    for (const f of files) {
      if (q && !f.path.toLowerCase().includes(q)) continue
      const k = f.folder || ''
      const list = map.get(k) ?? []
      list.push(f)
      map.set(k, list)
    }
    return map
  }, [files, q])

  const folderSet = useMemo(() => new Set(allFolders), [allFolders])
  const parentOf = (f: string) => { const i = f.lastIndexOf('/'); return i >= 0 ? f.slice(0, i) : '' }

  // 검색 중이면 일치 파일이 있는 폴더(과 그 조상)만 보인다
  const folderHasMatch = useCallback((folder: string): boolean => {
    if (!q) return true
    if (filesByFolder.get(folder)?.length) return true
    for (const k of filesByFolder.keys()) if (k.startsWith(folder + '/')) return true
    return false
  }, [q, filesByFolder])

  const childrenOf = (parent: string) =>
    allFolders.filter(f => parentOf(f) === parent && folderHasMatch(f)).sort((a, b) => a.localeCompare(b))
  // 최상위 = 부모 없음 또는 부모가 목록에 없는 고아
  const topFolders = allFolders
    .filter(f => { const p = parentOf(f); return (p === '' || !folderSet.has(p)) && folderHasMatch(f) })
    .sort((a, b) => a.localeCompare(b))

  const total = tree?.files.length ?? 0
  const usedCount = useMemo(
    () => (tree?.files ?? []).filter(f => usedImages.has(f.path)).length,
    [tree, usedImages],
  )

  const allOpen = allFolders.length > 0 && allFolders.every(k => opened.has(k))
  const toggleOpen = (key: string) =>
    setOpened(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  const toggleAll = () => setOpened(allOpen ? new Set() : new Set(allFolders))

  // 검색 중에는 결과 폴더를 자동으로 펼친다
  useEffect(() => {
    if (q) setOpened(new Set(allFolders))
  }, [q, allFolders])

  // ── 폴더 정리 동작 ──
  const handleCreate = async () => {
    if (!onCreateFolder) return
    const raw = window.prompt('새 폴더 이름 (하위는 a/b 형식)')
    const folder = raw?.trim().replace(/^\/+|\/+$/g, '')
    if (!folder) return
    if (await onCreateFolder(folder)) load()
  }
  const startRename = (folder: string) => {
    setEditingFolder(folder)
    setEditName(folder.split('/').pop() ?? folder)
  }
  const submitRename = async (folder: string) => {
    const newName = editName.trim()
    setEditingFolder(null)
    if (!onRenameFolder) return
    const cur = folder.split('/').pop() ?? folder
    if (!newName || newName === cur) return
    if (await onRenameFolder(folder, newName)) load()
  }
  const handleDelete = async (folder: string) => {
    if (!onDeleteFolder) return
    if (!window.confirm(`폴더 "${folder}" 를 삭제할까요? (비어 있어야 합니다)`)) return
    if (await onDeleteFolder(folder)) load()
  }

  // 파일을 폴더로 끌어 이동
  const onFolderDragOver = (folder: string) => (e: DragEvent) => {
    if (!e.dataTransfer.types.includes(FACTION_IMAGE_DND)) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    if (dragFolder !== folder) setDragFolder(folder)
  }
  const onFolderDrop = (folder: string) => async (e: DragEvent) => {
    const from = e.dataTransfer.getData(FACTION_IMAGE_DND)
    setDragFolder(null)
    if (!from || !onMoveFile) return
    e.preventDefault()
    e.stopPropagation()
    const curFolder = from.includes('/') ? from.slice(0, from.lastIndexOf('/')) : ''
    if (curFolder === folder) return // 같은 폴더면 무시
    if (await onMoveFile(from, folder)) load()
  }

  // 이미지 한 칸 — 클릭: 크게 보기 / 끌기: 연결·이동
  const renderThumb = (f: FactionImageTreeFile) => {
    const isUsed = usedImages.has(f.path)
    return (
      <button
        key={f.path}
        onClick={() => setPreview(f)}
        draggable
        onDragStart={e => {
          e.dataTransfer.setData(FACTION_IMAGE_DND, f.path)
          e.dataTransfer.setData('text/plain', f.path)
          e.dataTransfer.effectAllowed = 'copyMove'
        }}
        className={`group relative flex aspect-square flex-col overflow-hidden rounded border border-border bg-bg-main ${isUsed ? 'opacity-80' : ''}`}
        title={`${f.path}\n클릭: 크게 보기 · 끌어서 인물·화보·로고에 연결 / 폴더에 이동`}
      >
        <FactionMediaThumb src={imageSrc(series, episodeName, f.path)!} alt={f.name} showExt className="h-full w-full" />
        {isUsed && (
          <span className="absolute start-1 top-1 rounded bg-bg-card/90 px-1 py-0.5 text-[10px] font-bold text-text-secondary">
            사용 중
          </span>
        )}
        <span className="absolute inset-x-0 bottom-0 truncate bg-bg-main/85 px-1 py-0.5 text-[10px] text-text-secondary">
          {f.name}
        </span>
      </button>
    )
  }

  // 폴더 한 칸 (재귀). folder='' = 루트
  const renderFolder = (folder: string): ReactNode => {
    const isRoot = folder === ''
    const isOpen = isRoot || opened.has(folder)
    const dirFiles = filesByFolder.get(folder) ?? []
    // 루트의 하위(최상위 폴더)는 아래에서 따로 렌더하므로 여기선 비운다(중복 방지)
    const subs = isRoot ? [] : childrenOf(folder)
    const label = isRoot ? ROOT_LABEL : (folder.split('/').pop() || folder)
    const dropActive = dragFolder === folder
    return (
      <div
        key={folder || '(root)'}
        className={`overflow-hidden rounded-md border ${dropActive ? 'border-accent ring-2 ring-accent' : 'border-border'}`}
        onDragOver={onFolderDragOver(folder)}
        onDragLeave={() => setDragFolder(null)}
        onDrop={onFolderDrop(folder)}
      >
        <div className="group flex w-full items-center bg-bg-card hover:bg-bg-hover">
          <div
            onClick={() => { if (!isRoot && editingFolder !== folder) toggleOpen(folder) }}
            className={`flex min-w-0 flex-1 items-center gap-1.5 px-2 py-1.5 text-start ${isRoot || editingFolder === folder ? '' : 'cursor-pointer'}`}
          >
            {!isRoot && <ChevronDown size={15} className={`shrink-0 text-text-secondary ${isOpen ? '' : '-rotate-90'}`} />}
            {editingFolder === folder && !isRoot ? (
              <input
                autoFocus
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onBlur={() => submitRename(folder)}
                onKeyDown={e => {
                  if (e.key === 'Enter') submitRename(folder)
                  if (e.key === 'Escape') setEditingFolder(null)
                }}
                onClick={e => e.stopPropagation()}
                className="w-full min-w-0 rounded border border-accent bg-bg-main px-1 py-0.5 text-sm font-semibold text-text-primary focus:outline-none"
              />
            ) : (
              <span className="truncate font-semibold text-text-primary">{isRoot ? '📂 ' : '📁 '}{label}</span>
            )}
            <span className="ms-auto shrink-0 ps-2 text-xs text-text-secondary">
              {dirFiles.length}{subs.length ? ` · 📁${subs.length}` : ''}
            </span>
          </div>
          <button
            onClick={() => openFolder(folder || undefined)}
            title="이 폴더를 탐색기로 열기"
            className="flex h-8 w-8 shrink-0 items-center justify-center border-s border-border text-text-secondary hover:!bg-accent/10 hover:!text-accent"
          >
            <FolderOpen size={14} />
          </button>
          {!isRoot && onRenameFolder && (
            <button
              onClick={() => startRename(folder)}
              title="폴더 이름변경"
              className="flex h-8 w-8 shrink-0 items-center justify-center border-s border-border text-text-secondary hover:!bg-accent/10 hover:!text-accent"
            >
              <Pencil size={14} />
            </button>
          )}
          {!isRoot && onDeleteFolder && (
            <button
              onClick={() => handleDelete(folder)}
              title="폴더 삭제 (비어 있어야 함)"
              className="flex h-8 w-8 shrink-0 items-center justify-center border-s border-border text-danger-text hover:!bg-danger/15"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
        {isOpen && (
          <div className="space-y-2 border-t border-border p-2">
            {subs.length > 0 && <div className="space-y-1.5">{subs.map(renderFolder)}</div>}
            {dirFiles.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{dirFiles.map(renderThumb)}</div>
            ) : subs.length === 0 ? (
              <p className="px-1 py-1 text-[10px] text-text-dim">
                {isRoot ? '루트에 이미지 없음' : '비어있음 — 이미지를 여기로 끌어다 놓으면 이동합니다'}
              </p>
            ) : null}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-text-primary">
          이미지 {total}개
          <span className="ml-1.5 font-normal text-text-secondary">
            (사용 {usedCount} · 미사용 {total - usedCount})
          </span>
        </span>
        <div className="flex shrink-0 items-center gap-1.5">
          {onCreateFolder && (
            <button
              onClick={handleCreate}
              title="새 폴더 만들기"
              className="flex items-center gap-1 rounded-md border border-border bg-bg-card px-2 py-1 text-xs font-semibold text-text-secondary hover:bg-bg-hover"
            >
              <Plus size={13} /> 새 폴더
            </button>
          )}
          <button
            onClick={() => openFolder()}
            title="에피소드 이미지 폴더를 탐색기로 열기"
            className="flex items-center gap-1 rounded-md border border-border bg-bg-card px-2 py-1 text-xs font-semibold text-text-secondary hover:bg-bg-hover"
          >
            <FolderOpen size={13} /> 폴더 열기
          </button>
          <button
            onClick={load}
            className="rounded-md border border-border bg-bg-card px-2 py-1 text-xs font-semibold text-text-secondary hover:bg-bg-hover"
          >
            새로고침
          </button>
        </div>
      </div>


      {/* 검색창 */}
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 start-2 flex items-center text-text-dim">
          <Search size={14} />
        </span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="파일명·폴더 검색"
          className="w-full rounded-md border border-border bg-bg-card py-1.5 ps-7 pe-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      {allFolders.length > 0 && (
        <button
          onClick={toggleAll}
          className="self-start rounded-md border border-border bg-bg-card px-2 py-1 text-xs font-semibold text-text-secondary hover:bg-bg-hover"
        >
          {allOpen ? '폴더 전체 접기' : '폴더 전체 펼치기'}
        </button>
      )}

      {loading && <p className="text-text-dim">불러오는 중...</p>}
      {!loading && total === 0 && allFolders.length === 0 && <p className="text-text-dim">이미지가 없습니다.</p>}

      {/* 폴더 트리 */}
      <div className="flex flex-col gap-1.5">
        {topFolders.map(renderFolder)}
      </div>

      {/* 큰 미리보기 */}
      {preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setPreview(null)}
        >
          <div
            className="flex max-h-full max-w-2xl flex-col gap-2"
            onClick={e => e.stopPropagation()}
          >
            <FactionMediaThumb
              src={imageSrc(series, episodeName, preview.path)!}
              alt={preview.name}
              className="max-h-[75vh] w-auto rounded-md border border-border object-contain"
              autoPlay
            />
            <div className="flex items-center gap-2 rounded-md bg-bg-card px-3 py-2">
              <ImageIcon size={14} className="shrink-0 text-text-secondary" />
              <span className="truncate text-sm text-text-primary">{preview.path}</span>
              <span
                className={`ms-auto shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${
                  usedImages.has(preview.path) ? 'bg-bg-main text-text-secondary' : 'bg-accent text-bg-main'
                }`}
              >
                {usedImages.has(preview.path) ? '사용 중' : '미사용'}
              </span>
              <button
                onClick={() => setPreview(null)}
                className="shrink-0 rounded-md border border-border px-2 py-1 text-xs font-semibold text-text-secondary hover:bg-bg-hover"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
