'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { Plus, X, Send, Loader2 } from 'lucide-react'
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
      <button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl bg-bg-card/40 border border-white/5 hover:bg-white/[0.03] transition-colors group text-left"
      >
        <div className="flex-1 text-sm text-text-tertiary px-2 font-serif">
          {t('free.writePlaceholder')}
        </div>
        <div
          title={t('free.write')}
          className="w-10 h-10 rounded-full bg-accent/10 text-accent group-hover:bg-accent group-hover:text-bg-main flex items-center justify-center transition-colors shrink-0"
        >
          <Plus size={20} />
        </div>
      </button>
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

        <div className="flex justify-end gap-2">
          <button
            type="submit"
            disabled={draft.isSubmitting}
            title={draft.isSubmitting ? t('saving') : t('free.createSubmit')}
            className="w-9 h-9 rounded-full bg-accent text-bg-main hover:bg-accent-hover flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {draft.isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} className="mr-0.5" />}
          </button>
        </div>
      </form>
    </div>
  )
}
