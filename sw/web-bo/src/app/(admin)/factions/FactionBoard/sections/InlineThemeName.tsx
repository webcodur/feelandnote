'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { updateTag } from '@/actions/admin/tags'
import { useToast } from '@/contexts/ToastContext'

/**
 * 목록에 보이는 테마명을 그 자리에서 고친다.
 *
 * Enter 또는 포커스 이탈로 저장하고, Escape 로 마지막 저장값을 되돌린다. 테마 상세 화면을
 * 열지 않아도 이름만 빠르게 정리하려는 운영 흐름을 위한 입력칸이다.
 */
export default function InlineThemeName({
  themeId,
  name,
  className = '',
}: {
  themeId: string
  name: string
  className?: string
}) {
  const router = useRouter()
  const { showToast } = useToast()
  const [pending, startTransition] = useTransition()
  const [draft, setDraft] = useState(name)
  const [savedName, setSavedName] = useState(name)

  const save = () => {
    if (pending) return

    const nextName = draft.trim()
    if (!nextName) {
      setDraft(savedName)
      showToast('error', '테마명은 비워 둘 수 없습니다')
      return
    }
    if (nextName === savedName) {
      if (draft !== nextName) setDraft(nextName)
      return
    }

    startTransition(async () => {
      const result = await updateTag({ id: themeId, name: nextName })
      if (!result.success) {
        setDraft(savedName)
        showToast('error', `테마명 저장 실패 — ${result.error ?? '알 수 없는 오류'}`)
        return
      }

      setDraft(nextName)
      setSavedName(nextName)
      router.refresh()
    })
  }

  return (
    <span className="pointer-events-auto inline-flex min-w-0 items-center gap-1.5">
      <input
        type="text"
        value={draft}
        size={Math.max(8, Math.min(28, draft.length + 2))}
        disabled={pending}
        aria-label={`${savedName} 테마명 수정`}
        title={pending ? '테마명 저장 중' : '테마명을 바로 수정합니다'}
        onChange={event => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            setDraft(savedName)
            event.currentTarget.blur()
          }
        }}
        className={`min-w-32 max-w-[24rem] rounded border border-transparent bg-transparent px-1 py-0.5 font-semibold text-text-primary hover:border-accent/60 hover:bg-bg-card focus:border-accent focus:bg-bg-card focus:outline-none disabled:opacity-60 ${className}`}
      />
      {pending && <Loader2 aria-label="저장 중" className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" />}
    </span>
  )
}
