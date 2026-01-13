'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { LogIn, Loader2, Eye, EyeOff } from 'lucide-react'
import Button from '@/components/ui/Button'

const STORAGE_KEY = {
  REMEMBER_EMAIL: 'bo_remember_email',
  SAVED_EMAIL: 'bo_saved_email',
  AUTO_LOGIN: 'bo_auto_login',
} as const

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 추가 기능 상태
  const [showPassword, setShowPassword] = useState(false)
  const [rememberEmail, setRememberEmail] = useState(false)
  const [autoLogin, setAutoLogin] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/users'
  const unauthorizedError = searchParams.get('error') === 'unauthorized'

  // 저장된 설정 불러오기
  useEffect(() => {
    const savedRememberEmail = localStorage.getItem(STORAGE_KEY.REMEMBER_EMAIL) === 'true'
    const savedEmail = localStorage.getItem(STORAGE_KEY.SAVED_EMAIL)
    const savedAutoLogin = localStorage.getItem(STORAGE_KEY.AUTO_LOGIN) === 'true'

    setRememberEmail(savedRememberEmail)
    setAutoLogin(savedAutoLogin)
    if (savedRememberEmail && savedEmail) {
      setEmail(savedEmail)
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // 설정 저장
    localStorage.setItem(STORAGE_KEY.REMEMBER_EMAIL, String(rememberEmail))
    localStorage.setItem(STORAGE_KEY.AUTO_LOGIN, String(autoLogin))
    if (rememberEmail) {
      localStorage.setItem(STORAGE_KEY.SAVED_EMAIL, email)
    } else {
      localStorage.removeItem(STORAGE_KEY.SAVED_EMAIL)
    }

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push(redirect)
    router.refresh()
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="block text-sm text-text-secondary mb-2">
          이메일
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
          placeholder="admin@example.com"
          required
        />
      </div>

      <div>
        <label className="block text-sm text-text-secondary mb-2">
          비밀번호
        </label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 pr-12 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
            placeholder="••••••••"
            required
          />
          <Button
            unstyled
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* 로그인 옵션 */}
      <div className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={rememberEmail}
            onChange={(e) => setRememberEmail(e.target.checked)}
            className="w-4 h-4 rounded border-border bg-bg-secondary accent-accent"
          />
          <span className="text-text-secondary">아이디 기억하기</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={autoLogin}
            onChange={(e) => setAutoLogin(e.target.checked)}
            className="w-4 h-4 rounded border-border bg-bg-secondary accent-accent"
          />
          <span className="text-text-secondary">자동 로그인</span>
        </label>
      </div>

      {unauthorizedError && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-500 text-sm">
          관리자 권한이 없습니다.
        </div>
      )}

      {error && (
        <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="w-full py-3 flex items-center justify-center gap-2"
        size="lg"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <LogIn className="w-5 h-5" />
        )}
        {loading ? '로그인 중...' : '로그인'}
      </Button>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bg-main flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-bg-card border border-border rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-text-primary mb-2">
              Feel&Note Admin
            </h1>
            <p className="text-text-secondary text-sm">
              관리자 로그인
            </p>
          </div>

          <Suspense fallback={<div className="text-center text-text-secondary">로딩 중...</div>}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
