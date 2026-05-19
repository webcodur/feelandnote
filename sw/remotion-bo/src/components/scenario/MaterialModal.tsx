'use client'

import { useEffect, useState, useCallback } from 'react'

type BookEntry = { slug: string; hasMaterial: boolean }

/**
 * 「재료.txt」 뷰어 모달 — 책 폴더에 작가가 정리해 둔 원자료 메모를 BO에서 열람한다.
 *
 * 동작:
 *   - 진입 시 책 목록 + 각 책의 재료.txt 존재 여부 조회
 *   - 좌측 책 목록에서 선택 → 우측에 본문 표시 (모노 폰트, 들여쓰기 보존)
 *   - 재료가 없는 책도 목록엔 보이되 비활성
 */
export function MaterialModal({ series, name, open, onClose, initialSlug }: {
  series: string
  name: string
  open: boolean
  onClose: () => void
  initialSlug?: string
}) {
  const [books, setBooks] = useState<BookEntry[]>([])
  const [legacy, setLegacy] = useState(false)
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [content, setContent] = useState<string>('')
  const [listLoading, setListLoading] = useState(false)
  const [contentLoading, setContentLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchList = useCallback(async () => {
    setListLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/${series}/episodes/${name}/material`)
      const data = await res.json()
      if (!data.ok) { setError(data.error ?? '재료 목록 조회 실패'); return }
      setLegacy(!!data.legacy)
      const list: BookEntry[] = Array.isArray(data.books) ? data.books : []
      setBooks(list)
      const candidate = initialSlug && list.some(b => b.slug === initialSlug)
        ? initialSlug
        : (list.find(b => b.hasMaterial)?.slug ?? null)
      setActiveSlug(candidate)
    } catch (e) {
      setError(String(e))
    } finally {
      setListLoading(false)
    }
  }, [series, name, initialSlug])

  useEffect(() => {
    if (!open) return
    setContent('')
    fetchList()
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, fetchList, onClose])

  useEffect(() => {
    if (!open || !activeSlug) { setContent(''); return }
    const has = books.find(b => b.slug === activeSlug)?.hasMaterial
    if (!has) { setContent(''); return }
    let cancelled = false
    setContentLoading(true)
    fetch(`/api/${series}/episodes/${name}/material?slug=${encodeURIComponent(activeSlug)}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        if (!d.ok) { setError(d.error ?? '재료 본문 조회 실패'); setContent(''); return }
        setContent(String(d.content ?? ''))
      })
      .catch(e => { if (!cancelled) setError(String(e)) })
      .finally(() => { if (!cancelled) setContentLoading(false) })
    return () => { cancelled = true }
  }, [open, activeSlug, books, series, name])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-border rounded-md flex flex-col shadow-xl overflow-hidden"
        style={{ width: 'min(96vw, 1400px)', height: 'min(92vh, 900px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-border bg-bg-main">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-base font-semibold text-text-primary shrink-0">재료 메모</span>
            <span className="text-sm text-text-secondary truncate">{name}</span>
          </div>
          <button
            onClick={onClose}
            className="ml-auto px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded border border-border transition-colors"
            title="닫기 (ESC)"
          >
            닫기
          </button>
        </div>

        {/* 본문 — 좌 책 목록 / 우 본문 */}
        <div className="flex-1 min-h-0 flex">
          <aside className="w-64 shrink-0 border-r border-border bg-bg-main/50 overflow-auto">
            {listLoading ? (
              <div className="p-4 text-sm text-text-secondary">목록 불러오는 중…</div>
            ) : legacy ? (
              <div className="p-4 text-sm text-text-secondary italic">레거시 구조 인물 — 책 폴더 없음</div>
            ) : books.length === 0 ? (
              <div className="p-4 text-sm text-text-secondary italic">책 폴더 없음</div>
            ) : (
              <ul className="py-1">
                {books.map(b => {
                  const isActive = b.slug === activeSlug
                  return (
                    <li key={b.slug}>
                      <button
                        type="button"
                        onClick={() => setActiveSlug(b.slug)}
                        disabled={!b.hasMaterial}
                        className={`w-full text-left px-4 py-2 text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 ${
                          isActive
                            ? 'bg-bg-hover text-text-primary'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover/60'
                        }`}
                      >
                        <span className="truncate flex-1">{b.slug}</span>
                        {!b.hasMaterial && <span className="text-xs text-text-secondary/60 shrink-0">없음</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </aside>

          <main className="flex-1 min-w-0 overflow-auto">
            {error && (
              <div className="m-4 px-3 py-2 rounded border border-danger-text/40 bg-danger-text/10 text-sm text-danger-text">
                {error}
              </div>
            )}
            {!activeSlug ? (
              <div className="p-8 text-sm text-text-secondary italic">
                {legacy
                  ? '책 폴더 기반 신구조 인물에서만 사용 가능하다.'
                  : '좌측에서 책을 선택하면 「재료.txt」 본문이 표시된다.'}
              </div>
            ) : contentLoading ? (
              <div className="p-8 text-sm text-text-secondary">본문 불러오는 중…</div>
            ) : content.trim() === '' ? (
              <div className="p-8 text-sm text-text-secondary italic">
                이 책에는 아직 「재료.txt」 가 없거나 비어 있다.
              </div>
            ) : (
              <pre className="m-0 p-5 text-sm text-text-primary whitespace-pre-wrap break-words font-mono leading-relaxed">
                {content}
              </pre>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
