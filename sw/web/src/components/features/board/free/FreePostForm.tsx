'use client'

import { useState } from 'react'
import { Link, useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui'
import type { FreePost } from '@/types/database'
import { createFreePost, updateFreePost } from '@/actions/board/free'

interface FreePostFormProps {
  mode: 'create' | 'edit'
  initialData?: FreePost
  isLoggedIn: boolean
  needsPassword?: boolean // 수정 시 익명 글이면 true
}

export default function FreePostForm({ mode, initialData, isLoggedIn, needsPassword = false }: FreePostFormProps) {
  const router = useRouter()
  const t = useTranslations('board')
  const [nickname, setNickname] = useState(initialData?.nickname ?? '')
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [content, setContent] = useState(initialData?.content ?? '')
  const [password, setPassword] = useState('')
  const [anonymous, setAnonymous] = useState(initialData?.is_anonymous ?? false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 비밀번호 입력이 필요한 경우: 작성(비로그인) 또는 수정(익명 글)
  const passwordRequired = mode === 'create' ? !isLoggedIn : needsPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (passwordRequired && !/^[0-9]{4}$/.test(password)) {
      setError(t('free.passwordHint'))
      return
    }

    setIsSubmitting(true)
    const result =
      mode === 'create'
        ? await createFreePost(
            isLoggedIn
              ? { title, content, anonymous }
              : { title, content, nickname: nickname.trim() || undefined, password },
          )
        : await updateFreePost(
            needsPassword
              ? { id: initialData!.id, title, content, password }
              : { id: initialData!.id, title, content },
          )

    if (result.success) {
      router.push(`/agora/board/free/${result.data.id}`)
    } else {
      setError(result.message)
      setIsSubmitting(false)
    }
  }

  const inputClass =
    'w-full px-4 py-3 bg-bg-card border border-border rounded-xl text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent'

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
        {/* 닉네임 (작성 · 비로그인만) */}
        {mode === 'create' && !isLoggedIn && (
          <div>
            <label htmlFor="nickname" className="block text-sm font-medium text-text-secondary mb-2">
              {t('free.nicknameLabel')}
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={t('free.nicknamePlaceholder')}
              maxLength={20}
              className={inputClass}
            />
          </div>
        )}

        {/* 익명 토글 (작성 · 로그인 사용자만) */}
        {mode === 'create' && isLoggedIn && (
          <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary select-none">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            {t('free.anonymousToggle')}
          </label>
        )}

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
            className={inputClass}
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
            maxLength={5000}
            rows={12}
            className={`${inputClass} resize-none`}
          />
          <p className="text-xs text-text-tertiary mt-1 text-end">{content.length}/5000</p>
        </div>

        {/* 비밀번호 (비로그인 작성 · 익명 글 수정 시) */}
        {passwordRequired && (
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-2">
              {t('free.passwordLabel')}
            </label>
            <input
              id="password"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder={t('free.passwordPlaceholder')}
              maxLength={4}
              className="w-40 px-4 py-3 bg-bg-card border border-border rounded-xl text-center tracking-[0.5em] text-text-primary placeholder:tracking-normal placeholder:text-text-tertiary focus:outline-none focus:border-accent"
            />
            <p className="text-xs text-text-tertiary mt-1">{t('free.passwordHint')}</p>
          </div>
        )}

        {/* 에러 */}
        {error && <p className="text-sm text-red-400">{error}</p>}

        {/* 제출 */}
        <div className="flex justify-end gap-3">
          <Link href="/agora/board/free">
            <Button type="button" variant="ghost">
              {t('cancel')}
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('saving') : mode === 'create' ? t('free.createSubmit') : t('free.updateSubmit')}
          </Button>
        </div>
      </form>
    </div>
  )
}
