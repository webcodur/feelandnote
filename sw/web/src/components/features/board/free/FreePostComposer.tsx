'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui'
import type { FreePost } from '@/types/database'
import { useFreePostDraft } from './useFreePostDraft'
import FreePostFields from './FreePostFields'

interface FreePostComposerProps {
  isLoggedIn: boolean
  /** 등록 후 이동 없이 목록만 갱신할지 — 홈처럼 둘러보는 자리에서 쓴다 */
  stayOnPage?: boolean
  /**
   * 등록된 글을 부모 목록에 바로 얹고 싶을 때 쓴다.
   * 목록을 자체 상태로 들고 있는 화면(홈)은 router.refresh()만으로는 갱신되지 않는다 —
   * 서버가 새 목록을 내려줘도 이미 마운트된 컴포넌트의 useState 초기값은 다시 읽히지 않기 때문이다.
   */
  onCreated?: (post: FreePost) => void
}

// 글쓰기를 누른 자리에서 그대로 펼쳐 쓰는 작성기.
// 게시판 목록과 홈이 함께 쓴다(별도 페이지 /write는 직통 접근·공유 링크용으로 남겨둔다).
export default function FreePostComposer({ isLoggedIn, stayOnPage = false, onCreated }: FreePostComposerProps) {
  const router = useRouter()
  const t = useTranslations('board')
  const [isOpen, setIsOpen] = useState(false)

  const draft = useFreePostDraft({
    mode: 'create',
    isLoggedIn,
    onSuccess: (post) => {
      if (stayOnPage) {
        draft.reset()
        setIsOpen(false)
        onCreated?.(post)
        // 서버 쪽 목록도 맞춰둔다 — 다음 이동·재방문에서 최신이 뜨도록
        router.refresh()
        return
      }
      router.push(`/agora/board/free/${post.id}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    draft.submit()
  }

  if (!isOpen) {
    return (
      <div className="flex justify-end">
        <Button size="sm" className="gap-2" onClick={() => setIsOpen(true)}>
          <Plus size={16} />
          <span className="font-serif">{t('free.write')}</span>
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-5 rounded-xl bg-bg-card/50 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif text-text-primary">{t('free.createTitle')}</h2>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label={t('cancel')}
          className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <FreePostFields draft={draft} isLoggedIn={isLoggedIn} mode="create" compact />

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
            {t('cancel')}
          </Button>
          <Button type="submit" disabled={draft.isSubmitting}>
            {draft.isSubmitting ? t('saving') : t('free.createSubmit')}
          </Button>
        </div>
      </form>
    </div>
  )
}
