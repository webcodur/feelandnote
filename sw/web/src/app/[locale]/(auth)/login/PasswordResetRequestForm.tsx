'use client'

import { useActionState } from 'react'
import { ArrowLeft, Loader2, Mail } from 'lucide-react'
import { useTranslations } from 'next-intl'
import {
  requestPasswordReset,
  type PasswordResetRequestErrorCode,
} from '@/actions/auth'
import Button from '@/components/ui/Button'

type State = {
  error?: PasswordResetRequestErrorCode
  success?: 'resetEmailSent'
} | undefined

interface Props {
  initialEmail: string
  onBack: () => void
}

export default function PasswordResetRequestForm({ initialEmail, onBack }: Props) {
  const t = useTranslations('auth.passwordResetRequest')
  const [state, formAction, isPending] = useActionState<State, FormData>(
    async (_previousState, formData) => requestPasswordReset(formData),
    undefined,
  )

  return (
    <form action={formAction} className="space-y-4">
      <Button
        unstyled
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>{t('backToLogin')}</span>
      </Button>

      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-white">{t('heading')}</h1>
        <p className="text-sm text-text-secondary">{t('description')}</p>
      </div>

      <div className="relative">
        <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" />
        <input
          type="email"
          name="email"
          defaultValue={initialEmail}
          placeholder={t('emailPlaceholder')}
          required
          autoFocus
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 py-3 pl-11 pr-4 text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-400">{t(`errors.${state.error}`)}</p>
      )}

      {state?.success && (
        <p className="text-sm text-green-400">{t(state.success)}</p>
      )}

      <Button
        type="submit"
        disabled={isPending || Boolean(state?.success)}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        {isPending ? t('sending') : t('submit')}
      </Button>
    </form>
  )
}
