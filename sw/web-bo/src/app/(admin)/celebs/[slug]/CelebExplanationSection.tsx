'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { saveCelebExplanation } from '@/actions/admin/celeb-explanation'
import type { CelebExplanation } from '@/lib/admin/celeb-explanations'
import { formatKstDateTime } from '@/lib/date-format'
import { useToast } from '@/contexts/ToastContext'
import { useLangMode } from '@/contexts/LangModeContext'

interface CelebExplanationSectionProps {
  celebId: string
  slug: string | null
  explanation: CelebExplanation | null
}

interface Draft {
  plainText: string
  plainTextEn: string
  published: boolean
}

function toDraft(explanation: CelebExplanation | null): Draft {
  return {
    plainText: explanation?.plain_text ?? '',
    plainTextEn: explanation?.plain_text_en ?? '',
    published: Boolean(explanation?.published_at),
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
        plainTextEn: draft.plainTextEn,
        published: draft.published,
      })
      initial.current = { ...draft }
      showToast('success', '읽어보기가 저장되었습니다.')
    } catch (e) {
      showToast('error', e instanceof Error ? e.message : '읽어보기 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const koBlock = (
    <div className="space-y-3">
      {langMode === 'both' && <p className="text-xs font-semibold text-accent">국문</p>}
      <Field
        label="인물 안내"
        count={draft.plainText.length}
        value={draft.plainText}
        onChange={(v) => setField('plainText', v)}
      />
    </div>
  )
  const enBlock = (
    <div className={`space-y-3 ${showKo ? 'pt-2 border-t border-border' : ''}`}>
      {langMode === 'both' && <p className="text-xs font-semibold text-text-secondary">영문</p>}
      <Field
        label="인물 안내"
        count={draft.plainTextEn.length}
        value={draft.plainTextEn}
        onChange={(v) => setField('plainTextEn', v)}
        placeholder="영문 번역 (비워 두면 미제공)"
      />
    </div>
  )

  const summaryText = (langMode === 'en' ? draft.plainTextEn : draft.plainText)
    || '한 사람이 어떻게 생각하고 어떤 활동을 하려 했는지 알 수 있는 글'

  return (
    <section className="bg-bg-card border border-border rounded-lg overflow-hidden">
      <button type="button" onClick={() => setOpen(!open)} className="w-full p-4 flex items-center justify-between hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
        <div className="text-left min-w-0 pr-4">
          <h2 className="text-base font-semibold text-text-primary">읽어보기</h2>
          {!open && (
            <p className="mt-1 text-xs text-text-tertiary truncate">
              {summaryText}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {explanation && (
            <span
              className={`rounded px-2 py-1 text-xs font-medium ${
                explanation.published_at
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-yellow-500/10 text-yellow-400'
              }`}
            >
              {explanation.published_at ? '게시됨' : '미게시'}
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
            <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-xs text-text-secondary hover:bg-white/5 hover:text-text-primary">
              <input
                type="checkbox"
                checked={draft.published}
                onChange={(event) => setField('published', event.target.checked)}
                className="accent-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              />
              인물 안내 게시
            </label>
            {isDirty() && (
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
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
  placeholder,
}: {
  label: string
  count: number
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const inputClass =
    'w-full px-3 py-1.5 text-sm bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus-visible:border-accent focus-visible:outline-none'

  return (
    <div className="grid grid-cols-[7rem_1fr] gap-x-3 items-start">
      <span className="pt-2 text-xs font-medium text-text-secondary">
        {label}
        <span className="mt-0.5 block text-[11px] font-normal text-text-tertiary">
          {count}자
        </span>
      </span>
      <AutoTextarea value={value} onChange={onChange} placeholder={placeholder} className={inputClass} />
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
