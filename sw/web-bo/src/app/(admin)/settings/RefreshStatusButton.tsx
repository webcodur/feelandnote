'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

export function RefreshStatusButton() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const refresh = () => {
    startTransition(() => router.refresh())
  }

  return (
    <button
      type="button"
      onClick={refresh}
      disabled={isPending}
      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-bg-card px-3 text-sm font-semibold text-text-primary hover:border-accent hover:bg-bg-hover disabled:cursor-wait disabled:opacity-60"
    >
      <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? '확인 중' : '다시 확인'}
    </button>
  )
}
