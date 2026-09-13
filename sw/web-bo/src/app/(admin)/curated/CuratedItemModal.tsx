'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { Check, Link2, Loader2, Search, Trash2, Unlink, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import {
  createCuratedItem,
  deleteCuratedItem,
  searchCuratedContent,
  updateCuratedItem,
  type CuratedAdminContent,
  type CuratedAdminItem,
  type CuratedAdminList,
  type CuratedContentSearchResult,
  type CuratedItemInput,
} from '@/actions/admin/curated'
import { CONTENT_TYPE_CONFIG, type ContentType } from '@/constants/contentTypes'

const CONTROL_CLASS = 'w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
const TEXTAREA_CLASS = `${CONTROL_CLASS} min-h-24 resize-y`

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-text-primary">
        {label}
        {required && <span className="ml-1 text-red-300">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] leading-4 text-text-secondary">{hint}</p>}
    </div>
  )
}

function numberString(value: number | null | undefined): string {
  return value == null ? '' : String(value)
}

function numberValue(value: string): number | null {
  return value.trim() ? Number(value) : null
}

interface ItemFormState {
  contentId: string
  rawTitle: string
  rawCreator: string
  rank: string
  year: string
  note: string
  noteEn: string
  hidden: boolean
  sortOrder: string
}

function itemState(item: CuratedAdminItem | null): ItemFormState {
  return {
    contentId: item?.contentId ?? '',
    rawTitle: item?.rawTitle ?? '',
    rawCreator: item?.rawCreator ?? '',
    rank: numberString(item?.rank),
    year: numberString(item?.year),
    note: item?.note ?? '',
    noteEn: item?.noteEn ?? '',
    hidden: item?.hidden ?? false,
    sortOrder: numberString(item?.sortOrder),
  }
}

function ContentThumb({ content, className = 'h-12 w-9' }: { content: CuratedAdminContent; className?: string }) {
  return (
    <div className={`relative shrink-0 overflow-hidden rounded border border-border bg-bg-secondary ${className}`}>
      {content.thumbnailUrl ? <Image src={content.thumbnailUrl} alt="" fill sizes="48px" unoptimized className="object-cover" /> : <div className="flex h-full items-center justify-center text-[9px] font-mono text-text-secondary">{content.type}</div>}
    </div>
  )
}

