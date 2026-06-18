'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FactionImageTree, FactionImageTreeFile } from '@/lib/faction-utils'
import { imageSrc } from './timing'
import { ChevronDown, Search, ImageIcon, FolderOpen } from './icons'

const ROOT_LABEL = '(루트)'

/**
 * 세력도 이미지 풀 — 에피소드 폴더 하위 이미지를 폴더별 아코디언 + 그리드로 조망한다.
 * 목적은 어떤 이미지가 어느 폴더에 있고 무엇이 영상에 안 쓰이는지 한눈에 보는 것.
 * data는 읽기 전용 — 풀에서 직접 할당·삭제는 하지 않는다(기존 picker 유지).
 */
export function FactionImagePool({
  series,
  episodeName,
  usedImages,
  reloadKey = 0,
}: {
  series: string
  episodeName: string
  /** 영상에 연결된 이미지 경로 집합 (사용/미사용 판정) */
  usedImages: Set<string>
  /** 값이 바뀌면 트리를 다시 불러온다 */
  reloadKey?: number
}) {
  const [tree, setTree] = useState<FactionImageTree | null>(null)
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [opened, setOpened] = useState<Set<string>>(new Set())
  const [preview, setPreview] = useState<FactionImageTreeFile | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/${series}/faction-image?ep=${encodeURIComponent(episodeName)}&tree=1`)
      .then(r => r.json())
      .then((data: FactionImageTree) => setTree(data))
      .catch(() => setTree({ files: [], folders: [] }))
      .finally(() => setLoading(false))
  }, [series, episodeName])

  useEffect(() => { load() }, [load, reloadKey])

  // 에피소드 이미지 폴더를 OS 탐색기로 연다
  const openFolder = useCallback(() => {
    fetch(`/api/${series}/faction-open-folder`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ep: episodeName }),
    })
      .then(r => r.json())
      .then((data: { ok?: boolean; error?: string }) => {
        if (!data.ok) alert(`폴더를 열 수 없습니다: ${data.error ?? '알 수 없는 오류'}`)
      })
      .catch(() => alert('폴더를 열 수 없습니다.'))
  }, [series, episodeName])

  // 폴더 → 파일 목록 (검색 필터 적용)
  const folderGroups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const files = tree?.files ?? []
    const filtered = q
      ? files.filter(f => f.path.toLowerCase().includes(q))
      : files
    const byFolder = new Map<string, FactionImageTreeFile[]>()
    for (const f of filtered) {
      const key = f.folder || ''
      const list = byFolder.get(key) ?? []
      list.push(f)
      byFolder.set(key, list)
    }
    // 루트('')를 맨 앞, 나머지는 폴더명 정렬
    return Array.from(byFolder.entries()).sort(([a], [b]) => {
      if (a === '') return -1
      if (b === '') return 1
      return a.localeCompare(b)
    })
  }, [tree, query])

  const total = tree?.files.length ?? 0
  const usedCount = useMemo(
    () => (tree?.files ?? []).filter(f => usedImages.has(f.path)).length,
    [tree, usedImages],
  )

  const allKeys = folderGroups.map(([k]) => k)
  const allOpen = allKeys.length > 0 && allKeys.every(k => opened.has(k))

  const toggleOpen = (key: string) =>
    setOpened(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  const toggleAll = () =>
    setOpened(allOpen ? new Set() : new Set(allKeys))

  // 검색 중에는 결과 폴더를 자동으로 펼친다
  useEffect(() => {
    if (query.trim()) setOpened(new Set(folderGroups.map(([k]) => k)))
  }, [query, folderGroups])

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
          <button
            onClick={openFolder}
            className="flex items-center gap-1 rounded-md border border-border bg-bg-card px-2 py-1 text-xs font-semibold text-text-secondary hover:bg-bg-hover"
          >
            <FolderOpen size={13} />
            폴더 열기
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

      <button
        onClick={toggleAll}
        className="self-start rounded-md border border-border bg-bg-card px-2 py-1 text-xs font-semibold text-text-secondary hover:bg-bg-hover"
      >
        {allOpen ? '전체 접기' : '전체 펼치기'}
      </button>

      {loading && <p className="text-text-dim">불러오는 중...</p>}
      {!loading && total === 0 && <p className="text-text-dim">이미지가 없습니다.</p>}
      {!loading && total > 0 && folderGroups.length === 0 && (
        <p className="text-text-dim">검색 조건에 맞는 이미지가 없습니다.</p>
      )}

      {/* 폴더별 아코디언 */}
      <div className="flex flex-col gap-1.5">
        {folderGroups.map(([folder, files]) => {
          const isOpen = opened.has(folder)
          const label = folder || ROOT_LABEL
          return (
            <div key={folder} className="overflow-hidden rounded-md border border-border">
              <button
                onClick={() => toggleOpen(folder)}
                className="flex w-full items-center gap-1.5 bg-bg-card px-2 py-1.5 text-start hover:bg-bg-hover"
              >
                <ChevronDown
                  size={15}
                  className={`shrink-0 text-text-secondary ${isOpen ? '' : '-rotate-90'}`}
                />
                <span className="truncate font-semibold text-text-primary">{label}</span>
                <span className="ms-auto shrink-0 text-xs text-text-secondary">{files.length}</span>
              </button>

              {isOpen && (
                <div className="grid grid-cols-2 gap-2 p-2 sm:grid-cols-3">
                  {files.map(f => {
                    const isUsed = usedImages.has(f.path)
                    return (
                      <button
                        key={f.path}
                        onClick={() => setPreview(f)}
                        className={`group relative flex aspect-square flex-col overflow-hidden rounded border border-border bg-bg-main ${
                          isUsed ? '' : 'opacity-50'
                        }`}
                        title={f.path}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={imageSrc(series, episodeName, f.path)}
                          alt={f.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        <span
                          className={`absolute start-1 top-1 rounded px-1 py-0.5 text-[10px] font-bold ${
                            isUsed
                              ? 'bg-accent text-bg-main'
                              : 'bg-bg-card/90 text-text-secondary'
                          }`}
                        >
                          {isUsed ? '사용 중' : '미사용'}
                        </span>
                        <span className="absolute inset-x-0 bottom-0 truncate bg-bg-main/85 px-1 py-0.5 text-[10px] text-text-secondary">
                          {f.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc(series, episodeName, preview.path)}
              alt={preview.name}
              className="max-h-[75vh] w-auto rounded-md border border-border object-contain"
            />
            <div className="flex items-center gap-2 rounded-md bg-bg-card px-3 py-2">
              <ImageIcon size={14} className="shrink-0 text-text-secondary" />
              <span className="truncate text-sm text-text-primary">{preview.path}</span>
              <span
                className={`ms-auto shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${
                  usedImages.has(preview.path)
                    ? 'bg-accent text-bg-main'
                    : 'bg-bg-main text-text-secondary'
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
