'use client'

import { useState } from 'react'
import { Link, useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui'
import type { FeedbackCategory, FeedbackWithAuthor } from '@/types/database'
import { createFeedback, updateFeedback } from '@/actions/board/feedbacks'
import { FEEDBACK_CATEGORIES } from '@/constants/board'

interface FeedbackFormProps {
  mode: 'create' | 'edit'
  initialData?: FeedbackWithAuthor
}

export default function FeedbackForm({ mode, initialData }: FeedbackFormProps) {
  const router = useRouter()
  const t = useTranslations('board')
  const [category, setCategory] = useState<FeedbackCategory>(initialData?.category ?? 'FEATURE_SUGGESTION')
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [content, setContent] = useState(initialData?.content ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const result = mode === 'create'
      ? await createFeedback({ category, title, content })
      : await updateFeedback({ id: initialData!.id, title, content })

    if (result.success) {
      router.push(`/agora/board/feedback/${result.data.id}`)
    } else {
      setError(result.message)
      setIsSubmitting(false)
    }
  }

  return (
    <div>
      {/* 뒤로가기 */}
      <Link
        href="/agora/board/feedback"
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary mb-6"
      >
        <ArrowLeft size={16} />
        {t('backToList')}
      </Link>

      <h1 className="text-xl font-bold text-text-primary mb-6">
        {mode === 'create' ? t('feedback.createTitle') : t('feedback.editTitle')}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 카테고리 선택 (수정 모드에서는 비활성화) */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-2">
            {t('feedback.categoryLabel')}
          </label>
          <div className="flex flex-wrap gap-2">
            {FEEDBACK_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => mode === 'create' && setCategory(cat)}
                disabled={mode === 'edit'}
                className={`
                  px-4 py-2 text-sm rounded-lg border
                  ${category === cat
                    ? 'bg-accent/20 border-accent text-accent'
                    : 'bg-bg-card border-border text-text-secondary hover:border-accent/50'
                  }
                  ${mode === 'edit' ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {t(`category.${cat}` as any)}
              </button>
            ))}
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-text-secondary mb-2">
            {t('title')}
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('titlePlaceholder')}
            maxLength={100}
            className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
          />
          <p className="text-xs text-text-tertiary mt-1 text-end">{title.length}/100</p>
        </div>

        {/* 내용 */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-text-secondary mb-2">
            {t('content')}
          </label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('contentPlaceholder')}
            maxLength={2000}
            rows={10}
            className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent resize-none"
          />
          <p className="text-xs text-text-tertiary mt-1 text-end">{content.length}/2000</p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}

        {/* 제출 버튼 */}
        <div className="flex justify-end gap-3">
          <Link href="/agora/board/feedback">
            <Button type="button" variant="ghost">
              {t('cancel')}
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('saving') : mode === 'create' ? t('feedback.createSubmit') : t('feedback.updateSubmit')}
          </Button>
        </div>
      </form>
    </div>
  )
}
