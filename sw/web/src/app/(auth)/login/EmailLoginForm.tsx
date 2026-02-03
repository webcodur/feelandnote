'use client'

import { useState, useEffect, useActionState } from 'react'
import { loginWithEmail } from '@/actions/auth'
import Button from '@/components/ui/Button'
import Link from 'next/link'
import { ArrowLeft, Mail, Eye, EyeOff } from 'lucide-react'

type State = { error?: string } | undefined

interface Props {
  onExpandChange?: (expanded: boolean) => void
}

const STORAGE_KEY = 'feelandnote_saved_email'

export default function EmailLoginForm({ onExpandChange }: Props) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [email, setEmail] = useState('')
  const [saveEmail, setSaveEmail] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // 저장된 이메일 불러오기
  useEffect(() => {
    const savedEmail = localStorage.getItem(STORAGE_KEY)
    if (savedEmail) {
      setEmail(savedEmail)
      setSaveEmail(true)
    }
  }, [])

  const handleExpand = () => {
    setIsExpanded(true)
    onExpandChange?.(true)
  }

  const handleCollapse = () => {
    setIsExpanded(false)
    onExpandChange?.(false)
  }

  const [state, formAction, isPending] = useActionState<State, FormData>(
    async (_prev, formData) => {
      // 이메일 저장 처리
      const emailValue = formData.get('email') as string
      if (saveEmail && emailValue) {
        localStorage.setItem(STORAGE_KEY, emailValue)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }

      const result = await loginWithEmail(formData)
      return result
    },
    undefined
  )

  if (!isExpanded) {
    return (
      <Button
        type="button"
        unstyled
        onClick={handleExpand}
        className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white hover:bg-zinc-800"
      >
        <Mail className="h-5 w-5" />
        <span>이메일로 계속하기</span>
      </Button>
    )
  }

  return (
    <form action={formAction} className="space-y-4">
      <Button
        unstyled
        type="button"
        onClick={handleCollapse}
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>다른 방법으로 로그인</span>
      </Button>

      <div className="space-y-3">
        <input
          type="email"
          name="email"
          placeholder="이메일"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
        />
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="비밀번호"
            required
            className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 pr-12 text-white placeholder:text-zinc-500 focus:border-zinc-500 focus:outline-none"
          />
          <Button
            unstyled
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-zinc-400 hover:text-white"
          >
            {showPassword ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* 이메일 저장 체크박스 */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={saveEmail}
          onChange={(e) => setSaveEmail(e.target.checked)}
          className="h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-accent focus:ring-accent focus:ring-offset-0"
        />
        <span className="text-sm text-zinc-400">이메일 저장</span>
      </label>

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
