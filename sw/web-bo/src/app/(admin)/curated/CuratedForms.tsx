'use client'

import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'
import { Check, Loader2, Trash2, X } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import {
  createCuratedList,
  createCurator,
  deleteCuratedList,
  deleteCurator,
  updateCuratedList,
  updateCurator,
  type CuratedAdminCurator,
  type CuratedAdminList,
  type CuratedListInput,
  type CuratorInput,
} from '@/actions/admin/curated'
import { CURATOR_KIND_OPTIONS } from '@/constants/curated'
import { CONTENT_TYPE_CONFIG, CONTENT_TYPES } from '@/constants/contentTypes'

const CONTROL_CLASS = 'w-full rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20'
const TEXTAREA_CLASS = `${CONTROL_CLASS} min-h-24 resize-y`

function Field({ label, hint, required, children, className = '' }: { label: string; hint?: string; required?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-xs font-semibold text-text-primary">
        {label}
        {required && <span className="ml-1 text-red-300">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11px] leading-4 text-text-secondary">{hint}</p>}
    </div>
  )
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-bg-secondary/60 p-3 hover:border-accent/60">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-text-primary">{label}</span>
        <span className="mt-1 block text-[11px] leading-4 text-text-secondary">{description}</span>
      </span>
    </label>
  )
}

function numberString(value: number | null | undefined, fallback = ''): string {
  return value == null ? fallback : String(value)
}

function numberValue(value: string): number | null {
  return value.trim() ? Number(value) : null
}

interface CuratorFormState {
  slug: string
  name: string
  nameEn: string
  kind: string
  country: string
  foundedYear: string
  description: string
  descriptionEn: string
  logoUrl: string
  homepageUrl: string
  sortOrder: string
  isFeatured: boolean
}

function curatorState(curator: CuratedAdminCurator | null): CuratorFormState {
  return {
    slug: curator?.slug ?? '',
    name: curator?.name ?? '',
    nameEn: curator?.nameEn ?? '',
    kind: curator?.kind ?? CURATOR_KIND_OPTIONS[0].value,
    country: curator?.country ?? '',
    foundedYear: numberString(curator?.foundedYear),
    description: curator?.description ?? '',
    descriptionEn: curator?.descriptionEn ?? '',
    logoUrl: curator?.logoUrl ?? '',
    homepageUrl: curator?.homepageUrl ?? '',
    sortOrder: numberString(curator?.sortOrder, '0'),
    isFeatured: curator?.isFeatured ?? true,
  }
}

