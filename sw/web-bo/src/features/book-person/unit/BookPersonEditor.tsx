'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowDown, ArrowUp, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/contexts/ToastContext'
import { saveBookPersonEpisode, type RegisteredBook } from '@/actions/admin/book-person/episodes'
import { studioUrl, type BookPersonBook, type BookPersonScript } from '@/features/book-person/types'
import { BookPersonImageSlot, BookPersonPool, remapImages } from '@/features/book-person/unit/BookPersonMedia'

const field = 'w-full rounded border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary'
const labelCls = 'flex flex-col gap-1 text-xs text-text-secondary'

export default function BookPersonEditor({
  folder,
  initial,
  hasDraft,
  registeredBooks = [],
}: {
  folder: string
  initial: BookPersonScript
  hasDraft: boolean
  registeredBooks?: RegisteredBook[]
}) {
  const router = useRouter()
  const { showToast } = useToast()
  const [pending, startTransition] = useTransition()
  const [script, setScript] = useState(initial)

  const patch = (next: Partial<BookPersonScript>) => setScript(cur => ({ ...cur, ...next }))
  const setBook = (i: number, next: BookPersonBook) => {
    setScript(cur => ({ ...cur, books: cur.books.map((b, j) => (j === i ? next : b)) }))
  }
  const moveBook = (i: number, dir: -1 | 1) => {
    setScript(cur => {
      const j = i + dir
      if (j < 0 || j >= cur.books.length) return cur
      const books = [...cur.books]
      const [item] = books.splice(i, 1)
      books.splice(j, 0, item)
      return { ...cur, books }
    })
  }

  const save = () => {
    startTransition(async () => {
      try {
        await saveBookPersonEpisode(folder, script)
        showToast('success', '저장했다')
        router.refresh()
      } catch (e) {
        showToast('error', e instanceof Error ? e.message : String(e))
      }
    })
  }

  return (
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/book-person" className="text-xs text-text-secondary hover:text-accent">← 인물 목록</Link>
            <h1 className="mt-1 text-2xl font-bold text-text-primary">{script.person || folder}</h1>
            <p className="text-xs text-text-secondary">{folder}</p>
            {!hasDraft && (
              <p className="mt-2 text-xs text-text-secondary">
                아직 이 인물 폴더는 없다. 문장 제목이나 소개를 쓰고 저장하면 생긴다. 책은 없어도 된다.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasDraft && (
              <a href={studioUrl(folder)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-border bg-bg-card px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-hover hover:text-accent">
                <ExternalLink className="h-4 w-4" /> 스튜디오
              </a>
            )}
            <button type="button" disabled={pending} onClick={save} className="rounded-md border border-accent bg-accent/10 px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/20 disabled:opacity-40">
              저장
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelCls}>인물 이름
            <input className={field} value={script.person} onChange={e => patch({ person: e.target.value })} />
          </label>
          <label className={labelCls}>한 줄
            <input className={field} value={script.role ?? ''} onChange={e => patch({ role: e.target.value })} />
          </label>
        </div>

        <label className={labelCls}>문장 제목
          <textarea
            className={`${field} min-h-16`}
            placeholder="가운데에 뜨고, 나레이터가 읽고 지나간다"
            value={script.lead ?? ''}
            onChange={e => patch({ lead: e.target.value })}
          />
        </label>

        <div className="flex gap-3">
          <label className={`${labelCls} min-w-0 flex-1`}>인물 소개
            <textarea className={`${field} min-h-28`} value={script.intro} onChange={e => patch({ intro: e.target.value })} />
          </label>
          <BookPersonImageSlot folder={folder} value={script.bg} onChange={v => patch({ bg: v })} label="소개" />
        </div>

        {registeredBooks.length > 0 && (
          <div className="rounded-lg border border-dashed border-border bg-bg-secondary/40 p-3">
            <h3 className="text-xs font-semibold text-text-primary">DB에 등록된 읽은 책 — 눌러서 영상에 추가</h3>
            <p className="mt-1 text-[11px] text-text-secondary">celeb_contents에 있는 책이 전부 뜬다. 영상에 쓸 것만 골라 담는다. 이미 담은 책은 흐리게 보인다.</p>
            <div className="mt-2 grid gap-1.5">
              {registeredBooks.map(rb => {
                const already = script.books.some(b => b.title.trim() === rb.title.trim())
                return (
                  <button
                    key={rb.contentId}
                    type="button"
                    disabled={already}
                    onClick={() => setScript(cur => ({ ...cur, books: [...cur.books, { title: rb.title, text: rb.text }] }))}
                    className={`flex w-full items-start justify-between gap-2 rounded border px-2.5 py-1.5 text-left text-xs ${already ? 'border-border bg-bg-card opacity-40' : 'border-border bg-bg-card hover:border-accent hover:text-accent'}`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold">{rb.title}</span>
                      {rb.creator && <span className="text-text-secondary"> — {rb.creator}</span>}
                      <span className="mt-0.5 line-clamp-2 block text-[11px] leading-snug text-text-secondary">{rb.text.slice(0,120)}{rb.text.length>120?'…':''}</span>
                    </span>
                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${already ? 'bg-border text-text-secondary' : 'bg-accent text-white'}`}>{already ? '담음' : '추가'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">영상에 쓸 책 — {script.books.length}권 (드래그 없이 순서만 바꾼다)</h2>
            <button type="button" onClick={() => setScript(cur => ({ ...cur, books: [...cur.books, { title: '', text: '' }] }))} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-text-secondary hover:bg-white/5 hover:text-accent">
              <Plus className="h-3.5 w-3.5" /> 빈 책 추가
            </button>
          </div>
          {script.books.length === 0 && <p className="text-xs text-text-secondary">위에서 골라 담거나 빈 책을 추가한다. 권수는 편마다 다르다.</p>}
          {script.books.map((book, i) => (
            <div key={i} className="flex gap-3 rounded-lg border border-border bg-bg-card p-3">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-text-secondary">{i + 1}권</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => moveBook(i, -1)} className="rounded p-1 text-text-secondary hover:bg-white/5 hover:text-accent"><ArrowUp className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => moveBook(i, 1)} className="rounded p-1 text-text-secondary hover:bg-white/5 hover:text-accent"><ArrowDown className="h-3.5 w-3.5" /></button>
                    <button type="button" onClick={() => setScript(cur => ({ ...cur, books: cur.books.filter((_, j) => j !== i) }))} className="rounded p-1 text-text-secondary hover:bg-white/5 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <input className={field} placeholder="책 제목" value={book.title} onChange={e => setBook(i, { ...book, title: e.target.value })} />
                <textarea className={`${field} min-h-24`} placeholder="이 책을 소개하는 말" value={book.text} onChange={e => setBook(i, { ...book, text: e.target.value })} />
              </div>
              <BookPersonImageSlot folder={folder} value={book.image} onChange={v => setBook(i, { ...book, image: v })} label="책" />
            </div>
          ))}
        </div>
      </div>

      <BookPersonPool folder={folder} script={script} onRemap={(from, to) => setScript(cur => remapImages(cur, from, to))} />
    </div>
  )
}