export default function CuratedItemModal({ list, item, onClose, onSaved }: { list: CuratedAdminList; item: CuratedAdminItem | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState(() => itemState(item))
  const [chosenContent, setChosenContent] = useState<CuratedAdminContent | null>(item?.content ?? null)
  const [contentQuery, setContentQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CuratedContentSearchResult[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof ItemFormState>(key: K, value: ItemFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSearch(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()
    if (contentQuery.trim().length < 2) return
    setIsSearching(true)
    setError(null)
    setHasSearched(true)
    try {
      setSearchResults(await searchCuratedContent(contentQuery, list.contentType))
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : '콘텐츠 검색에 실패했습니다.')
    } finally {
      setIsSearching(false)
    }
  }

  function chooseContent(content: CuratedAdminContent) {
    update('contentId', content.id)
    setChosenContent(content)
  }

  function clearContent() {
    update('contentId', '')
    setChosenContent(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    const payload: CuratedItemInput = {
      listId: list.id,
      contentId: form.contentId || null,
      rawTitle: form.rawTitle,
      rawCreator: form.rawCreator || null,
      rank: numberValue(form.rank),
      year: numberValue(form.year),
      note: form.note || null,
      noteEn: form.noteEn || null,
      hidden: form.hidden,
      sortOrder: numberValue(form.sortOrder),
    }
    const result = item ? await updateCuratedItem(item.id, payload) : await createCuratedItem(payload)
    if (!result.success) {
      setError(result.error)
      setIsSubmitting(false)
      return
    }
    onSaved()
  }

  async function handleDelete() {
    if (!item) return
    if (!window.confirm(`「${item.rawTitle}」 항목을 목록에서 삭제할까요?`)) return
    setIsSubmitting(true)
    setError(null)
    const result = await deleteCuratedItem(item.id)
    if (!result.success) {
      setError(result.error)
      setIsSubmitting(false)
      return
    }
    onSaved()
  }

  const contentTypeLabel = CONTENT_TYPE_CONFIG[list.contentType as ContentType]?.label ?? list.contentType

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={item ? '선정 항목 편집' : '새 선정 항목'}
      description={`${contentTypeLabel} 목록 · 원문 표기와 우리 콘텐츠 연결을 함께 관리합니다.`}
      size="xl"
      closeOnOverlayClick={!isSubmitting && !isSearching}
      closeOnEscape={!isSubmitting && !isSearching}
    >
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        <section className="rounded-xl border border-border bg-bg-secondary/40 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-accent" />
                <h3 className="text-sm font-bold text-text-primary">콘텐츠 연결</h3>
              </div>
              <p className="mt-1 text-xs leading-5 text-text-secondary">목록 원문은 그대로 남고, 연결된 콘텐츠의 표지·정식 제목이 공개 화면에 함께 표시됩니다.</p>
            </div>
            <span className="rounded-md bg-accent/10 px-2 py-1 font-mono text-[10px] font-semibold text-accent">only: {contentTypeLabel}</span>
          </div>

          {chosenContent ? (
            <div className="mt-4 flex items-center gap-3 rounded-lg border border-accent/40 bg-accent/[0.07] p-3">
              <ContentThumb content={chosenContent} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary">{chosenContent.title}</p>
                {chosenContent.titleEn && chosenContent.titleEn !== chosenContent.title && <p className="mt-0.5 truncate text-xs text-text-secondary">{chosenContent.titleEn}</p>}
                <p className="mt-1 truncate text-xs text-text-secondary">{chosenContent.creator || '제작자 미등록'} · {chosenContent.id}</p>
              </div>
              <Link href={`/contents/${chosenContent.id}`} target="_blank" className="rounded-md p-2 text-text-secondary hover:bg-white/10 hover:text-accent" title="콘텐츠 상세 열기"><ExternalLinkIcon /></Link>
              <button type="button" onClick={clearContent} className="rounded-md p-2 text-text-secondary hover:bg-red-400/10 hover:text-red-200" title="연결 해제"><Unlink className="h-4 w-4" /></button>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-amber-300/30 bg-amber-300/[0.04] px-3 py-3 text-xs text-amber-200/80">아직 연결된 콘텐츠가 없습니다. 아래에서 DB를 검색하세요.</div>
          )}

          <div className="mt-4 flex gap-2">
            <input value={contentQuery} onChange={(event) => setContentQuery(event.target.value)} className={`${CONTROL_CLASS} flex-1`} placeholder="제목 또는 제작자 검색 (2글자 이상)" />
            <button type="button" onClick={() => void handleSearch()} disabled={isSearching || contentQuery.trim().length < 2} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-accent/50 bg-accent/10 px-3.5 text-sm font-semibold text-accent hover:border-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40">
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              검색
            </button>
          </div>
          {hasSearched && !isSearching && searchResults.length === 0 && <p className="mt-3 text-xs text-text-secondary">조건에 맞는 {contentTypeLabel} 콘텐츠가 없습니다.</p>}
          {searchResults.length > 0 && (
            <div className="mt-3 max-h-56 divide-y divide-border overflow-y-auto rounded-lg border border-border bg-bg-card">
              {searchResults.map((content) => (
                <button key={content.id} type="button" onClick={() => chooseContent(content)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent/10">
                  <ContentThumb content={content} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-text-primary">{content.title}</span>
                    <span className="mt-1 block truncate text-xs text-text-secondary">{content.creator || '제작자 미등록'} · {content.id}</span>
                  </span>
                  <span className="shrink-0 rounded-md bg-bg-secondary px-2 py-1 font-mono text-[10px] text-text-secondary">연결</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px_180px]">
            <Field label="목록 원문 제목" required hint="조사 원문의 표기를 번역하거나 정리하지 않고 그대로 남깁니다.">
              <input value={form.rawTitle} onChange={(event) => update('rawTitle', event.target.value)} className={CONTROL_CLASS} placeholder="원문 제목" required />
            </Field>
            <Field label="순위">
              <input type="number" value={form.rank} onChange={(event) => update('rank', event.target.value)} className={CONTROL_CLASS} placeholder="예: 1" />
            </Field>
            <Field label="연도">
              <input type="number" value={form.year} onChange={(event) => update('year', event.target.value)} className={CONTROL_CLASS} placeholder="예: 2025" />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="목록 원문 저자·제작자">
              <input value={form.rawCreator} onChange={(event) => update('rawCreator', event.target.value)} className={CONTROL_CLASS} placeholder="원문에 적힌 저자 또는 제작자" />
            </Field>
            <Field label="항목 정렬 순서" hint="작은 숫자가 먼저 표시됩니다.">
              <input type="number" value={form.sortOrder} onChange={(event) => update('sortOrder', event.target.value)} className={CONTROL_CLASS} placeholder="예: 1" />
            </Field>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="선정 사유">
              <textarea value={form.note} onChange={(event) => update('note', event.target.value)} className={TEXTAREA_CLASS} placeholder="선정 기관이 남긴 설명 또는 편집 메모" />
            </Field>
            <Field label="선정 사유 · English">
              <textarea value={form.noteEn} onChange={(event) => update('noteEn', event.target.value)} className={TEXTAREA_CLASS} placeholder="Selection note" />
            </Field>
          </div>
          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-bg-secondary/50 p-3 hover:border-accent/60">
            <input type="checkbox" checked={form.hidden} onChange={(event) => update('hidden', event.target.checked)} className="mt-0.5 h-4 w-4 accent-accent" />
            <span><span className="block text-sm font-semibold text-text-primary">이 목록에서 숨김</span><span className="mt-1 block text-[11px] text-text-secondary">원문 보존을 위해 행은 남기고 공개 목록에서만 제외합니다.</span></span>
          </label>
        </section>

        {error && <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2.5 text-sm text-red-200">{error}</p>}

        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {item && <button type="button" onClick={handleDelete} disabled={isSubmitting} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-400/10 hover:text-red-200"><Trash2 className="h-3.5 w-3.5" />항목 삭제</button>}
          </div>
          <div className="flex gap-2 sm:justify-end">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-text-primary"><X className="h-4 w-4" />취소</button>
            <button type="submit" disabled={isSubmitting} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-[#08111c] hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {item ? '항목 저장' : '항목 추가'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

function ExternalLinkIcon() {
  return <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4 fill-none stroke-current" strokeWidth="1.5"><path d="M9.5 2H14v4.5M14 2 7.5 8.5" /><path d="M12 9v3.5A1.5 1.5 0 0 1 10.5 14h-7A1.5 1.5 0 0 1 2 12.5v-7A1.5 1.5 0 0 1 3.5 4H7" /></svg>
}
