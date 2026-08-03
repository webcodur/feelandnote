'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { updateFactionEpisodeTitle } from '@/actions/admin/factions/episodes'
import { useToast } from '@/contexts/ToastContext'

/** 목록에 보이는 영상 편 제목의 첫 줄만 고친다. 숨은 둘째 줄 이후는 그대로 보존한다. */
export default function InlineEpisodeTitle({
  folder,
  title,
}: {
  folder: string
  title: string
}) {
  const router = useRouter()
  const { showToast } = useToast()
  const [pending, startTransition] = useTransition()
  const [savedHead, ...titleTail] = title.split('\n')
  const [draft, setDraft] = useState(savedHead)

  const save = () => {
    if (pending) return

    const nextHead = draft.trim()
    if (!nextHead) {
      setDraft(savedHead)
      showToast('error', '영상 편 제목은 비워 둘 수 없습니다')
      return
    }
    if (nextHead === savedHead) {
      if (draft !== nextHead) setDraft(nextHead)
      return
    }

    startTransition(async () => {
      try {
        await updateFactionEpisodeTitle(folder, [nextHead, ...titleTail].join('\n'))
        setDraft(nextHead)
        router.refresh()
      } catch (error) {
        setDraft(savedHead)
        showToast('error', `영상 편 제목 저장 실패 — ${error instanceof Error ? error.message : String(error)}`)
      }
    })
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <input
        type="text"
        value={draft}
        disabled={pending}
        aria-label={`${savedHead} 영상 편 제목 수정`}
        title={pending ? '영상 편 제목 저장 중' : '영상 편 제목을 바로 수정합니다'}
        onChange={event => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
          } else if (event.key === 'Escape') {
            event.preventDefault()
            setDraft(savedHead)
            event.currentTarget.blur()
          }
        }}
        className="min-w-0 max-w-full rounded border border-transparent bg-transparent px-1 py-0.5 font-semibold text-text-primary hover:border-accent/60 hover:bg-bg-card group-hover:text-accent focus:border-accent focus:bg-bg-card focus:outline-none disabled:opacity-60"
      />
      {pending && <Loader2 aria-label="저장 중" className="h-3.5 w-3.5 shrink-0 animate-spin text-accent" />}
    </span>
  )
}
