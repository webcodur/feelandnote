'use client'

import { useActionState } from 'react'
import { loginWithEmail } from '@/actions/auth'
import Button from '@/components/ui/Button'
import Link from 'next/link'

type State = { error?: string } | undefined

export default function EmailLoginForm() {
  const [state, formAction, isPending] = useActionState<State, FormData>(
    async (_prev, formData) => {
      const result = await loginWithEmail(formData)
      return result
    },
    undefined
  )

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-3">
        <input
          type="email"
          name="email"
          placeholder="이메일"
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        />
        <input
          type="password"
          name="password"
          placeholder="비밀번호"
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-400">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full rounded-lg bg-accent px-4 py-3 font-medium text-white hover:bg-accent-hover disabled:opacity-50"
      >
        {isPending ? '로그인 중...' : '로그인'}
      </Button>

      <p className="text-center text-sm text-zinc-500">
        계정이 없으신가요?{' '}
        <Link href="/signup" className="text-accent hover:underline">
          회원가입
        </Link>
      </p>
    </form>
  )
}