export function CuratorFormModal({ curator, onClose, onSaved }: { curator: CuratedAdminCurator | null; onClose: () => void; onSaved: (id?: string) => void }) {
  const [form, setForm] = useState(() => curatorState(curator))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof CuratorFormState>(key: K, value: CuratorFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    const payload: CuratorInput = {
      slug: form.slug,
      name: form.name,
      nameEn: form.nameEn || null,
      kind: form.kind,
      country: form.country || null,
      foundedYear: numberValue(form.foundedYear),
      description: form.description || null,
      descriptionEn: form.descriptionEn || null,
      logoUrl: form.logoUrl || null,
      homepageUrl: form.homepageUrl || null,
      sortOrder: numberValue(form.sortOrder),
      isFeatured: form.isFeatured,
    }
    const result = curator ? await updateCurator(curator.id, payload) : await createCurator(payload)
    if (!result.success) {
      setError(result.error)
      setIsSubmitting(false)
      return
    }
    onSaved(result.data?.id)
  }

  async function handleDelete() {
    if (!curator || curator.listCount > 0) return
    if (!window.confirm(`「${curator.name}」 기관을 삭제할까요?`)) return
    setIsSubmitting(true)
    setError(null)
    const result = await deleteCurator(curator.id)
    if (!result.success) {
      setError(result.error)
      setIsSubmitting(false)
      return
    }
    onSaved()
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={curator ? '선정 기관 편집' : '새 선정 기관'}
      description="공개 허브에 표시되는 선정 주체의 기본 정보입니다."
      size="xl"
      closeOnOverlayClick={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="기관 이름" required>
            <input value={form.name} onChange={(event) => update('name', event.target.value)} className={CONTROL_CLASS} placeholder="예: BBC" required />
          </Field>
          <Field label="기관 이름 · English">
            <input value={form.nameEn} onChange={(event) => update('nameEn', event.target.value)} className={CONTROL_CLASS} placeholder="예: BBC" />
          </Field>
          <Field label="주소 slug" required hint="공개 기관 주소에 사용하는 고유 값입니다.">
            <input value={form.slug} onChange={(event) => update('slug', event.target.value)} className={`${CONTROL_CLASS} font-mono`} placeholder="bbc" required />
          </Field>
          <Field label="기관 유형" required>
            <select value={form.kind} onChange={(event) => update('kind', event.target.value)} className={CONTROL_CLASS} required>
              {CURATOR_KIND_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="국가 코드" hint="예: KR, US, GB">
            <input value={form.country} onChange={(event) => update('country', event.target.value)} className={CONTROL_CLASS} placeholder="US" />
          </Field>
          <Field label="설립 연도">
            <input type="number" value={form.foundedYear} onChange={(event) => update('foundedYear', event.target.value)} className={CONTROL_CLASS} placeholder="1922" />
          </Field>
          <Field label="로고 URL">
            <input type="url" value={form.logoUrl} onChange={(event) => update('logoUrl', event.target.value)} className={`${CONTROL_CLASS} font-mono`} placeholder="https://..." />
          </Field>
          <Field label="홈페이지 URL">
            <input type="url" value={form.homepageUrl} onChange={(event) => update('homepageUrl', event.target.value)} className={`${CONTROL_CLASS} font-mono`} placeholder="https://..." />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="설명">
            <textarea value={form.description} onChange={(event) => update('description', event.target.value)} className={TEXTAREA_CLASS} placeholder="기관에 대한 한국어 설명" />
          </Field>
          <Field label="설명 · English">
            <textarea value={form.descriptionEn} onChange={(event) => update('descriptionEn', event.target.value)} className={TEXTAREA_CLASS} placeholder="English description" />
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="허브 정렬 순서" hint="작은 숫자가 먼저 표시됩니다.">
            <input type="number" value={form.sortOrder} onChange={(event) => update('sortOrder', event.target.value)} className={CONTROL_CLASS} />
          </Field>
          <Toggle
            label="공개 허브에 노출"
            description="끄면 기관 상세 데이터는 보존하면서 허브의 기관 진열에서만 숨깁니다."
            checked={form.isFeatured}
            onChange={(checked) => update('isFeatured', checked)}
          />
        </div>

        {error && <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2.5 text-sm text-red-200">{error}</p>}

        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {curator && curator.listCount === 0 && (
              <button type="button" onClick={handleDelete} disabled={isSubmitting} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-400/10 hover:text-red-200">
                <Trash2 className="h-3.5 w-3.5" />
                기관 삭제
              </button>
            )}
            {curator && curator.listCount > 0 && <p className="text-[11px] text-text-secondary">목록 {curator.listCount}개가 있어 기관 삭제는 잠겨 있습니다.</p>}
          </div>
          <div className="flex gap-2 sm:justify-end">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-text-primary">
              <X className="h-4 w-4" />
              취소
            </button>
            <button type="submit" disabled={isSubmitting} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-[#08111c] hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {curator ? '기관 저장' : '기관 만들기'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

interface ListFormState {
  curatorId: string
  slug: string
  title: string
  titleEn: string
  description: string
  descriptionEn: string
  publishedYear: string
  edition: string
  seriesKey: string
  method: string
  methodEn: string
  sourceUrl: string
  coverImageUrl: string
  isRanked: boolean
  isAnnual: boolean
  contentType: string
  topics: string
  sortOrder: string
  isFeatured: boolean
}

function listState(list: CuratedAdminList | null, defaultCuratorId?: string, curators: CuratedAdminCurator[] = []): ListFormState {
  return {
    curatorId: list?.curatorId ?? defaultCuratorId ?? curators[0]?.id ?? '',
    slug: list?.slug ?? '',
    title: list?.title ?? '',
    titleEn: list?.titleEn ?? '',
    description: list?.description ?? '',
    descriptionEn: list?.descriptionEn ?? '',
    publishedYear: numberString(list?.publishedYear),
    edition: list?.edition ?? '',
    seriesKey: list?.seriesKey ?? '',
    method: list?.method ?? '',
    methodEn: list?.methodEn ?? '',
    sourceUrl: list?.sourceUrl ?? '',
    coverImageUrl: list?.coverImageUrl ?? '',
    isRanked: list?.isRanked ?? false,
    isAnnual: list?.isAnnual ?? false,
    contentType: list?.contentType ?? 'BOOK',
    topics: list?.topics.join(', ') ?? '',
    sortOrder: numberString(list?.sortOrder, '0'),
    isFeatured: list?.isFeatured ?? true,
  }
}

export function ListFormModal({ list, curators, defaultCuratorId, onClose, onSaved, onDeleted }: { list: CuratedAdminList | null; curators: CuratedAdminCurator[]; defaultCuratorId?: string; onClose: () => void; onSaved: (id?: string) => void; onDeleted?: () => void }) {
  const [form, setForm] = useState(() => listState(list, defaultCuratorId, curators))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function update<K extends keyof ListFormState>(key: K, value: ListFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)
    const payload: CuratedListInput = {
      curatorId: form.curatorId,
      slug: form.slug,
      title: form.title,
      titleEn: form.titleEn || null,
      description: form.description || null,
      descriptionEn: form.descriptionEn || null,
      publishedYear: numberValue(form.publishedYear),
      edition: form.edition || null,
      seriesKey: form.seriesKey || null,
      method: form.method || null,
      methodEn: form.methodEn || null,
      sourceUrl: form.sourceUrl,
      coverImageUrl: form.coverImageUrl || null,
      isRanked: form.isRanked,
      isAnnual: form.isAnnual,
      contentType: form.contentType,
      topics: form.topics.split(',').map((topic) => topic.trim()).filter(Boolean),
      sortOrder: numberValue(form.sortOrder),
      isFeatured: form.isFeatured,
    }
    const result = list ? await updateCuratedList(list.id, payload) : await createCuratedList(payload)
    if (!result.success) {
      setError(result.error)
      setIsSubmitting(false)
      return
    }
    onSaved(result.data?.id)
  }

  async function handleDelete() {
    if (!list) return
    if (!window.confirm(`「${list.title}」 목록과 그 안의 항목 ${list.itemCount.toLocaleString()}건을 삭제할까요? 이 작업은 되돌릴 수 없습니다.`)) return
    setIsSubmitting(true)
    setError(null)
    const result = await deleteCuratedList(list.id)
    if (!result.success) {
      setError(result.error)
      setIsSubmitting(false)
      return
    }
    if (onDeleted) onDeleted()
    else onSaved()
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={list ? '선정 목록 메타 편집' : '새 선정 목록'}
      description="원문 출처가 있는 기관 선정 목록을 등록합니다. 항목은 목록을 만든 뒤 따로 추가합니다."
      size="xl"
      closeOnOverlayClick={!isSubmitting}
      closeOnEscape={!isSubmitting}
    >
      <form onSubmit={handleSubmit} className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="선정 기관" required>
            <select value={form.curatorId} onChange={(event) => update('curatorId', event.target.value)} className={CONTROL_CLASS} required disabled={curators.length === 0}>
              {curators.length === 0 && <option value="">기관을 먼저 만드세요</option>}
              {curators.map((curator) => <option key={curator.id} value={curator.id}>{curator.name} · {curator.slug}</option>)}
            </select>
          </Field>
          <Field label="콘텐츠 유형" required hint="목록의 대상과 같은 유형의 콘텐츠만 항목에 연결할 수 있습니다.">
            <select value={form.contentType} onChange={(event) => update('contentType', event.target.value)} className={CONTROL_CLASS} required>
              {CONTENT_TYPES.map((type) => <option key={type} value={type}>{CONTENT_TYPE_CONFIG[type].label}</option>)}
            </select>
          </Field>
          <Field label="목록 이름" required>
            <input value={form.title} onChange={(event) => update('title', event.target.value)} className={CONTROL_CLASS} placeholder="예: BBC 빅 리드" required />
          </Field>
          <Field label="목록 이름 · English">
            <input value={form.titleEn} onChange={(event) => update('titleEn', event.target.value)} className={CONTROL_CLASS} placeholder="BBC Big Read" />
          </Field>
          <Field label="주소 slug" required hint="전체 목록 주소에 사용하는 고유 값입니다.">
            <input value={form.slug} onChange={(event) => update('slug', event.target.value)} className={`${CONTROL_CLASS} font-mono`} placeholder="bbc-big-read" required />
          </Field>
          <Field label="같은 계열 묶음 key" hint="연도별 판본을 화면에서 묶으려면 같은 값을 씁니다.">
            <input value={form.seriesKey} onChange={(event) => update('seriesKey', event.target.value)} className={`${CONTROL_CLASS} font-mono`} placeholder="bbc-big-read" />
          </Field>
          <Field label="발표 연도">
            <input type="number" value={form.publishedYear} onChange={(event) => update('publishedYear', event.target.value)} className={CONTROL_CLASS} placeholder="2025" />
          </Field>
          <Field label="판·회차 표기">
            <input value={form.edition} onChange={(event) => update('edition', event.target.value)} className={CONTROL_CLASS} placeholder="2025 edition" />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="목록 설명">
            <textarea value={form.description} onChange={(event) => update('description', event.target.value)} className={TEXTAREA_CLASS} placeholder="목록의 성격과 범위를 설명합니다." />
          </Field>
          <Field label="목록 설명 · English">
            <textarea value={form.descriptionEn} onChange={(event) => update('descriptionEn', event.target.value)} className={TEXTAREA_CLASS} placeholder="English description" />
          </Field>
          <Field label="선정 방식">
            <textarea value={form.method} onChange={(event) => update('method', event.target.value)} className={TEXTAREA_CLASS} placeholder="선정 방식 또는 심사 기준" />
          </Field>
          <Field label="선정 방식 · English">
            <textarea value={form.methodEn} onChange={(event) => update('methodEn', event.target.value)} className={TEXTAREA_CLASS} placeholder="Selection method" />
          </Field>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="원문 출처 URL" required hint="발행처의 원문 링크가 없으면 목록을 저장할 수 없습니다.">
            <input type="url" value={form.sourceUrl} onChange={(event) => update('sourceUrl', event.target.value)} className={`${CONTROL_CLASS} font-mono`} placeholder="https://..." required />
          </Field>
          <Field label="목록 커버 URL">
            <input type="url" value={form.coverImageUrl} onChange={(event) => update('coverImageUrl', event.target.value)} className={`${CONTROL_CLASS} font-mono`} placeholder="https://..." />
          </Field>
          <Field label="주제·장르 태그" hint="쉼표로 구분합니다. 예: fiction, classics, sf">
            <input value={form.topics} onChange={(event) => update('topics', event.target.value)} className={CONTROL_CLASS} placeholder="fiction, classics" />
          </Field>
          <Field label="목록 정렬 순서">
            <input type="number" value={form.sortOrder} onChange={(event) => update('sortOrder', event.target.value)} className={CONTROL_CLASS} />
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Toggle label="허브에 노출" description="기관 선정 허브의 목록 카드에 표시합니다." checked={form.isFeatured} onChange={(checked) => update('isFeatured', checked)} />
          <Toggle label="순위 있는 목록" description="항목의 순위 값을 순위로 표시합니다." checked={form.isRanked} onChange={(checked) => update('isRanked', checked)} />
          <Toggle label="연례 목록" description="항목별 수상·발표 연도를 함께 다룹니다." checked={form.isAnnual} onChange={(checked) => update('isAnnual', checked)} />
        </div>

        {error && <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2.5 text-sm text-red-200">{error}</p>}

        <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {list && <button type="button" onClick={handleDelete} disabled={isSubmitting} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-red-300 hover:bg-red-400/10 hover:text-red-200"><Trash2 className="h-3.5 w-3.5" />목록 삭제</button>}
          </div>
          <div className="flex gap-2 sm:justify-end">
            <button type="button" onClick={onClose} disabled={isSubmitting} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-text-primary"><X className="h-4 w-4" />취소</button>
            <button type="submit" disabled={isSubmitting || curators.length === 0} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-4 text-sm font-bold text-[#08111c] hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {list ? '목록 저장' : '목록 만들기'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
