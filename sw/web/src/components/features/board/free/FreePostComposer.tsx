'use client'

import { useState } from 'react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui'
import { useFreePostDraft } from './useFreePostDraft'
import FreePostFields from './FreePostFields'

interface FreePostComposerProps {
  isLoggedIn: boolean
  /** 등록 후 이동 없이 목록만 갱신할지 — 홈처럼 둘러보는 자리에서 쓴다 */
  stayOnPage?: boolean
}

// 글쓰기를 누른 자리에서 그대로 펼쳐 쓰는 작성기.
// 게시판 목록과 홈이 함께 쓴다(별도 페이지 /write는 직통 접근·공유 링크용으로 남겨둔다).
export default function FreePostComposer({ isLoggedIn, stayOnPage = false }: FreePostComposerProps) {
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
