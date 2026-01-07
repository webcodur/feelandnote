/*
  파일명: /app/(auth)/login/page.tsx
  기능: 로그인 페이지
  책임: Google/카카오 소셜 로그인 UI를 제공한다.
*/ // ------------------------------

import { loginWithGoogle, loginWithKakao } from '@/actions/auth'
import Button from '@/components/ui/Button'

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md space-y-8 p-8">
        {/* 로고 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Feel&Note</h1>
          <p className="mt-2 text-zinc-400">
            문화생활을 기록하고 공유하세요
          </p>
        </div>

        {/* 로그인 버튼들 */}
        <div className="space-y-4">
          <form action={loginWithGoogle}>
            <Button
              type="submit"
              unstyled
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white hover:bg-zinc-800"
            >
              <GoogleIcon />
              <span>Google로 계속하기</span>
            </Button>
          </form>

          <form action={loginWithKakao}>
            <Button
              type="submit"
              unstyled
              className="flex w-full items-center justify-center gap-3 rounded-lg bg-[#FEE500] px-4 py-3 text-zinc-900 hover:bg-[#FDD800]"
            >
              <KakaoIcon />
              <span>카카오로 계속하기</span>
            </Button>
          </form>
        </div>

        {/* 이용약관 */}
        <p className="text-center text-sm text-zinc-500">
          로그인 시{' '}
          <a href="/terms" className="underline hover:text-zinc-400">
            이용약관
          </a>
          과{' '}
          <a href="/privacy" className="underline hover:text-zinc-400">
            개인정보처리방침
          </a>
          에 동의합니다
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

function KakaoIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path
        fill="currentColor"
        d="M12 3c5.799 0 10.5 3.664 10.5 8.185 0 4.52-4.701 8.184-10.5 8.184a13.5 13.5 0 0 1-1.727-.11l-4.408 2.883c-.501.265-.678.236-.472-.413l.892-3.678c-2.88-1.46-4.785-3.99-4.785-6.866C1.5 6.665 6.201 3 12 3z"
      />
    </svg>
  )
}
