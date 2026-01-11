'use client'

import { useActionState } from 'react'
import { signupWithEmail } from '@/actions/auth'
import Button from '@/components/ui/Button'
import Link from 'next/link'

type State = { error?: string; success?: string } | undefined

export default function SignupForm() {
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
          placeholder="닉네임"
          required
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        />
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
          placeholder="비밀번호 (6자 이상)"
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
        {isPending ? '가입 중...' : '회원가입'}
      </Button>

      <p className="text-center text-sm text-zinc-500">
        이미 계정이 있으신가요?{' '}
        <Link href="/login" className="text-accent hover:underline">
          로그인
        </Link>
      </p>
    </form>
  )
}
