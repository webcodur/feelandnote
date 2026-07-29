'use client'

import { useEffect } from 'react'
import { useEpisode } from '@/features/book-recommend/lib/episode-context'
import { TaskPanel } from '@/features/book-recommend/components/TaskPanel'
import { CopyLabel } from '@/features/book-recommend/components/CopyLabel'

const BTN = 'px-3 py-1 rounded text-sm font-semibold'
const BTN_PRIMARY = `bg-accent text-bg-main ${BTN} hover:bg-accent-hover`
const BTN_SECONDARY = `bg-bg-card border border-border ${BTN} hover:bg-bg-hover`
const SECTION_CLS = 'bg-bg-secondary border border-border rounded-lg overflow-hidden'
const HEADER_CLS = 'flex items-center justify-between px-4 py-2.5 cursor-pointer select-none hover:bg-bg-hover'

export default function RenderPage() {
  const { series, name, episode, post } = useEpisode()

  useEffect(() => {
    document.title = `${episode?.host?.nickname ?? name} 렌더 — Feel & Note BO`
  }, [episode, name])

  // 1권 모드 렌더 대상 — 솔로는 별도 데이터 없이 책 본문에서 자동 변환되므로 모든 책이 후보
  const booksArr = Array.isArray((episode as { books?: Array<{ title?: string }> } | null)?.books)
    ? ((episode as { books: Array<{ title?: string }> }).books)
    : []

  return (
    <div className="space-y-4">
      {/* Render */}
      <section className={SECTION_CLS}>
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-accent tracking-widest">RENDER</span>
            <CopyLabel text="RENDER" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <button onClick={() => post(`/api/${series}/render`, { episode: name })}
                className={BTN_PRIMARY}>전체 렌더</button>
              <span className="text-[11px] text-text-dim">롱폼 + 쇼츠 모두 렌더링</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => post(`/api/${series}/render`, { episode: name, only: 'longform' })}
                className={BTN_SECONDARY}>롱폼만</button>
              <span className="text-[11px] text-text-dim">16:9 롱폼 영상만 렌더링</span>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => post(`/api/${series}/render`, { episode: name, only: 'shorts' })}
                className={BTN_SECONDARY}>쇼츠만</button>
              <span className="text-[11px] text-text-dim">9:16 쇼츠 영상만 렌더링</span>
            </div>
          </div>
          <p className="text-[11px] text-text-dim leading-relaxed mt-3">
            음성 파일이 모두 준비된 후 실행하세요. 렌더링은 약 5-10분 소요됩니다.
          </p>
        </div>
      </section>

      {/* 1권 모드(SOLO) */}
      <section className={SECTION_CLS}>
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-accent tracking-widest">SOLO · 1권 모드</span>
            <CopyLabel text="SOLO" />
          </div>
          {booksArr.length === 0 ? (
            <p className="text-[11px] text-text-dim leading-relaxed">
              책이 없습니다. books 폴더에 책을 추가하면 자동으로 1권 모드 회차가 생성됩니다.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <button onClick={() => post(`/api/${series}/render`, { episode: name, only: 'solos' })}
                  className={BTN_PRIMARY}>솔로 전체 렌더</button>
                <span className="text-[11px] text-text-dim">{booksArr.length}권 × 16:9 한 권 영상 (책 본문 자동 변환)</span>
              </div>
              <div className="pt-2 border-t border-border/40">
                <div className="text-[11px] text-text-secondary mb-1.5">개별 책</div>
                <div className="flex flex-wrap gap-1.5">
                  {booksArr.map((b, idx) => {
                    const bookTitle = b?.title ?? `책 ${idx + 1}`
                    const num = String(idx + 1).padStart(2, '0')
                    return (
                      <button
                        key={idx}
                        onClick={() => post(`/api/${series}/render`, { episode: name, only: 'solo', bookIndex: idx })}
                        className={BTN_SECONDARY}
                        title={bookTitle}
                      >
                        B{num} <span className="text-text-dim font-normal ml-1">{bookTitle.length > 12 ? bookTitle.slice(0, 12) + '…' : bookTitle}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Tasks */}
      <section className={SECTION_CLS}>
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-bold text-accent tracking-widest">TASKS</span>
            <CopyLabel text="TASKS" />
          </div>
          <TaskPanel />
        </div>
      </section>
    </div>
  )
}
