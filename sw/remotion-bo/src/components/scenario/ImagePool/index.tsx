'use client'

import { useEffect, useState } from 'react'
import { DraggableImage, ListImage } from '../ImageThumb'
import type { ImageField } from '../types'
import {
  FILTER_BUTTONS, IMAGE_POOL_COLLAPSED_KEY, POOL_STYLES, SORT_OPTIONS, USAGE_BUTTONS,
  type ViewMode,
} from './constants'
import { useImagePoolFilter } from './useImagePoolFilter'
import { useImagePoolSelection } from './useImagePoolSelection'
import { CollapsedPool, PoolHeader } from './PoolHeader'
import { PoolFolders } from './PoolFolders'
import { PoolGroups } from './PoolGroups'

/** 미디어/이미지 풀 사이드바 — 검색/필터/뷰모드/아코디언 그룹/정렬 지원 */
export function ImagePool({ allImages, usedFiles, fileBookMap, fileFieldMap, view, imageBaseUrl, bookTitles, onLocate, onDrop, onDelete, onOpenFolder, onOpenFolderPath, onRefresh, crossUsage,
  subFolders = [], fileFolders = {}, duplicates = [], onMoveFile, onCreateFolder, onRenameFolder, onDeleteFolder }: {
  /** 에피소드 폴더 전체 이미지 파일명 */
  allImages: string[]
  /** 롱폼/모든 쇼츠에서 사용 중인 파일명 (used 뱃지 + 드래그 추가 비활성 기준) */
  usedFiles: Set<string>
  /** 파일명 → 사용 책 인덱스(0-based). 아코디언 그룹의 기준 */
  fileBookMap: Map<string, number>
  /** 파일명 → 저장된 field (summary|context|quote). 필터 기준 */
  fileFieldMap: Map<string, ImageField>
  /** 'longform' | 'shorts-<n>' — longform 은 shorts- prefix 파일을 기본 숨김 */
  view: string
  imageBaseUrl: string
  /** 책 제목 (accordion 라벨용). 인덱스는 0-based (책1 = bookTitles[0]) */
  bookTitles?: string[]
  /** 바로가기 — 해당 이미지가 배정된 책쪽 섹션으로 스크롤 이동 */
  onLocate?: (fileName: string) => void
  /** 추가 버튼 클릭 시 (책에서 직접 추가) */
  onDrop?: (fileName: string) => void
  /** 이미지 삭제 (디스크) */
  onDelete?: (fileName: string) => void
  /** 루트 이미지 폴더를 탐색기로 열기 */
  onOpenFolder?: () => void
  /** 특정 서브폴더를 탐색기로 열기 (상대경로) */
  onOpenFolderPath?: (folder: string) => void
  /** 디스크 상태와 다시 동기화 (수동 새로고침 + 아코디언 펼침 시) */
  onRefresh?: () => void
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
  const filter = useImagePoolFilter({
    allImages, usedFiles, fileBookMap, fileFieldMap, fileFolders, subFolders, view, bookTitles,
  })
  const sel = useImagePoolSelection({ fileFolders, onMoveFile, onDelete })

  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [opened, setOpened] = useState<Set<string>>(new Set())
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
      // 접힘 → 펼침 전환 시 디스크 상태 새로고침
      if (prev && !next) onRefresh?.()
      return next
    })
  }

  const toggleOpen = (key: string) => {
    setOpened(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else { next.add(key); onRefresh?.() } // 아코디언 펼친 때마다 디스크 새로고침
      return next
    })
  }

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
      selected: sel.selected.has(fn),
      onToggleSelect: () => sel.toggleSelect(fn),
      onDragStartMulti: sel.handleDragStartMulti,
    }
    return viewMode === 'grid' ? <DraggableImage key={fn} {...common} /> : <ListImage key={fn} {...common} />
  }

  if (collapsed) {
    return <CollapsedPool count={filter.scoped.length} onExpand={toggleCollapsed} />
  }

  return (
    <div className={POOL_STYLES.sidebar}>
      <PoolHeader
        scopedCount={filter.scoped.length}
        imageCount={filter.scoped.length - filter.videoCount}
        videoCount={filter.videoCount}
        usedCount={filter.usedCount}
        viewMode={viewMode}
        onViewMode={setViewMode}
        onCollapse={toggleCollapsed}
        onOpenFolder={onOpenFolder}
        onRefresh={onRefresh}
      />

      <input
        type="text"
        value={filter.query}
        onChange={e => filter.setQuery(e.target.value)}
        placeholder="파일명 검색"
        className={POOL_STYLES.input}
      />

      {/* 배치 액션 바 — 선택이 있을 때만 노출 */}
      {sel.selected.size > 0 && (
        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-1.5 p-1.5 rounded bg-accent/20 border border-accent/40 text-[11px]">
          <span className="font-semibold text-accent">선택 {sel.selected.size}개</span>
          {onMoveFile && subFolders.length > 0 && (
            <>
              <span className="text-text-secondary ml-1">이동 →</span>
              <select
                className="bg-bg-card border border-border/40 rounded px-1 py-0.5 text-[11px]"
                defaultValue=""
                disabled={sel.batchBusy}
                onChange={e => {
                  const v = e.target.value
                  e.target.value = ''
                  if (v === '__ROOT__') sel.batchMove('')
                  else if (v) sel.batchMove(v)
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
              onClick={sel.batchDelete}
              disabled={sel.batchBusy}
              className="px-2 py-0.5 rounded border border-red-500/40 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
            >🗑 선택 삭제</button>
          )}
          <button
            onClick={sel.clearSelection}
            disabled={sel.batchBusy}
            className="px-2 py-0.5 rounded border border-border/40 text-text-secondary hover:border-accent/40 hover:text-accent disabled:opacity-50 ml-auto"
          >해제</button>
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {FILTER_BUTTONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => filter.setFilter(value)}
            className={`${POOL_STYLES.pill} ${filter.filter === value ? POOL_STYLES.pillActive : POOL_STYLES.pillIdle}`}
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
              onClick={() => filter.setSortMode(value)}
              className={`${POOL_STYLES.toggleBtn} ${filter.sortMode === value ? POOL_STYLES.toggleActive : POOL_STYLES.toggleIdle}`}
              title={`정렬: ${label}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setOpened(opened.size === filter.groups.length ? new Set() : new Set(filter.groups.map(g => g.key)))}
          className={`${POOL_STYLES.pill} ${POOL_STYLES.pillIdle}`}
          title="전체 펼치기/접기"
        >
          {filter.groups.length > 0 && opened.size === filter.groups.length ? '전체 접기' : '전체 펼치기'}
        </button>
        <div className={`ml-auto ${POOL_STYLES.toggleGroup}`}>
          {USAGE_BUTTONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => filter.setUsageFilter(value)}
              className={`${POOL_STYLES.toggleBtn} ${filter.usageFilter === value ? POOL_STYLES.toggleActive : POOL_STYLES.toggleIdle}`}
              title={`사용 필터: ${label}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {(subFolders.length > 0 || onCreateFolder) && (
        <PoolFolders
          subFolders={subFolders} fileFolders={fileFolders} folderFiles={filter.folderFiles} duplicates={duplicates}
          opened={opened} viewMode={viewMode} sortMode={filter.sortMode}
          folderDrop={sel.folderDrop} setFolderDrop={sel.setFolderDrop} onFolderDrop={sel.handleFolderDrop}
          renderImage={renderImage}
          toggleOpen={toggleOpen}
          onCreateFolder={onCreateFolder} onRenameFolder={onRenameFolder} onDeleteFolder={onDeleteFolder}
          onOpenFolderPath={onOpenFolderPath}
        />
      )}

      {filter.groups.length > 0 ? (
        <PoolGroups groups={filter.groups} opened={opened} viewMode={viewMode} renderImage={renderImage} toggleOpen={toggleOpen} />
      ) : (
        <div className="text-[11px] text-text-secondary italic">
          {filter.query || filter.filter !== 'all' || filter.usageFilter !== 'all' ? '검색·필터 조건에 맞는 이미지 없음' : '없음'}
        </div>
      )}
    </div>
  )
}
