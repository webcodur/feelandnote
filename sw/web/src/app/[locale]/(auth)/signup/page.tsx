/*
  파일명: /app/(auth)/signup/page.tsx
  기능: 회원가입 페이지
  책임: 이메일 회원가입 UI를 제공한다.
*/

import SignupForm from './SignupForm'

export const metadata = { title: '회원가입' }

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md space-y-8 p-8">
        {/* 로고 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Feel&Note</h1>
          <p className="mt-2 text-zinc-400">
            새 계정을 만들어 시작하세요
          </p>
        </div>

        {/* 회원가입 폼 */}
        <SignupForm />

        {/* 이용약관 */}
        <p className="text-center text-sm text-zinc-500">
          회원가입 시{' '}
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
