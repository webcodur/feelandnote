/*
  파일명: /app/(auth)/signup/page.tsx
  기능: 회원가입 페이지
  책임: 이메일 회원가입 UI를 제공한다.
*/

import { getTranslations } from 'next-intl/server'
import SignupForm from './SignupForm'

export async function generateMetadata() {
  const t = await getTranslations('auth.signup')
  return { title: t('title') }
}

export default async function Page() {
  const t = await getTranslations('auth')
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="w-full max-w-md space-y-8 p-8">
        {/* 로고 */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white">Feel&Note</h1>
          <p className="mt-2 text-text-secondary">
            {t('signup.tagline')}
          </p>
        </div>

        {/* 회원가입 폼 */}
        <SignupForm />

        {/* 이용약관 */}
        <p className="text-center text-sm text-text-secondary">
          {t('signup.termsPrefix')}{' '}
          <a href="/terms" className="underline hover:text-text-secondary">
            {t('terms')}
          </a>
          {t('signup.termsAnd')}{' '}
          <a href="/privacy" className="underline hover:text-text-secondary">
            {t('privacy')}
          </a>
          {t('signup.termsSuffix')}
        </p>
      </div>
    </div>
  )
}
