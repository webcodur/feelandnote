'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { saveCelebExplanation } from '@/actions/admin/celeb-explanation'
import type { CelebExplanation, CelebExplanationReviewStatus } from '@/lib/admin/celeb-explanations'
import { formatKstDateTime } from '@/lib/date-format'
import { useToast } from '@/contexts/ToastContext'
import { useLangMode } from '@/contexts/LangModeContext'

interface CelebExplanationSectionProps {
  celebId: string
  slug: string | null
  explanation: CelebExplanation | null
}

const REVIEW_STATUS: { value: CelebExplanationReviewStatus; label: string; className: string }[] = [
  { value: 'ai_reviewed', label: 'AI 검수 완료', className: 'bg-blue-500/10 text-blue-400' },
  { value: 'human_reviewed', label: '인간 검수 완료', className: 'bg-violet-500/10 text-violet-400' },
  { value: null, label: '미검수', className: 'bg-slate-500/10 text-slate-400' },
]

interface Draft {
  plainText: string
  interpretiveTitle: string
  interpretiveText: string
  plainTextEn: string
  interpretiveTitleEn: string
  interpretiveTextEn: string
  reviewStatus: CelebExplanationReviewStatus
}

function toDraft(explanation: CelebExplanation | null): Draft {
  return {
    plainText: explanation?.plain_text ?? '',
    interpretiveTitle: explanation?.interpretive_title ?? '',
    interpretiveText: explanation?.interpretive_text ?? '',
    plainTextEn: explanation?.plain_text_en ?? '',
    interpretiveTitleEn: explanation?.interpretive_title_en ?? '',
    interpretiveTextEn: explanation?.interpretive_text_en ?? '',
    reviewStatus: explanation?.review_status ?? null,
  }
}

