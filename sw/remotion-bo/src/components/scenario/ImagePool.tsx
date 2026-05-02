'use client'

import { useEffect, useMemo, useState } from 'react'
import { DraggableImage, ListImage } from './ImageThumb'
import { compareImageNames, parseImagePrefix, fieldFromCode, stripImagePrefix, isVideoFile } from './utils'
import type { ImageField } from './types'

type FolderDropState = { folder: string; active: boolean }

type FieldFilter = 'all' | ImageField
type ViewMode = 'grid' | 'list'
type SortMode = 'default' | 'name' | 'recent'
type UsageFilter = 'all' | 'unused' | 'used'

const USAGE_BUTTONS: { value: UsageFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'unused', label: '미사용만' },
  { value: 'used', label: '사용중만' },
]

const FILTER_BUTTONS: { value: FieldFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'summary', label: 'summary' },
  { value: 'context', label: 'context' },
  { value: 'quote', label: 'quote' },
]

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'default', label: '기본' },
  { value: 'name', label: '이름' },
  { value: 'recent', label: '최신' },
]

const IMAGE_POOL_COLLAPSED_KEY = 'remotion-bo.imagePool.collapsed'

// 사이드바 폭/높이 등 레이아웃 상수
const POOL_STYLES = {
  sidebar: 'w-[600px] shrink-0 border-l border-border/30 p-3 space-y-2 overflow-y-auto max-h-[90vh] sticky top-0 self-start bg-bg-card/30',
  sidebarCollapsed: 'w-8 shrink-0 border-l border-border/30 sticky top-0 self-start bg-bg-card/30 max-h-[90vh]',
  input: 'w-full px-2 py-1 text-[11px] bg-bg-main border border-border/40 rounded focus:outline-none focus:border-accent/60',
  pill: 'px-2 py-0.5 text-[10px] rounded border transition-colors',
  pillActive: 'bg-accent/20 text-accent border-accent/40',
  pillIdle: 'text-text-secondary border-border/40 hover:border-accent/40 hover:text-accent',
  toggleGroup: 'flex items-center gap-0.5 border border-border/40 rounded',
  toggleBtn: 'px-2 py-0.5 text-[10px] transition-colors',
  toggleActive: 'bg-accent/20 text-accent',
  toggleIdle: 'text-text-secondary hover:text-accent',
  sectionHeader: 'w-full flex items-center gap-2 px-2 py-1 bg-bg-card/50 hover:bg-bg-hover transition-colors text-left',
  gridBody: 'grid grid-cols-2 gap-1.5',
  listBody: 'space-y-0.5',
} as const

/** 파일명 끝 `_{숫자}.{ext}` 타임스탬프 추출. 없으면 0 반환 (최신 정렬용) */
function extractTimestamp(fn: string): number {
  const m = fn.match(/_(\d{10,})\.[^.]+$/)
  return m ? parseInt(m[1], 10) : 0
}

function sortBy(mode: SortMode, files: string[]): string[] {
  const arr = [...files]
  if (mode === 'default') return arr.sort(compareImageNames)
  if (mode === 'name') return arr.sort((a, b) => stripImagePrefix(a).localeCompare(stripImagePrefix(b)))
  // recent
  return arr.sort((a, b) => extractTimestamp(b) - extractTimestamp(a))
}

type Group = { key: string; label: string; files: string[] }

