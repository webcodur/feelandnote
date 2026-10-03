'use client'

import { useEffect, useState } from 'react'
import { parseVisitorCountry } from '@/lib/visitorCountry'

let request: Promise<string | null> | undefined

export function useVisitorCountry() {
  const [country, setCountry] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    request ??= fetch('/api/visitor-country', { cache: 'no-store' })
      .then(async response => response.ok ? parseVisitorCountry((await response.json()).country) : null)
      .catch(() => null)
    void request.then(value => { if (!cancelled) setCountry(value) })
    return () => { cancelled = true }
  }, [])
  return country
}
