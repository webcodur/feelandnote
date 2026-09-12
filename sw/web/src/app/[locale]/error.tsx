'use client'

import { useEffect, useRef, useState } from 'react'
import { getGlobalErrorCopy, type GlobalErrorLocale } from '@/lib/i18n/globalError'

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [locale] = useState<GlobalErrorLocale>(() =>
    typeof window !== 'undefined' && window.location.pathname.startsWith('/en') ? 'en' : 'ko'
  )

  // 첫 실패는 대개 캐시가 빈 화면을 만들다 조회 하나가 미끄러진 것이고, 곧바로 다시
  // 그리면 성공한다(26.09.12 운영 실측 — 첫 요청 500, 재요청 200). 사람이 「다시 시도」를
  // 누르기 전에 한 번은 화면이 스스로 살아나게 한다. 두 번째부터는 실제 고장이므로
  // 버튼을 남겨 사람이 판단하게 둔다.
  const autoRetried = useRef(false)

  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  useEffect(() => {
    if (autoRetried.current) return
    autoRetried.current = true
    const timer = setTimeout(reset, 400)
    return () => clearTimeout(timer)
  }, [reset])

  const copy = getGlobalErrorCopy(locale)

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      {/* 장식 아이콘 */}
      <div className="text-5xl mb-6 opacity-30">⚱️</div>

      <h2 className="font-serif text-xl sm:text-2xl text-text-primary mb-3">
        {copy.title}
      </h2>

      <p className="text-text-secondary text-sm sm:text-base mb-8 max-w-md">
        {copy.description}
      </p>

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 font-serif text-sm"
        >
          {copy.retry}
        </button>

        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-2.5 rounded-lg bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10 font-serif text-sm"
        >
          {copy.home}
        </button>
      </div>
    </div>
  )
}