/** 미배정·배정 이미지 풀 사이드바 — 검색/필터/뷰모드/아코디언 그룹/정렬 지원 */
export function ImagePool({ allImages, usedFiles, fileBookMap, fileFieldMap, view, imageBaseUrl, bookTitles, onLocate, onDrop, onDelete, onOpenFolder, crossUsage,
  subFolders = [], fileFolders = {}, duplicates = [], onMoveFile, onCreateFolder, onRenameFolder, onDeleteFolder }: {
  /** 에피소드 폴더 전체 이미지 파일명 */
  allImages: string[]
  /** 롱폼/모든 쇼츠에서 사용 중인 파일명 (used 뱃지 + 드래그/추가 비활성 기준) */
  usedFiles: Set<string>
  /** 파일명 → 사용 책 인덱스(0-based). 아코디언 그룹핑 기준 */
  fileBookMap: Map<string, number>
  /** 파일명 → 저장된 field (summary|context|quote). 필터 기준 */
  fileFieldMap: Map<string, ImageField>
  /** 'longform' | 'shorts-<n>' — longform은 shorts- prefix 파일을 기본 숨김 */
  view: string
  imageBaseUrl: string
  /** 책 제목 (accordion 라벨용). 인덱스는 0-based (책1 = bookTitles[0]) */
  bookTitles?: string[]
  /** 바로가기 — 해당 이미지가 배정된 왼쪽 섹션으로 스크롤 이동 */
  onLocate?: (fileName: string) => void
  /** 추가 버튼 클릭 시 (풀에서 직접 추가) */
  onDrop?: (fileName: string) => void
  /** 이미지 삭제 (휴지통) */
  onDelete?: (fileName: string) => void
  /** 폴더 열기 버튼 */
  onOpenFolder?: () => void
  /** 전체 사용 현황 (파일명 → 위치 목록) */
  crossUsage?: Map<string, string[]>
  /** 물리 서브폴더 상대경로 목록 */
  subFolders?: string[]
  /** 파일명 → 폴더 상대경로 ('' = 루트) */
  fileFolders?: Record<string, string>
  /** 파일명 중복 (여러 폴더) */
  duplicates?: Array<{ name: string; folders: string[] }>
  onMoveFile?: (fileName: string, targetFolder: string) => Promise<boolean>
  onCreateFolder?: (folderPath: string) => Promise<boolean>
  onRenameFolder?: (folderPath: string, newName: string) => Promise<boolean>
  onDeleteFolder?: (folderPath: string) => Promise<boolean>
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FieldFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortMode, setSortMode] = useState<SortMode>('default')
  const [usageFilter, setUsageFilter] = useState<UsageFilter>('all')
  const [opened, setOpened] = useState<Set<string>>(new Set())
  const [folderDrop, setFolderDrop] = useState<FolderDropState | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [batchBusy, setBatchBusy] = useState(false)
  // 접기 상태 — localStorage로 세션 간 유지
  const [collapsed, setCollapsed] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    setCollapsed(window.localStorage.getItem(IMAGE_POOL_COLLAPSED_KEY) === '1')
  }, [])
  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(IMAGE_POOL_COLLAPSED_KEY, next ? '1' : '0')
      }
      return next
    })
  }

  const toggleOpen = (key: string) => {
    setOpened(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  const toggleSelect = (fn: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(fn)) next.delete(fn); else next.add(fn)
      return next
    })
  }

  const clearSelection = () => setSelected(new Set())

  /** 드래그 시작 — 선택된 집합에 포함된 파일이면 multi 페이로드 전달 */
  const handleDragStartMulti = (e: React.DragEvent, fileName: string) => {
    e.dataTransfer.effectAllowed = 'copyMove'
    if (selected.has(fileName) && selected.size > 1) {
      e.dataTransfer.setData('text/plain', fileName)
      e.dataTransfer.setData('application/x-image-batch', JSON.stringify([...selected]))
    } else {
      e.dataTransfer.setData('text/plain', fileName)
    }
  }

  const handleFolderDrop = async (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault()
    e.stopPropagation()
    setFolderDrop(null)
    if (!onMoveFile) return
    const batch = e.dataTransfer.getData('application/x-image-batch')
    const files: string[] = batch ? JSON.parse(batch) : [e.dataTransfer.getData('text/plain')].filter(Boolean)
    if (!files.length) return
    setBatchBusy(true)
    try {
      for (const fn of files) {
        const current = fileFolders[fn] ?? ''
        if (current === targetFolder) continue
        const ok = await onMoveFile(fn, targetFolder)
        if (!ok) break
      }
    } finally {
      setBatchBusy(false)
      clearSelection()
    }
  }

  /** 선택된 파일들 일괄 이동 — 액션 바 드롭다운 */
  const batchMove = async (targetFolder: string) => {
    if (!onMoveFile || !selected.size) return
    setBatchBusy(true)
    try {
      for (const fn of selected) {
        const current = fileFolders[fn] ?? ''
        if (current === targetFolder) continue
        const ok = await onMoveFile(fn, targetFolder)
        if (!ok) break
      }
    } finally {
      setBatchBusy(false)
      clearSelection()
    }
  }

  /** 선택된 파일들 일괄 삭제 */
  const batchDelete = async () => {
    if (!onDelete || !selected.size) return
    if (!window.confirm(`선택한 ${selected.size}장을 휴지통으로 이동할까?`)) return
    setBatchBusy(true)
    try {
      for (const fn of selected) await onDelete(fn)
    } finally {
      setBatchBusy(false)
      clearSelection()
    }
  }

  const handleCreateFolder = async () => {
    if (!onCreateFolder) return
    const raw = window.prompt('새 폴더 이름 (하위 경로는 a/b 형식)')
    if (!raw) return
    const cleaned = raw.trim().replace(/^\/+|\/+$/g, '')
    if (!cleaned) return
    await onCreateFolder(cleaned)
  }

  const handleRenameFolder = async (folderPath: string) => {
    if (!onRenameFolder) return
    const current = folderPath.split('/').pop() ?? folderPath
    const next = window.prompt('새 폴더 이름', current)
    if (!next || next.trim() === current) return
    await onRenameFolder(folderPath, next.trim())
  }

  const handleDeleteFolder = async (folderPath: string) => {
    if (!onDeleteFolder) return
    if (!window.confirm(`폴더 "${folderPath}" 를 삭제할까? (비어있어야 함)`)) return
    await onDeleteFolder(folderPath)
  }

  // 롱폼 뷰에서는 shorts- prefix 파일을 기본 제외 (쇼츠 뷰에서는 전체 노출)
  const scoped = useMemo(() => {
    if (view === 'longform') return allImages.filter(f => !f.startsWith('shorts'))
    return allImages
  }, [allImages, view])

  /** 공통 필터 — 검색·필터·사용여부 */
  const matchesFilters = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (fn: string) => {
      const isUsed = usedFiles.has(fn)
      if (usageFilter === 'unused' && isUsed) return false
      if (usageFilter === 'used' && !isUsed) return false
      if (filter !== 'all') {
        let field: ImageField | null = fileFieldMap.get(fn) ?? null
        if (!field) {
          const prefix = parseImagePrefix(fn)
          field = prefix ? fieldFromCode(prefix.fieldCode) : null
        }
        if (field !== filter) return false
      }
      if (q && !fn.toLowerCase().includes(q)) return false
      return true
    }
  }, [query, filter, usageFilter, usedFiles, fileFieldMap])

  /** 루트 파일(폴더 없는 것) — 기존 책별 그룹핑 대상 */
  const rootFiltered = useMemo(
    () => scoped.filter(fn => !(fileFolders[fn] ?? '') && matchesFilters(fn)),
    [scoped, fileFolders, matchesFilters]
  )

  /** 서브폴더별 파일 맵 (필터 적용 후) */
  const folderFiles = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const folder of subFolders) map.set(folder, [])
    for (const fn of scoped) {
      const f = fileFolders[fn] ?? ''
      if (!f) continue
      if (!matchesFilters(fn)) continue
      const arr = map.get(f) ?? []
      arr.push(fn)
      map.set(f, arr)
    }
    return map
  }, [scoped, subFolders, fileFolders, matchesFilters])

  // 책별 그룹핑: fileBookMap에서 책 인덱스 조회 → book-N. 없으면(사용 안 됨) 'unused'.
  // prefix가 있지만 books.images에 등록되지 않은 경우는 prefix bookNum으로 폴백.
  const groups = useMemo<Group[]>(() => {
    const buckets = new Map<string, string[]>()
    for (const fn of rootFiltered) {
      let bookIdx = fileBookMap.get(fn)
      if (bookIdx === undefined) {
        const p = parseImagePrefix(fn)
        if (p) bookIdx = p.bookNum - 1
      }
      const key = bookIdx !== undefined ? `book-${bookIdx + 1}` : 'unused'
      const arr = buckets.get(key) ?? []
      arr.push(fn)
      buckets.set(key, arr)
    }
    // 섹션 순서: unused 먼저 → 1, 2, 3... 오름차순
    const keys = Array.from(buckets.keys()).sort((a, b) => {
      if (a === 'unused') return -1
      if (b === 'unused') return 1
      const na = parseInt(a.slice(5), 10)
      const nb = parseInt(b.slice(5), 10)
      return na - nb
    })
    return keys.map(key => {
      const files = sortBy(sortMode, buckets.get(key)!)
      let label: string
      if (key === 'unused') {
        label = `미배정 (${files.length})`
      } else {
        const bookNum = parseInt(key.slice(5), 10)
        const title = bookTitles?.[bookNum - 1]
        label = title ? `책 ${bookNum} — ${title} (${files.length})` : `책 ${bookNum} (${files.length})`
      }
      return { key, label, files }
    })
  }, [rootFiltered, sortMode, bookTitles, fileBookMap])

  const usedCount = useMemo(() => scoped.filter(f => usedFiles.has(f)).length, [scoped, usedFiles])
  const videoCount = useMemo(() => scoped.filter(isVideoFile).length, [scoped])

  const renderImage = (fn: string) => {
    const isUsed = usedFiles.has(fn)
    const common = {
      fileName: fn,
      imageBaseUrl,
      used: isUsed,
      onDrop: () => onDrop?.(fn),
      onDelete: onDelete ? () => onDelete(fn) : undefined,
      onLocate: isUsed && onLocate ? () => onLocate(fn) : undefined,
      crossLabels: crossUsage?.get(fn),
      selected: selected.has(fn),
      onToggleSelect: () => toggleSelect(fn),
      onDragStartMulti: handleDragStartMulti,
    }
    return viewMode === 'grid' ? <DraggableImage key={fn} {...common} /> : <ListImage key={fn} {...common} />
  }

  if (collapsed) {
    return (
      <div className={POOL_STYLES.sidebarCollapsed}>
        <button
          onClick={toggleCollapsed}
          title="이미지 풀 펼치기"
          className="w-full h-full flex flex-col items-center justify-start gap-2 py-2 text-text-secondary hover:text-accent hover:bg-bg-hover transition-colors"
        >
          <span className="text-[14px]">◀</span>
          <span className="[writing-mode:vertical-rl] text-[10px] tracking-widest">미디어 {scoped.length}개</span>
        </button>
      </div>
    )
  }

  return (
    <div className={POOL_STYLES.sidebar}>
      <div className="flex items-center justify-between gap-2 text-[10px] text-text-secondary font-semibold uppercase tracking-wide">
        <span className="flex items-center gap-1">
          <button
            onClick={toggleCollapsed}
            title="이미지 풀 접기"
            className="text-[12px] text-text-secondary hover:text-accent mr-1"
          >▶</button>
          <span>미디어 {scoped.length}개</span>
          <span className="text-text-secondary/60 normal-case font-normal">
            · 이미지 {scoped.length - videoCount} / 영상 {videoCount}
            · used {usedCount} / unused {scoped.length - usedCount}
          </span>
          {onOpenFolder && (
            <button onClick={onOpenFolder} className="text-[10px] text-accent hover:text-accent-hover normal-case font-normal ml-1" title="이미지 폴더 열기">
              📂
            </button>
          )}
        </span>
        <div className={POOL_STYLES.toggleGroup}>
          <button
            onClick={() => setViewMode('grid')}
            className={`${POOL_STYLES.toggleBtn} normal-case font-normal ${viewMode === 'grid' ? POOL_STYLES.toggleActive : POOL_STYLES.toggleIdle}`}
            title="그리드 보기"
          >▦</button>
          <button
            onClick={() => setViewMode('list')}
            className={`${POOL_STYLES.toggleBtn} normal-case font-normal ${viewMode === 'list' ? POOL_STYLES.toggleActive : POOL_STYLES.toggleIdle}`}
            title="리스트 보기"
          >☰</button>
        </div>
      </div>

      <input
        type="text"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="파일명 검색"
        className={POOL_STYLES.input}
      />

      {/* ── 배치 액션 바 — 선택이 있을 때만 노출 ── */}
      {selected.size > 0 && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1.5 p-1.5 rounded bg-accent/20 border border-accent/40 text-[11px]">
          <span className="font-semibold text-accent">선택 {selected.size}장</span>
          {onMoveFile && subFolders.length > 0 && (
            <>
              <span className="text-text-secondary ml-1">이동 →</span>
              <select
                className="bg-bg-main border border-border/40 rounded px-1 py-0.5 text-[10px]"
                defaultValue=""
                disabled={batchBusy}
                onChange={e => {
                  const v = e.target.value
                  e.target.value = ''
                  if (v === '__ROOT__') batchMove('')
                  else if (v) batchMove(v)
                }}
              >
                <option value="">폴더 선택…</option>
                <option value="__ROOT__">(루트로 꺼내기)</option>
                {subFolders.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </>
          )}
          {onDelete && (
            <button
              onClick={batchDelete}
              disabled={batchBusy}
              className="px-2 py-0.5 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
            >🗑 선택 삭제</button>
          )}
          <button
            onClick={clearSelection}
            disabled={batchBusy}
            className="px-2 py-0.5 rounded border border-border/40 text-text-secondary hover:border-accent/40 hover:text-accent disabled:opacity-50 ml-auto"
          >해제</button>
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {FILTER_BUTTONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`${POOL_STYLES.pill} ${filter === value ? POOL_STYLES.pillActive : POOL_STYLES.pillIdle}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className={POOL_STYLES.toggleGroup}>
          {SORT_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSortMode(value)}
              className={`${POOL_STYLES.toggleBtn} ${sortMode === value ? POOL_STYLES.toggleActive : POOL_STYLES.toggleIdle}`}
              title={`정렬: ${label}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setOpened(opened.size === groups.length ? new Set() : new Set(groups.map(g => g.key)))}
          className={`${POOL_STYLES.pill} ${POOL_STYLES.pillIdle}`}
          title="전체 접기/펼치기"
        >
          {groups.length > 0 && opened.size === groups.length ? '전체 접기' : '전체 펼치기'}
        </button>
        <div className={`ml-auto ${POOL_STYLES.toggleGroup}`}>
          {USAGE_BUTTONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setUsageFilter(value)}
              className={`${POOL_STYLES.toggleBtn} ${usageFilter === value ? POOL_STYLES.toggleActive : POOL_STYLES.toggleIdle}`}
              title={`사용 필터: ${label}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 📁 서브폴더 섹션 — 실제 물리 폴더. 탐색기에서도 동일하게 보임 */}
      {(subFolders.length > 0 || onCreateFolder) && (
        <div className="space-y-1 border border-border/30 rounded p-1.5 bg-bg-main/20">
          <div className="flex items-center justify-between px-1 py-0.5">
            <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">📁 폴더 ({subFolders.length})</span>
            {onCreateFolder && (
              <button
                onClick={handleCreateFolder}
                className={`${POOL_STYLES.pill} ${POOL_STYLES.pillIdle}`}
                title="새 폴더 만들기"
              >+ 새 폴더</button>
            )}
          </div>

          {duplicates.length > 0 && (
            <div className="px-1 py-1 text-[9px] text-red-400 bg-red-500/10 rounded leading-tight">
              ⚠ 이름 중복: {duplicates.map(d => `${d.name} (${d.folders.map(f => f || '루트').join(', ')})`).join(' · ')}
            </div>
          )}

          {subFolders.length === 0 && (
            <div className="px-1 py-2 text-[10px] text-text-secondary italic">폴더 없음 — "+ 새 폴더" 로 만들어라</div>
          )}

          {subFolders.map(folder => {
            const key = `folder:${folder}`
            const isOpen = opened.has(key)
            const files = sortBy(sortMode, folderFiles.get(folder) ?? [])
            const totalInFolder = Object.values(fileFolders).filter(f => f === folder).length
            const dropActive = folderDrop?.folder === folder && folderDrop.active
            return (
              <div
                key={folder}
                className={`border rounded overflow-hidden transition-colors ${dropActive ? 'border-accent ring-1 ring-accent/30 bg-accent/10' : 'border-border/30'}`}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); setFolderDrop({ folder, active: true }) }}
                onDragLeave={() => setFolderDrop(null)}
                onDrop={e => handleFolderDrop(e, folder)}
              >
                <div className={POOL_STYLES.sectionHeader + ' cursor-pointer'} onClick={() => toggleOpen(key)}>
                  <span className={`text-text-secondary text-[10px] transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                  <span className="text-[11px] font-semibold text-text-primary truncate flex-1">📁 {folder} <span className="text-text-secondary font-normal">({files.length}{files.length !== totalInFolder ? `/${totalInFolder}` : ''})</span></span>
                  {onRenameFolder && (
                    <button
                      onClick={e => { e.stopPropagation(); handleRenameFolder(folder) }}
                      className="text-[10px] text-text-secondary hover:text-accent px-1"
                      title="이름 변경"
                    >✏️</button>
                  )}
                  {onDeleteFolder && (
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteFolder(folder) }}
                      className="text-[10px] text-text-secondary hover:text-red-400 px-1"
                      title="폴더 삭제 (비어있어야 함)"
                    >🗑</button>
                  )}
                </div>
                {isOpen && (
                  <div className="p-1.5">
                    {files.length > 0 ? (
                      <div className={viewMode === 'grid' ? POOL_STYLES.gridBody : POOL_STYLES.listBody}>
                        {files.map(renderImage)}
                      </div>
                    ) : (
                      <div className="text-[10px] text-text-secondary italic px-1 py-1">비어있음 — 이미지를 여기로 드래그해라</div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* 루트로 꺼내기 드롭존 */}
          {subFolders.length > 0 && onMoveFile && (
            <div
              className={`mt-1 px-2 py-2 text-[10px] text-center rounded border-2 border-dashed transition-colors ${
                folderDrop?.folder === '' && folderDrop.active
                  ? 'border-accent text-accent bg-accent/10'
                  : 'border-border/40 text-text-secondary'
              }`}
              onDragOver={e => { e.preventDefault(); e.stopPropagation(); setFolderDrop({ folder: '', active: true }) }}
              onDragLeave={() => setFolderDrop(null)}
              onDrop={e => handleFolderDrop(e, '')}
            >
              ⬆ 루트로 꺼내기 (여기로 드롭)
            </div>
          )}
        </div>
      )}

      {groups.length > 0 ? (
        <div className="space-y-2">
          {groups.map(group => {
            const isOpen = opened.has(group.key)
            return (
              <div key={group.key} className="border border-border/30 rounded overflow-hidden">
                <button
                  onClick={() => toggleOpen(group.key)}
                  className={POOL_STYLES.sectionHeader}
                >
                  <span className={`text-text-secondary text-[10px] transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
                  <span className="text-[11px] font-semibold text-text-primary truncate flex-1">{group.label}</span>
                </button>
                {isOpen && (
                  <div className="p-1.5 space-y-1.5">
                    <div className={viewMode === 'grid' ? POOL_STYLES.gridBody : POOL_STYLES.listBody}>
                      {group.files.map(renderImage)}
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() => toggleOpen(group.key)}
                        className={`${POOL_STYLES.pill} ${POOL_STYLES.pillIdle}`}
                        title="이 섹션 접기"
                      >▲ 접기</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-[10px] text-text-secondary italic">
          {query || filter !== 'all' || usageFilter !== 'all' ? '검색/필터 조건에 맞는 이미지 없음' : '없음'}
        </div>
      )}
    </div>
  )
}