export default function CelebExplanationSection({ celebId, slug, explanation }: CelebExplanationSectionProps) {
  const { showToast } = useToast()
  const langMode = useLangMode()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Draft>(() => toDraft(explanation))
  const [saving, setSaving] = useState(false)
  const showKo = langMode !== 'en'
  const showEn = langMode !== 'ko'

  const initial = useRef(toDraft(explanation))

  const isDirty = useCallback(
    () => JSON.stringify(draft) !== JSON.stringify(initial.current),
    [draft],
  )

  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (isDirty()) {
        e.preventDefault()
        return ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const setField = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }))

  async function save() {
    setSaving(true)
    try {
      await saveCelebExplanation({
        profileId: celebId,
        slug,
        plainText: draft.plainText,
        interpretiveTitle: draft.interpretiveTitle,
        interpretiveText: draft.interpretiveText,
        plainTextEn: draft.plainTextEn,
        interpretiveTitleEn: draft.interpretiveTitleEn,
        interpretiveTextEn: draft.interpretiveTextEn,
        reviewStatus: draft.reviewStatus,
      })
      initial.current = { ...draft }
      showToast('success', '읽어보기가 저장되었습니다.')
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '읽어보기 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const reviewBadge = REVIEW_STATUS.find((r) => r.value === draft.reviewStatus) ?? REVIEW_STATUS[2]
  const koBlock = (
    <div className="space-y-3">
      {langMode === 'both' && <p className="text-xs font-semibold text-accent">국문</p>}
      <Field
        label="인물 안내"
        hint="권장 150~300자"
        count={draft.plainText.length}
        value={draft.plainText}
        onChange={(v) => setField('plainText', v)}
      />
      <Field
        label="인물 탐구 제목"
        hint="권장 20~40자"
        count={draft.interpretiveTitle.length}
        value={draft.interpretiveTitle}
        onChange={(v) => setField('interpretiveTitle', v)}
        singleLine
      />
      <Field
        label="인물 탐구 본문"
        hint="권장 400~800자"
        count={draft.interpretiveText.length}
        value={draft.interpretiveText}
        onChange={(v) => setField('interpretiveText', v)}
      />
    </div>
  )
  const enBlock = (
    <div className={`space-y-3 ${showKo ? 'pt-2 border-t border-border' : ''}`}>
      {langMode === 'both' && <p className="text-xs font-semibold text-text-secondary">영문</p>}
      <Field
        label="인물 안내"
        hint="권장 150~300자"
        count={draft.plainTextEn.length}
        value={draft.plainTextEn}
        onChange={(v) => setField('plainTextEn', v)}
        placeholder="영문 번역 (비워 두면 미제공)"
      />
      <Field
        label="인물 탐구 제목"
        hint="권장 20~40자"
        count={draft.interpretiveTitleEn.length}
        value={draft.interpretiveTitleEn}
        onChange={(v) => setField('interpretiveTitleEn', v)}
        singleLine
        placeholder="영문 번역 (비워 두면 미제공)"
      />
      <Field
        label="인물 탐구 본문"
        hint="권장 400~800자"
        count={draft.interpretiveTextEn.length}
        value={draft.interpretiveTextEn}
        onChange={(v) => setField('interpretiveTextEn', v)}
        placeholder="영문 번역 (비워 두면 미제공)"
      />
    </div>
  )

  const summaryText =
    draft.interpretiveTitle || draft.plainText
      ? `${draft.interpretiveTitle ? `[${draft.interpretiveTitle}] ` : ''}${draft.plainText}`
      : '처음 보는 독자를 위한 안내와, 사실을 한 번 더 연결해 읽는 탐구'

  return (
    <section className="bg-bg-card border border-border rounded-lg overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full p-4 flex items-center justify-between hover:bg-white/5">
        <div className="text-left min-w-0 pr-4">
          <h2 className="text-base font-semibold text-text-primary">읽어보기</h2>
          {!open && (
            <p className="mt-1 text-xs text-text-tertiary truncate">
              {summaryText}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`rounded px-2 py-1 text-xs font-medium ${reviewBadge.className}`}>
            {reviewBadge.label}
          </span>
          {explanation && (
            <span
              className={`rounded px-2 py-1 text-xs font-medium ${
                explanation.published_at
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-yellow-500/10 text-yellow-400'
              }`}
            >
              {explanation.published_at ? '게시됨' : '미게시 · 검토용'}
            </span>
          )}
          {open ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-5">
          {!explanation && (
            <p className="rounded-lg border border-dashed border-border bg-bg-secondary/40 px-4 py-3 text-xs text-text-secondary">
              아직 작성된 읽어보기 원고가 없습니다. 아래에 입력하고 저장하면 새로 등록됩니다.
            </p>
          )}

          {showKo && koBlock}
          {showEn && enBlock}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary">검수 상태</span>
              <div className="flex gap-1">
                {REVIEW_STATUS.map((status) => (
                  <button
                    key={String(status.value)}
                    type="button"
                    onClick={() => setField('reviewStatus', status.value)}
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      draft.reviewStatus === status.value
                        ? `${status.className} ring-1 ring-inset ring-current`
                        : 'bg-bg-secondary text-text-tertiary hover:text-text-primary'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>

            {isDirty() && (
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                저장
              </button>
            )}
          </div>

          {explanation && (
            <p className="text-[11px] text-text-tertiary">
              최종 수정 {formatKstDateTime(explanation.updated_at)}
            </p>
          )}
        </div>
      )}
    </section>
  )
}

function Field({
  label,
  count,
  value,
  onChange,
  singleLine = false,
  placeholder,
  hint,
}: {
  label: string
  count: number
  value: string
  onChange: (value: string) => void
  singleLine?: boolean
  placeholder?: string
  hint?: string
}) {
  const inputClass =
    'w-full px-3 py-1.5 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none'

  return (
    <div className="grid grid-cols-[7rem_1fr] gap-x-3 items-start">
      <span className="pt-2 text-xs font-medium text-text-secondary">
        {label}
        <span className="mt-0.5 block text-[11px] font-normal text-text-tertiary">
          {count}자 {hint && <span className="text-[10px] text-text-tertiary/70">({hint})</span>}
        </span>
      </span>
      {singleLine ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
        />
      ) : (
        <AutoTextarea value={value} onChange={onChange} placeholder={placeholder} className={inputClass} />
      )}
    </div>
  )
}

function AutoTextarea({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={2}
      className={`${className} resize-none leading-6`}
    />
  )
}
