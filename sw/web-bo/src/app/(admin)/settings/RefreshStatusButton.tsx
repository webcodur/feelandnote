'use client'

import { useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export function RefreshStatusButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (!isPending && document.visibilityState === 'visible') {
        startTransition(() => router.refresh())
      }
    }, 60_000)
    return () => window.clearInterval(interval)
  }, [router, isPending])

  const refresh = () => {
    startTransition(() => router.refresh())
  }

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={isPending}
      className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-border bg-bg-card px-3 text-sm font-semibold text-text-primary hover:border-accent hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-wait disabled:opacity-60"
    >
      <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? '확인 중' : '다시 확인'}
    </button>
  )
}
