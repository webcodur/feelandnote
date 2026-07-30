'use client'

import { useTranslations } from 'next-intl'
import type { FreePostDraft } from './useFreePostDraft'
import { UgcTermsNotice } from '@/components/features/moderation'

interface FreePostFieldsProps {
  draft: FreePostDraft
  isLoggedIn: boolean
  mode: 'create' | 'edit'
  /** 인라인 작성처럼 좁은 자리에서는 내용 입력칸을 줄인다 */
  compact?: boolean
}

const INPUT_CLASS =
  'w-full px-4 py-3 bg-bg-card border border-border rounded-xl text-text-primary placeholder: focus:outline-none focus:border-accent'

export default function FreePostFields({ draft, isLoggedIn, mode, compact = false }: FreePostFieldsProps) {
  const t = useTranslations('board')
  const idPrefix = compact ? 'inline' : 'page'

  return (
    <>
      {/* 익명 토글 (작성 · 로그인 사용자만) */}
      {mode === 'create' && isLoggedIn && (
        <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary select-none">
          <input
            type="checkbox"
            checked={draft.anonymous}
            onChange={(e) => draft.setAnonymous(e.target.checked)}
            className="w-4 h-4 accent-accent"
          />
          {t('free.anonymousToggle')}
        </label>
      )}

      {/* 필명 (비로그인 또는 익명 선택 시) — 계정 글은 프로필 닉네임을 쓰므로 감춘다 */}
      {draft.nicknameVisible && (
        <div>
          <label htmlFor={`${idPrefix}-nickname`} className="block text-sm font-medium text-text-secondary mb-2">
            {t('free.nicknameLabel')}
          </label>
          <input
            id={`${idPrefix}-nickname`}
            type="text"
            value={draft.nickname}
            onChange={(e) => draft.setNickname(e.target.value)}
            placeholder={t('free.nicknamePlaceholder')}
            maxLength={20}
            className={INPUT_CLASS}
          />
        </div>
      )}

      {/* 제목 */}
      <div>
        <label htmlFor={`${idPrefix}-title`} className="block text-sm font-medium text-text-secondary mb-2">
          {t('title')}
        </label>
        <input
          id={`${idPrefix}-title`}
          type="text"
          value={draft.title}
          onChange={(e) => draft.setTitle(e.target.value)}
          placeholder={t('titlePlaceholder')}
          maxLength={100}
          className={INPUT_CLASS}
        />
        <p className="text-xs mt-1 text-end">{draft.title.length}/100</p>
      </div>

      {/* 내용 */}
      <div>
        <label htmlFor={`${idPrefix}-content`} className="block text-sm font-medium text-text-secondary mb-2">
          {t('content')}
        </label>
        <textarea
          id={`${idPrefix}-content`}
          value={draft.content}
          onChange={(e) => draft.setContent(e.target.value)}
          placeholder={t('contentPlaceholder')}
          maxLength={5000}
          rows={compact ? 6 : 12}
          className={`${INPUT_CLASS} resize-none`}
        />
        <p className="text-xs mt-1 text-end">{draft.content.length}/5000</p>
      </div>

      {/* 비밀번호 (비로그인 작성 · 익명 글 수정 시) */}
      {draft.passwordRequired && (
        <div>
          <label htmlFor={`${idPrefix}-password`} className="block text-sm font-medium text-text-secondary mb-2">
            {t('free.passwordLabel')}
          </label>
          <input
            id={`${idPrefix}-password`}
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={draft.password}
            onChange={(e) => draft.setPassword(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
            placeholder={t('free.passwordPlaceholder')}
            maxLength={4}
            className="w-40 px-4 py-3 bg-bg-card border border-border rounded-xl text-center tracking-[0.5em] text-text-primary placeholder:tracking-normal placeholder: focus:outline-none focus:border-accent"
          />
          <p className="text-xs mt-1">{t('free.passwordHint')}</p>
        </div>
      )}

      {/* 게시 전 약관·금지 콘텐츠 안내 (작성 시에만) */}
      {mode === 'create' && <UgcTermsNotice />}

      {/* 에러 */}
      {draft.error && <p className="text-sm text-red-400">{draft.error}</p>}
    </>
  )
}
