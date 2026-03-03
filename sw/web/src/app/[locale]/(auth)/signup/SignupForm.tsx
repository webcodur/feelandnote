'use client'

import { useActionState } from 'react'
import { signupWithEmail } from '@/actions/auth'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import { Link } from '@/i18n/navigation'

type State = { error?: string; success?: string } | undefined

export default function SignupForm() {
  const t = useTranslations('auth.signup')
  const [state, formAction, isPending] = useActionState<State, FormData>(
    async (_prev, formData) => {
      const result = await signupWithEmail(formData)
      return result
    },
    undefined
  )

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-3">
        <input
          type="text"
          name="nickname"
          placeholder={t('nicknamePlaceholder')}
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        />
        <input
          type="email"
          name="email"
          placeholder={t('emailPlaceholder')}
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        />
        <input
          type="password"
          name="password"
          placeholder={t('passwordPlaceholder')}
          required
          minLength={6}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}

      {state?.success && (
        <p className="text-sm text-green-400">{state.success}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {isPending ? t('signingUp') : t('submit')}
      </Button>

      <p className="text-center text-sm text-zinc-500">
        {t('hasAccount')}{' '}
        <Link href="/login" className="text-accent hover:underline">
          {t('loginLink')}
        </Link>
      </p>
    </form>
  )
}
