'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      {/* 장식 아이콘 */}
      <div className="text-5xl mb-6 opacity-30">⚱️</div>

      <h2 className="font-serif text-xl sm:text-2xl text-text-primary mb-3">
        예기치 않은 오류가 발생했습니다
      </h2>

      <p className="text-text-secondary text-sm sm:text-base mb-8 max-w-md">
        잠시 후 다시 시도해 주세요. 문제가 지속되면 새로고침을 시도해 주세요.
      </p>

      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-6 py-2.5 rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 font-serif text-sm"
        >
          다시 시도
        </button>

        <button
          onClick={() => window.location.href = '/'}
          className="px-6 py-2.5 rounded-lg bg-white/5 text-text-secondary border border-white/10 hover:bg-white/10 font-serif text-sm"
        >
          홈으로
        </button>
      </div>
    </div>
  )
}
