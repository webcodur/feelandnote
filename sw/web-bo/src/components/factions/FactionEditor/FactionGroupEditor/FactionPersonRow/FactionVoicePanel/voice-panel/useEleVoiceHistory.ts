'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FactionVoiceHistoryEntry } from '@/lib/faction-voice-casting-history'

export function useEleVoiceHistory() {
  const [history, setHistory] = useState<Record<string, FactionVoiceHistoryEntry>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError(null)
    fetch('/api/elevenlabs/voice-history')
      .then(r => r.json())
      .then(d => {
        if (!alive) return
        if (d.voices && typeof d.voices === 'object') setHistory(d.voices)
        else if (d.error) setError(d.error)
      })
      .catch(e => { if (alive) setError(String(e)) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const usageCount = useMemo(
    () => Object.values(history).reduce((sum, entry) => sum + entry.count, 0),
    [history],
  )

  return { history, loading, error, usageCount }
}
