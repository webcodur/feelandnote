'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { KeyRound } from 'lucide-react'
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

interface PasswordPromptModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (password: string) => void | Promise<void>
  isLoading?: boolean
  error?: string | null
  title?: string
  description?: string
}

// 폼을 별도 컴포넌트로 분리 — 모달이 닫히면 언마운트되어 입력값이 자동 초기화된다.
function PasswordForm({
  onConfirm,
  onClose,
  isLoading = false,
  error,
  description,
}: Pick<PasswordPromptModalProps, 'onConfirm' | 'onClose' | 'isLoading' | 'error' | 'description'>) {
  const t = useTranslations('board')
  const [password, setPassword] = useState('')
  const valid = /^[0-9]{4}$/.test(password)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!valid || isLoading) return
    onConfirm(password)
  }

  return (
    <form onSubmit={handleSubmit}>
      <ModalBody className="space-y-4">
        <p className="text-sm text-text-secondary">{description ?? t('free.passwordPromptDesc')}</p>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
          placeholder={t('free.passwordPlaceholder')}
          maxLength={4}
          className="w-full px-4 py-3 bg-bg-card border border-border rounded-xl text-center tracking-[0.5em] text-text-primary placeholder:tracking-normal placeholder: focus:outline-none focus:border-accent"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
      </ModalBody>
      <ModalFooter>
        <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
          {t('cancel')}
        </Button>
        <Button type="submit" disabled={!valid || isLoading} className="flex-1">
          {isLoading ? t('saving') : t('free.confirm')}
        </Button>
      </ModalFooter>
    </form>
  )
}

// 익명 게시판 수정·삭제 시 4자리 비밀번호를 확인받는 모달
export default function PasswordPromptModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading,
  error,
  title,
  description,
}: PasswordPromptModalProps) {
  const t = useTranslations('board')

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title ?? t('free.passwordPrompt')} icon={KeyRound} size="sm">
      <PasswordForm
        onConfirm={onConfirm}
        onClose={onClose}
        isLoading={isLoading}
        error={error}
        description={description}
      />
    </Modal>
  )
}
