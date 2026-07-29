'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export function formatDateTime(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
}

export function splitVariants(value: FormDataEntryValue | null): string[] {
  return String(value ?? '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function Feedback({
  message,
  error,
  compact = false,
}: {
  message: string | null
  error: string | null
  compact?: boolean
}) {
  if (!message && !error) return null
  return (
    <p
      className={`${compact ? 'mt-2 text-[11px]' : 'mt-2 text-xs'} ${
        error ? 'text-rose-300' : 'text-emerald-300'
      }`}
      role="status"
    >
      {error ?? message}
    </p>
  )
}

export function useLedgerAction(defaultError: string) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function runAction(action: () => Promise<unknown>, successMessage: string) {
    setMessage(null)
    setError(null)
    startTransition(async () => {
      try {
        await action()
        setMessage(successMessage)
        router.refresh()
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : defaultError)
      }
    })
  }

  return { pending, message, error, setError, runAction }
}
