'use client'

import { useState } from 'react'
import { Link, useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui'
import type { NoticeWithAuthor } from '@/types/database'
import { createNotice, updateNotice } from '@/actions/board/notices'
import { LaurelIcon } from '@/components/ui/icons/neo-pantheon/LaurelIcon'
import { isScheduledNotice } from '@/lib/board/noticeSchedule'

interface NoticeFormProps {
  mode: 'create' | 'edit'
  notice?: NoticeWithAuthor
}

/** datetime-local 입력이 읽는 값으로 바꾼다. 관리자가 보는 시각은 자기 시간대다. */
function toLocalInputValue(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
    + `T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default function NoticeForm({ mode, notice }: NoticeFormProps) {
  const router = useRouter()
  const t = useTranslations('board')
  const tError = useTranslations('actionErrors')
  const [title, setTitle] = useState(notice?.title ?? '')
  const [content, setContent] = useState(notice?.content ?? '')
  const [titleEn, setTitleEn] = useState(notice?.title_en ?? '')
  const [contentEn, setContentEn] = useState(notice?.content_en ?? '')
  const [isPinned, setIsPinned] = useState(notice?.is_pinned ?? false)
  const [publishAt, setPublishAt] = useState(
    notice?.created_at ? toLocalInputValue(notice.created_at) : ''
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  // 목록의 「예약」 딱지와 같은 기준을 본다. 시계는 렌더가 아니라 입력이 바뀔 때만 읽는다.
  const [isScheduled, setIsScheduled] = useState(
    () => (notice?.created_at ? isScheduledNotice(notice.created_at) : false)
  )

  const applyPublishAt = (value: string) => {
    setPublishAt(value)
    const at = value === '' ? null : new Date(value)
    setIsScheduled(at !== null && !Number.isNaN(at.getTime()) && isScheduledNotice(at.toISOString()))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)

    const result = mode === 'create'
      ? await createNotice({ title, content, titleEn, contentEn, is_pinned: isPinned, publishAt: publishAt || null })
      : await updateNotice({ id: notice!.id, title, content, titleEn, contentEn, is_pinned: isPinned, publishAt: publishAt || null })

    if (result.success) {
      router.push(mode === 'create' ? '/agora/board/notice' : `/agora/board/notice/${notice!.id}`)
    } else {
      alert(tError(result.error))
      setIsSubmitting(false)
    }
  }

  return (
    <div className="relative">
      <Link
        href={mode === 'create' ? '/agora/board/notice' : `/agora/board/notice/${notice?.id}`}
        className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-accent font-serif mb-6"
      >
        <ArrowLeft size={16} />
        {mode === 'create' ? t('backToList') : t('backToDetail')}
      </Link>

      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex-1 h-px bg-gradient-to-r from-accent-dim/50 to-transparent" />
        <h1 className="text-xl font-serif font-bold text-text-primary">
          {mode === 'create' ? t('notice.createTitle') : t('notice.editTitle')}
        </h1>
        <div className="flex-1 h-px bg-gradient-to-l from-accent-dim/50 to-transparent" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <fieldset className="space-y-4 rounded-lg border border-accent-dim/20 p-4">
          <legend className="px-2 text-sm font-serif font-medium text-accent">
            {t('notice.koreanVersion')}
          </legend>
          <div>
            <label htmlFor="notice-title-ko" className="block text-sm font-serif font-medium text-text-primary mb-2">
              {t('title')}
            </label>
            <input
              id="notice-title-ko"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={t('titlePlaceholder')}
              maxLength={100}
              required
              className="w-full px-4 py-3 bg-bg-card/60 border border-accent-dim/20 rounded-lg text-text-primary font-serif placeholder: focus:outline-none focus:border-accent/40 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="notice-content-ko" className="block text-sm font-serif font-medium text-text-primary mb-2">
              {t('content')}
            </label>
            <textarea
              id="notice-content-ko"
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={t('contentPlaceholder')}
              rows={10}
              required
              className="w-full px-4 py-3 bg-bg-card/60 border border-accent-dim/20 rounded-lg text-text-primary font-serif placeholder: focus:outline-none focus:border-accent/40 resize-y transition-colors"
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4 rounded-lg border border-accent-dim/20 p-4">
          <legend className="px-2 text-sm font-serif font-medium text-accent">
            {t('notice.englishVersion')}
          </legend>
          <div>
            <label htmlFor="notice-title-en" className="block text-sm font-serif font-medium text-text-primary mb-2">
              {t('title')}
            </label>
            <input
              id="notice-title-en"
              type="text"
              value={titleEn}
              onChange={e => setTitleEn(e.target.value)}
              placeholder={t('titlePlaceholder')}
              maxLength={100}
              required
              className="w-full px-4 py-3 bg-bg-card/60 border border-accent-dim/20 rounded-lg text-text-primary font-serif placeholder: focus:outline-none focus:border-accent/40 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="notice-content-en" className="block text-sm font-serif font-medium text-text-primary mb-2">
              {t('content')}
            </label>
            <textarea
              id="notice-content-en"
              value={contentEn}
              onChange={e => setContentEn(e.target.value)}
              placeholder={t('contentPlaceholder')}
              rows={10}
              required
              className="w-full px-4 py-3 bg-bg-card/60 border border-accent-dim/20 rounded-lg text-text-primary font-serif placeholder: focus:outline-none focus:border-accent/40 resize-y transition-colors"
            />
          </div>
        </fieldset>

        <div className="flex items-center gap-3 p-4 rounded-lg bg-bg-card/40 border border-accent-dim/10">
          <input
            type="checkbox"
            id="isPinned"
            checked={isPinned}
            onChange={e => setIsPinned(e.target.checked)}
            className="w-4 h-4 rounded border-accent-dim/30 bg-bg-card text-accent focus:ring-accent"
          />
          <LaurelIcon size={16} color={isPinned ? '#d4af37' : '#8a732a'} strokeWidth={1.5} />
          <label htmlFor="isPinned" className="text-sm text-text-secondary font-serif">
            {t('notice.pinLabel')}
          </label>
        </div>

        <div className="space-y-2 p-4 rounded-lg bg-bg-card/40 border border-accent-dim/10">
          <label htmlFor="notice-publish-at" className="block text-sm font-serif font-medium text-text-primary">
            {t('notice.publishAtLabel')}
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <input
              id="notice-publish-at"
              type="datetime-local"
              value={publishAt}
              onChange={e => applyPublishAt(e.target.value)}
              className="px-4 py-3 bg-bg-card/60 border border-accent-dim/20 rounded-lg text-text-primary font-serif focus:outline-none focus:border-accent/40 transition-colors"
            />
            {publishAt !== '' && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => applyPublishAt('')}
                className="font-serif text-xs"
              >
                {t('notice.publishNow')}
              </Button>
            )}
            {isScheduled && (
              <span className="px-2 py-1 text-xs font-serif rounded bg-accent/20 text-accent">
                {t('notice.scheduledBadge')}
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary font-serif">
            {t('notice.publishAtHint')}
          </p>
        </div>

        {/* 하단 장식 */}
        <div className="flex items-center justify-center gap-4 pt-4">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-accent-dim/20" />
          <div className="text-accent-dim/30 text-xs">✦</div>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-accent-dim/20" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href={mode === 'create' ? '/agora/board/notice' : `/agora/board/notice/${notice?.id}`}>
            <Button type="button" variant="ghost" className="font-serif">
              {t('cancel')}
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="font-serif">
            {isSubmitting ? t('saving') : mode === 'create' ? t('create') : t('update')}
          </Button>
        </div>
      </form>
    </div>
  )
}
