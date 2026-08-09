'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { Check, Loader2, Pencil, X } from 'lucide-react'
import type { FeaturedTag } from '@/actions/home'
import { updateFactionTagName } from '@/actions/admin/factions/updateFactionTagName'
import type { Locale } from '@/types/locale'

type FactionNamePatch = Pick<FeaturedTag, 'name' | 'name_en'>

interface FactionNameEditorProps {
  tag: Pick<FeaturedTag, 'id' | 'name' | 'name_en'>
  locale: Locale
  titleClassName: string
  onSaved: (patch: FactionNamePatch) => void
}

const labels = {
  ko: {
    edit: '이름 수정',
    name: '한국어 이름',
    nameEn: '영문 이름',
    save: '저장',
    cancel: '취소',
    required: '한국어 이름을 입력해 주세요.',
    failed: '팩션 이름을 저장하지 못했습니다.',
  },
  en: {
    edit: 'Edit name',
    name: 'Korean name',
    nameEn: 'English name',
    save: 'Save',
    cancel: 'Cancel',
    required: 'Enter the Korean name.',
    failed: 'Could not save the faction name.',
  },
} as const

export default function FactionNameEditor({
  tag,
  locale,
  titleClassName,
  onSaved,
}: FactionNameEditorProps) {
  const copy = labels[locale]
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(tag.name)
  const [nameEn, setNameEn] = useState(tag.name_en ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const displayName = locale === 'en'
    ? tag.name_en?.trim() || tag.name
    : tag.name

  const beginEditing = () => {
    setError(null)
    setName(tag.name)
    setNameEn(tag.name_en ?? '')
    setEditing(true)
  }

  const cancelEditing = () => {
    if (isPending) return
    setError(null)
    setName(tag.name)
    setNameEn(tag.name_en ?? '')
    setEditing(false)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextName = name.trim()
    const nextNameEn = nameEn.trim()
    if (!nextName) {
      setError(copy.required)
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await updateFactionTagName({
        id: tag.id,
        name: nextName,
        name_en: nextNameEn || null,
      })
      if (!result.success) {
        setError(result.message || copy.failed)
        return
      }

      onSaved({ name: result.data.name, name_en: result.data.name_en })
      setEditing(false)
    })
  }

  if (editing) {
    return (
      <form
        className="relative z-20 flex w-full max-w-[22rem] flex-col gap-2 rounded-lg border border-accent/40 bg-bg-card/95 p-2.5 text-start shadow-lg pointer-events-auto"
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
      >
        <label className="sr-only" htmlFor={`faction-name-${tag.id}`}>
          {copy.name}
        </label>
        <input
          id={`faction-name-${tag.id}`}
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={copy.name}
          maxLength={100}
          autoFocus
          disabled={isPending}
          className="w-full rounded-md border border-border bg-bg-card px-2 py-1.5 text-sm text-text-primary outline-none focus:border-accent"
        />
        <label className="sr-only" htmlFor={`faction-name-en-${tag.id}`}>
          {copy.nameEn}
        </label>
        <input
          id={`faction-name-en-${tag.id}`}
          type="text"
          value={nameEn}
          onChange={(event) => setNameEn(event.target.value)}
          placeholder={copy.nameEn}
          maxLength={100}
          disabled={isPending}
          className="w-full rounded-md border border-border/70 bg-bg-card px-2 py-1.5 text-xs text-text-secondary outline-none focus:border-accent"
        />
        {error && <p className="text-[11px] text-red-300">{error}</p>}
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={cancelEditing}
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-text-secondary hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={12} />
            {copy.cancel}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1 rounded-md border border-accent/50 bg-accent/15 px-2 py-1 text-[11px] font-semibold text-accent hover:bg-accent/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
            {copy.save}
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="pointer-events-none relative z-20 flex min-w-0 items-center gap-2">
      <h3 className={`${titleClassName} min-w-0 pointer-events-none`}>{displayName}</h3>
      <button
        type="button"
        aria-label={copy.edit}
        title={copy.edit}
        onClick={(event) => {
          event.stopPropagation()
          beginEditing()
        }}
        className="pointer-events-auto inline-flex shrink-0 items-center justify-center rounded-md border border-white/20 bg-black/30 p-1.5 text-white/75 hover:border-accent hover:text-accent"
      >
        <Pencil size={13} />
      </button>
    </div>
  )
}
