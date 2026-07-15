'use client'

import { Link, useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui'
import type { FreePost } from '@/types/database'
import { useFreePostDraft } from './useFreePostDraft'
import FreePostFields from './FreePostFields'

interface FreePostFormProps {
  mode: 'create' | 'edit'
  initialData?: FreePost
  isLoggedIn: boolean
  needsPassword?: boolean // 수정 시 익명 글이면 true
}

export default function FreePostForm({ mode, initialData, isLoggedIn, needsPassword = false }: FreePostFormProps) {
  const router = useRouter()
  const t = useTranslations('board')
  const draft = useFreePostDraft({
    mode,
    isLoggedIn,
    initialData,
    needsPassword,
    onSuccess: (post) => router.push(`/agora/board/free/${post.id}`),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    draft.submit()
  }

  return (
    <div>
      {/* 뒤로가기 */}
      <Link
        href="/agora/board/free"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6"
      >
        <ArrowLeft size={16} />
        {t('backToList')}
      </Link>

      <h1 className="text-xl font-bold text-text-primary mb-6">
        {mode === 'create' ? t('free.createTitle') : t('free.editTitle')}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <FreePostFields draft={draft} isLoggedIn={isLoggedIn} mode={mode} />

        {/* 제출 */}
        <div className="flex justify-end gap-3">
          <Link href="/agora/board/free">
            <Button type="button" variant="ghost">
              {t('cancel')}
            </Button>
          </Link>
          <Button type="submit" disabled={draft.isSubmitting}>
            {draft.isSubmitting ? t('saving') : mode === 'create' ? t('free.createSubmit') : t('free.updateSubmit')}
          </Button>
        </div>
      </form>
    </div>
  )
}
